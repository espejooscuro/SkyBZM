




const mineflayer = require("mineflayer");
const TaskQueue = require("../utils/TaskQueue");
const AutoBoosterCookie = require("../utils/AutoBoosterCookie");
const FlipManager = require("../flips/FlipManager");
const ChatListener = require("../events/ChatListener");
const RestScheduler = require("../utils/RestScheduler");
const delay = ms => new Promise(r => setTimeout(r, ms));
const ContainerManager = require("../utils/ContainerManager");
const fs = require("fs");
const path = require("path");
const socks = require("socks").SocksClient;
const { ProxyAgent } = require("proxy-agent");


const originalWrite = process.stdout.write;
process.stdout.write = function(chunk, encoding, callback) {
  if (chunk.toString().includes('Chunk size is' || "Ignoring large array size error")) return true; // ignora
  return originalWrite.call(this, chunk, encoding, callback);
};

class Bot {
  constructor(name, accountConfig = null) {
    this.name = name;
    this.bot = null;
    this.queue = new TaskQueue();
    this.chat = null;
    this.isLogged = false;
    this.isInitializing = false; // 🔥 Flag para prevenir doble inicialización
    this.config = null;
    this.accountConfig = accountConfig; // 🔥 Configuración específica del account
    
    // 🧹 Referencias para limpieza
    this.flipManager = null;
    this.boosterCookie = null;
    this.restScheduler = null; // 🔥 Rest scheduler
    this.heartbeatInterval = null; // 🔥 Para limpieza
    this.lastHeartbeat = Date.now(); // 🔥 Timestamp del último heartbeat
    this.lastActivity = Date.now(); // 🔥 Timestamp de última actividad detectada
    this.lastPacketReceived = Date.now(); // 🔥 Timestamp del último paquete recibido
    this.inactivityMonitor = null; // 🔥 Monitor de inactividad
    
    // 💰 Tracking de purse para estadísticas
    this.currentPurse = null;
    this.startPurse = null;
    this.purseHistory = [];
    this.startTime = Date.now();
    this.runtime = 0; // en segundos
    this.lastPurseValue = null;
    
    // 🔄 Reconnection system
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 10000; // 10 seconds
    this.criticalMessages = [
      'limbo',
      'packets too fast',
      'server will restart soon',
      'game update',
      'server is too laggy'
    ];
  }

  loadConfig() {
    const configPath = path.join(process.cwd(), "config.json");
    const raw = fs.readFileSync(configPath, "utf-8");
    const globalConfig = JSON.parse(raw);

    // 🔥 Si tenemos accountConfig, usar SOLO eso (ya tiene todo lo necesario)
    if (this.accountConfig) {
      this.config = {
        discordWebhook: globalConfig.discordWebhook || "", // mantener webhook global
        proxy: this.accountConfig.proxy || null,
        flips: this.accountConfig.flips || {}
      };
    } else {
      // Fallback si no hay accountConfig (formato antiguo)
      this.config = globalConfig;
    }
  }

  init(server = "mc.hypixel.net", port = 25565) {
    this.loadConfig(); // Cargamos config antes para tener proxy disponible

    const proxy = this.config?.proxy; // { host, port, type }

    this.bot = mineflayer.createBot({
      host: server,
      port,
      username: this.name,
      auth: "microsoft",
      version: "1.21.11",
      hideErrors: true,
      
      // 🔥 CONFIGURACIÓN PARA EVITAR TIMEOUTS
      checkTimeoutInterval: 60000, // Aumentar a 60 segundos (por defecto es 30)
      keepAlive: true, // Asegurar que keep-alive está habilitado
      
      // 🔥 Client options para mejorar estabilidad
      clientOptions: {
        keepAlive: true,
        keepAliveInitialDelay: 120000 // 2 minutos
      },

      // 🔥 AQUÍ INYECTAMOS EL SOCKS5
      connect: (client) => {
        if (!proxy) {
          console.log(`⚠️  [${this.name}] NO PROXY - Direct connection to ${server}`);
          client.connect(server, port);
          return;
        }

        console.log(` [${this.name}] Initiating SOCKS5 connection...`);
        console.log(`   - Proxy: ${proxy.host}:${proxy.port}`);
        console.log(`   - Destination: ${server}:${port}`);

        socks.createConnection({
          proxy: {
            host: proxy.host,
            port: Number(proxy.port),
            type: 5,
            userId: proxy.username,   // 🔥 auth SOCKS5
            password: proxy.password // 🔥 auth SOCKS5
          },
          command: "connect",
          destination: {
            host: server,
            port: Number(port)
          },
          timeout: 30000 // 30 segundos para establecer conexión SOCKS5
        }, (err, info) => {
          if (err) {
            console.error(`❌ [${this.name}] SOCKS5 Proxy connection FAILED:`, err.message);
            return;
          }

          console.log(`✅ [${this.name}] SOCKS5 connection established!`);
          
          // 🔥 Configurar socket para evitar timeouts
          info.socket.setKeepAlive(true, 60000); // Keep-alive cada 60 segundos
          info.socket.setTimeout(0); // Sin timeout en el socket
          
          // 🔥 Aumentar buffer sizes para mejor rendimiento
          if (info.socket.setNoDelay) {
            info.socket.setNoDelay(true); // Deshabilitar algoritmo de Nagle para reducir latencia
          }

          client.setSocket(info.socket);
          client.emit("connect");
        });
      },

      // 🔹 Agent para auth y requests auxiliares
      agent: proxy
        ? new ProxyAgent(`socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`)
        : undefined

    });

    this.chat = new ChatListener(this.bot, {
      watchList: ["sold", "bought", "coins", "flip", "skyblock", "joined", "Hypixel", "Sending to", "Bazaar"],
      callback: (msg) => {
        console.log(msg.message);
      }
    });

    // 🔥 Listener for CRITICAL messages (Limbo, restart, etc.)
    this.chat.onMessageContains(/limbo|packets too fast|server will restart soon|game update|server is too laggy/i, (msg) => {
      this.handleCriticalMessage(msg.message);
    });

    this.bot.once("spawn", async () => {
      this.markActivity(); // 🔥 Marcar actividad
      console.log(`[${this.name}] Chunks loaded, bot ready!`);
    });

    this.bot.on("login", async () => {
      this.markActivity(); // 🔥 Marcar actividad
      
      // 🔥 Reset packet timestamp on successful login
      this.lastPacketReceived = Date.now();
      this.lastActivity = Date.now();
      this.lastHeartbeat = Date.now();
      
      // 🔥 RECONEXIÓN: Si ya está logged O inicializando, IGNORAR
      // Las reconexiones se manejan SOLO en RestScheduler.reconnectAndLogin()
      if (this.isLogged || this.isInitializing) {
        //console.log(`🔄 [${this.name}] Reconnection detected - ignoring login event (handled by RestScheduler)`);
        return;
      }
      
      // 🔥 PRIMER LOGIN: Marcar como inicializando INMEDIATAMENTE
      this.isInitializing = true;
      console.log(`[${this.name}] Connected to the server!`);
      
      // 🔥 HEARTBEAT MANUAL para mantener la conexión viva
      console.log(`💓 [${this.name}] Starting heartbeat system...`);
      
      // Enviar un packet seguro cada 25 segundos para mantener la conexión activa
      this.heartbeatInterval = setInterval(() => {
        if (this.bot && this.bot._client && this.bot._client.socket && !this.bot._client.socket.destroyed) {
          try {
            // 🔥 Enviar packet de "arm_animation" (swing arm) que es seguro y no cierra containers
            // Este packet simula que el jugador mueve el brazo, es completamente seguro
            this.bot._client.write('arm_animation', {
              hand: 0 // Main hand
            });
            this.lastHeartbeat = Date.now(); // 🔥 Actualizar timestamp
          } catch (e) {
            // Si falla, intentar con position (enviar la posición actual)
            try {
              if (this.bot.entity && this.bot.entity.position) {
                this.bot._client.write('position', {
                  x: this.bot.entity.position.x,
                  y: this.bot.entity.position.y,
                  z: this.bot.entity.position.z,
                  onGround: this.bot.entity.onGround
                });
                this.lastHeartbeat = Date.now(); // 🔥 Actualizar timestamp
              }
            } catch (e2) {
              // Ignorar errores silenciosamente
              console.warn(`⚠️ [${this.name}] Heartbeat failed, may need reconnection`);
            }
          }
        }
      }, 25000); // Cada 25 segundos (antes del timeout de 30)
      
      // 🔥 MONITOR DE INACTIVIDAD: Detectar si no se reciben paquetes
      console.log(`🔍 [${this.name}] Starting inactivity monitor...`);
      this.inactivityMonitor = setInterval(() => {
        if (this.isResting) return; // Ignorar durante modo descanso
        
        const timeSinceLogin = Date.now() - this.startTime;
        const timeSinceLastPacket = Date.now() - this.lastPacketReceived;
        
        // 🔥 Grace period: Don't check for first 30 seconds after login
        if (timeSinceLogin < 30000) {
          return;
        }
        
        if (timeSinceLastPacket > 15000) { // 15 segundos sin paquetes (aumentado desde 10)
          console.error(` [${this.name}] No packets received in ${Math.floor(timeSinceLastPacket / 1000)}s - Connection lost!`);
          
          // Detener heartbeat
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
          
          // Detener monitor de inactividad
          if (this.inactivityMonitor) {
            clearInterval(this.inactivityMonitor);
            this.inactivityMonitor = null;
          }
          
          // Desconectar bot
          if (this.bot && this.bot._client) {
            console.log(`🔌 [${this.name}] Disconnecting due to inactivity...`);
            this.bot._client.end();
          }
        }
      }, 1000); // Revisar cada segundo
      
      let containerManager = new ContainerManager(this.bot);

      await this.queue.enqueue(async () => {
        console.log(`[${this.name}] Starting bot...`);
        await delay(5000);
        
        // 🔥 Safety check: Verify bot still exists
        if (!this.chat || !this.bot || this.bot.ended) {
          console.warn(`[${this.name}] Bot destroyed during startup, aborting task`);
          this.isInitializing = false; // Reset flag
          return;
        }
        
        this.chat.send("/skyblock");
        await delay(5000);
        
        if (!this.chat || !this.bot || this.bot.ended) {
          console.warn(`[${this.name}] Bot destroyed during startup, aborting task`);
          this.isInitializing = false; // Reset flag
          return;
        }
        
        this.chat.send("/is");
        await delay(5000);
        console.log(`[${this.name}] Bot ready!`);  
        let items = containerManager._getValidItems(false);
        console.log(items);
        
        // 🔥 AHORA sí marcamos como logged (después del primer login exitoso)
        this.isLogged = true;
        this.isInitializing = false; // Ya no está inicializando
      }, { type: 'login', item: 'Entering Skyblock' });

      const booster = new AutoBoosterCookie(this.bot, this.chat, this.queue);
      await booster.getBoostercookie();
      this.boosterCookie = booster; // 🔥 Guardar referencia
      
      const flipsConfig = this.config.flips;
      
      // 🔥 Pasar flipConfigs al FlipManager
      const manager = new FlipManager(this.bot, {
        username: this.name,
        purse: this.config.purse || 30_000_000,
        maxBuyPrice: flipsConfig.maxBuyPrice,
        minProfit: flipsConfig.minProfit,
        minVolume: flipsConfig.minVolume,
        blacklistContaining: flipsConfig.blacklistContaining,
        whitelist: flipsConfig.whitelist,
        maxRelist: flipsConfig.maxRelist,
        sellTimeout: flipsConfig.sellTimeout ?? 160000, 
        minOrder: flipsConfig.minOrder,
        maxOrder: flipsConfig.maxOrder,
        minSpread: flipsConfig.minSpread,
        flipConfigs: this.accountConfig?.flipConfigs || [] // 🔥 Pasar las configuraciones de flip
      }, this.queue); // 🔥 Pasar el TaskQueue central del Bot

      this.flipManager = manager; // 🔥 Guardar referencia
      
      // 🔥 Inicializar RestScheduler
      const restConfig = this.accountConfig?.restSchedule || {};
      const restScheduler = new RestScheduler(this, restConfig, this.queue);
      this.restScheduler = restScheduler;
      restScheduler.start(); // 🔥 Iniciar sistema de descansos
      
      // 🔥 Inicializar flips desde configuración (NPC, KAT, etc.)
      if (this.accountConfig?.flipConfigs && this.accountConfig.flipConfigs.length > 0) {
        console.log(`🎯 [${this.name}] Initializing ${this.accountConfig.flipConfigs.length} flip configurations...`);
        manager.initializeFlipsFromConfig(this.accountConfig.flipConfigs);
      }

      // 🔥 Check if there are SELL_ORDER flips configured
      const hasSellOrderFlips = this.accountConfig?.flipConfigs?.some(
        config => config.type === 'SELL_ORDER' || !config.type
      ) ?? false;
      
      // Only build flips if SELL_ORDER flips are configured
      if (!hasSellOrderFlips) {
        console.log(`📝 [${this.name}] No SELL_ORDER flips configured, skipping buildFlips()`);
        return;
      }

      // 🔥 Intentar cargar estado guardado antes de buildFlips
      const hasState = this.queue.hasStateToResume(); // 🔥 Usar this.queue del Bot
      
      if (hasState) {
        console.log(`📂 [${this.name}] Found saved state, resuming flips...`);
        
        try {
          await manager.resumeFlips();
          manager.resume();
          
          console.log(`✅ [${this.name}] Successfully resumed from saved state!`);
          console.log(`   → Active flips: ${manager.flips.length}`);
        } catch (error) {
          console.error(`❌ [${this.name}] Error resuming state: ${error.message}`);
          console.log(`   → Starting fresh...`);
          
          // Si hay error al reanudar, limpiar estado y empezar de cero
          manager.clearState();
          await manager.buildFlips(flipsConfig.maxFlips);
          
          console.log(`\n[${this.name}] === Starting all BUYS ===\n`);
          for (const flip of manager.flips) await flip.buy();
        }
      } else {
        console.log(`📝 [${this.name}] No saved state found, starting fresh...`);
        await manager.buildFlips(flipsConfig.maxFlips);

        console.log(`\n[${this.name}] === Starting all BUYS ===\n`);
        for (const flip of manager.flips) await flip.buy();
      }
      
      console.log(`\n[${this.name}] All tasks finished!`);
    });

    this.bot.on("end", () => {
      console.log(`[${this.name}] Disconnected.`);
      this.isLogged = false;
      
      // 🔥 Limpiar heartbeat al desconectar
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        console.log(`💓 [${this.name}] Heartbeat stopped`);
      }
      
      if (this.inactivityMonitor) {
        clearInterval(this.inactivityMonitor);
        this.inactivityMonitor = null;
        console.log(`🔍 [${this.name}] Inactivity monitor stopped`);
      }
    });

    // 💰 Listener de packets para capturar el purse del scoreboard
    this.bot._client.on('packet', (data, meta) => {
      // 🔥 HEARTBEAT: Actualizar timestamp en CUALQUIER paquete recibido
      if (!this.isResting) {
        this.lastPacketReceived = Date.now();
        this.lastActivity = Date.now();
      }
      
      if (meta.name !== 'teams') return;

      // 🔥 Extraer texto directo de prefix y suffix
      let prefixText = '';
      let suffixText = '';

      if (data.prefix && data.prefix.type === 'compound' && data.prefix.value.text) {
        prefixText = data.prefix.value.text.value || '';
      }

      if (data.suffix && data.suffix.type === 'compound' && data.suffix.value.text) {
        suffixText = data.suffix.value.text.value || '';
      }

      // Concatenar y limpiar códigos de color (§x)
      const fullLine = (prefixText + suffixText).replace(/§./g, '').trim();

      // Solo nos interesa Purse/Piggy
      if (fullLine.includes('Purse') || fullLine.includes('Piggy')) {
        // Extraer solo los números y comas
        const match = fullLine.match(/([0-9,]+)/);
        if (match) {
          const purseString = match[1];
          
          // Convertir a número eliminando las comas
          const purseValue = parseInt(purseString.replace(/,/g, ''));
          
          // 🔥 Solo actualizar si el purse es mayor a 1 millón y es válido
          if (!isNaN(purseValue) && purseValue > 1000000 && purseValue !== this.currentPurse) {
            this.currentPurse = purseValue;
            
            // Si es la primera captura, guardar como startPurse
            if (this.startPurse === null) {
              this.startPurse = purseValue;
              console.log(`💰 [${this.name}] Initial purse captured: ${purseValue.toLocaleString()} coins`);
            }
            
            // Guardar en el historial
            const now = Date.now();
            this.runtime = Math.floor((now - this.startTime) / 1000);
            
            this.purseHistory.push({
              timestamp: now,
              purse: purseValue,
              runtime: this.runtime
            });
            
            // Limitar historial a últimas 24 horas (max 1000 puntos)
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            this.purseHistory = this.purseHistory.filter(entry => entry.timestamp > oneDayAgo);
            if (this.purseHistory.length > 1000) {
              this.purseHistory = this.purseHistory.slice(-1000);
            }
          }
        }
      }
    });

    this.bot.on('kicked', (reason) => {
      console.log(`[${this.name}] KICKED:`, reason);
    });

    this.bot.on("error", (err) => {
      if (err.name === "PartialReadError") return;
      console.error(`[${this.name}] Error:`, err.message);
    });
  }

  /**
   * Obtiene las estadísticas actuales del bot
   */
  getStats() {
    const currentProfit = this.currentPurse && this.startPurse 
      ? this.currentPurse - this.startPurse 
      : 0;
    
    const coinsPerHour = this.runtime > 0 && currentProfit > 0
      ? (currentProfit / this.runtime) * 3600
      : 0;
    
    return {
      username: this.name,
      currentPurse: this.currentPurse,
      startPurse: this.startPurse,
      currentProfit,
      coinsPerHour: Math.round(coinsPerHour),
      runtime: this.runtime,
      purseHistory: this.purseHistory,
      isLogged: this.isLogged,
      startTime: this.startTime
    };
  }

  /**
   * Pausa el bot sin desconectar (guarda el estado actual)
   */
  pause() {
    console.log(`⏸️ [${this.name}] Pausing bot...`);
    
    if (this.flipManager) {
      this.flipManager.pause();
      console.log(`✅ [${this.name}] Bot paused, state saved`);
      return true;
    }
    
    console.log(`⚠️ [${this.name}] No FlipManager to pause`);
    return false;
  }

  /**
   * Reanuda el bot desde el estado pausado
   */
  resume() {
    console.log(`▶️ [${this.name}] Resuming bot...`);
    
    if (this.flipManager) {
      this.flipManager.resume();
      console.log(`✅ [${this.name}] Bot resumed`);
      return true;
    }
    
    console.log(`⚠️ [${this.name}] No FlipManager to resume`);
    return false;
  }

  /**
   * Verifica si hay estado guardado para reanudar
   */
  hasSavedState() {
    return this.queue.hasStateToResume(); // 🔥 Usar this.queue del Bot
  }

  /**
   * Destruye completamente el bot y limpia todos los recursos
   */
  destroy() {
    console.log(`🧹 [${this.name}] Destroying bot and cleaning up resources...`);
    
    try {
      // 0. Limpiar heartbeat PRIMERO
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
        console.log(`   💓 Heartbeat cleared`);
      }
      
      if (this.inactivityMonitor) {
        clearInterval(this.inactivityMonitor);
        this.inactivityMonitor = null;
        console.log(`   🔍 Inactivity monitor cleared`);
      }
      
      // 1. Pausar FlipManager ANTES de destruir (guarda estado)
      if (this.flipManager) {
        console.log(`   ⏸️ Pausing FlipManager to save state...`);
        this.flipManager.pause();
        
        console.log(`   🔥 Destroying FlipManager...`);
        this.flipManager.destroy();
        this.flipManager = null;
      }
      
      // 1.5. Destruir RestScheduler
      if (this.restScheduler) {
        console.log(`   🔥 Destroying RestScheduler...`);
        this.restScheduler.destroy();
        this.restScheduler = null;
      }
      
      // 2. Destruir BoosterCookie si tiene método destroy
      if (this.boosterCookie && typeof this.boosterCookie.destroy === 'function') {
        console.log(`   🍪 Destroying BoosterCookie...`);
        this.boosterCookie.destroy();
        this.boosterCookie = null;
      }
      
      // 3. Destruir ChatListener
      if (this.chat && typeof this.chat.destroy === 'function') {
        console.log(`   💬 Destroying ChatListener...`);
        this.chat.destroy();
        this.chat = null;
      }
      
      // 4. Cerrar la conexión del bot
      if (this.bot) {
        console.log(`   🔌 Closing bot connection...`);
        this.bot.removeAllListeners(); // Remover todos los event listeners
        this.bot.end();
        this.bot = null;
      }
      
      // 5. Resetear estado
      this.isLogged = false;
      
      console.log(`✅ [${this.name}] Bot destroyed successfully`);
    } catch (error) {
      console.error(`❌ [${this.name}] Error during destroy:`, error);
    }
  }

  /**
   * 🚨 Maneja mensajes críticos del servidor (Limbo, restart, packets, etc.)
   * Encola un nodo de RESET con máxima prioridad
   */
  async handleCriticalMessage(message) {
    if (this.isReconnecting) {
      console.log(`⏳ [${this.name}] Already handling critical message, ignoring: ${message}`);
      return;
    }

    console.log(`\n🚨 [${this.name}] CRITICAL MESSAGE DETECTED: ${message}`);
    
    this.isReconnecting = true;

    // 🔥 Usar RestScheduler para encolar nodo de RESET con máxima prioridad
    if (this.restScheduler) {
      this.restScheduler.enqueueReset(message);
      console.log(`   ✅ RESET node enqueued with maximum priority`);
    } else {
      console.error(`   ❌ No RestScheduler available, cannot enqueue reset`);
    }
    
    this.isReconnecting = false;
  }

  /**
   * 💓 Verifica el estado de salud del bot
   */
  getHealthStatus() {
    const now = Date.now();
    const timeSinceHeartbeat = now - this.lastHeartbeat;
    const timeSinceActivity = now - this.lastActivity;
    
    return {
      isAlive: this.bot && this.bot._client && !this.bot._client.ended,
      isLogged: this.isLogged,
      timeSinceHeartbeat,
      timeSinceActivity,
      isHealthy: timeSinceHeartbeat < 60000, // Healthy if heartbeat in last 60s
      isResponsive: timeSinceActivity < 120000, // Responsive if activity in last 2min
      needsReconnection: timeSinceHeartbeat > 90000 || (this.bot && this.bot._client && this.bot._client.ended)
    };
  }

  /**
   * 🔍 Actualiza timestamp de actividad (llamar desde eventos importantes)
   */
  markActivity() {
    this.lastActivity = Date.now();
  }
}

module.exports = Bot;



