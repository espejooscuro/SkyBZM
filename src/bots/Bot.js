
const mineflayer = require("mineflayer");
const TaskQueue = require("../utils/TaskQueue");
const AutoBoosterCookie = require("../utils/AutoBoosterCookie");
const FlipManager = require("../flips/FlipManager");
const ChatListener = require("../events/ChatListener");
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
    this.config = null;
    this.accountConfig = accountConfig; // 🔥 Configuración específica del account
    
    // 🧹 Referencias para limpieza
    this.flipManager = null;
    this.boosterCookie = null;
    
    // 💰 Tracking de purse para estadísticas
    this.currentPurse = null;
    this.startPurse = null;
    this.purseHistory = [];
    this.startTime = Date.now();
    this.runtime = 0; // en segundos
    this.lastPurseValue = null;
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
      version: "1.21.9",
      hideErrors: true,

      // 🔥 AQUÍ INYECTAMOS EL SOCKS5
      connect: (client) => {
        if (!proxy) {
          console.log(`⚠️  [${this.name}] NO PROXY - Direct connection to ${server}`);
          client.connect(server, port);
          return;
        }

        console.log(`🔌 [${this.name}] Initiating SOCKS5 connection...`);
        console.log(`   📍 Proxy: ${proxy.host}:${proxy.port}`);
        console.log(`   🎯 Destination: ${server}:${port}`);

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
          }
        }, (err, info) => {
          if (err) {
            console.error(`❌ [${this.name}] SOCKS5 Proxy connection FAILED:`, err.message);
            return;
          }

          console.log(`✅ [${this.name}] SOCKS5 connection established!`);

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

    this.bot.once("spawn", async () => {
      console.log(`[${this.name}] Bot spawned, waiting for chunks...`);
      await this.bot.waitForChunksToLoad();
      console.log(`[${this.name}] Chunks loaded, bot ready!`);
      this.bot.physicsEnabled = true;
    });

    this.bot.on("login", async () => {
      if (this.isLogged) return;
      this.isLogged = true;

      console.log(`[${this.name}] Connected to the server!`);
      let containerManager = new ContainerManager(this.bot);

      await this.queue.enqueue(async () => {
        console.log(`[${this.name}] Starting bot...`);
        await delay(5000);
        this.chat.send("/skyblock");
        await delay(5000);
        this.chat.send("/is");
        await delay(5000);
        console.log(`[${this.name}] Bot ready!`);  
        let items = containerManager._getValidItems(false);
        console.log(items);
      });

      const booster = new AutoBoosterCookie(this.bot, this.chat, this.queue);
      await booster.getBoostercookie();
      this.boosterCookie = booster; // 🔥 Guardar referencia
      
      const flipsConfig = this.config.flips;
      
      const manager = new FlipManager(this.bot, {
        username: this.name,
        purse: this.config.purse || 40_000_000,
        maxBuyPrice: flipsConfig.maxBuyPrice,
        minProfit: flipsConfig.minProfit,
        minVolume: flipsConfig.minVolume,
        blacklistContaining: flipsConfig.blacklistContaining,
        whitelist: flipsConfig.whitelist,
        maxRelist: flipsConfig.maxRelist,
        sellTimeout: flipsConfig.sellTimeout ?? 70000
      });

      this.flipManager = manager; // 🔥 Guardar referencia

      await manager.buildFlips(flipsConfig.maxFlips);

      console.log(`\n[${this.name}] === Starting all BUYS ===\n`);
      for (const flip of manager.flips) await flip.buy();
      
      console.log(`\n[${this.name}] All tasks finished!`);
    });

    this.bot.on("end", () => {
      console.log(`[${this.name}] Disconnected.`);
      this.isLogged = false;
    });

    // 💰 Listener de packets para capturar el purse del scoreboard
    this.bot._client.on('packet', (data, meta) => {
      if (meta.name !== 'teams') return;

      function compoundToText(compound) {
        if (!compound || compound.type !== 'compound') return '';
        let text = '';
        const val = compound.value;

        if (val.text && val.text.type === 'string') text += val.text.value;
        if (val.extra && Array.isArray(val.extra)) {
          for (const e of val.extra) text += compoundToText(e);
        }

        return text;
      }

      // Concatenamos todo: prefix + name + suffix
      let fullLine = [
        compoundToText(data.prefix),
        compoundToText(data.name),
        compoundToText(data.suffix)
      ].join('').replace(/§./g, '').trim();

      // Eliminamos cualquier "team_X" que Hypixel meta al final
      fullLine = fullLine.replace(/team_\d+/gi, '').trim();

      // Solo nos interesa Purse/Piggy
      if (fullLine.includes('Purse') || fullLine.includes('Piggy')) {
        const match = fullLine.match(/([0-9]+(?:[.,][0-9]+){0,2}(?:[.,][0-9]+)?\s*[kmb]?)/i);
        if (match) {
          this.lastPurseValue = match[1].trim();
          
          // Convertir el string a número (manejar k, m, b)
          let purseValue = 0;
          const cleanNum = this.lastPurseValue.replace(/,/g, '').toLowerCase();
          
          if (cleanNum.includes('k')) {
            purseValue = parseFloat(cleanNum) * 1000;
          } else if (cleanNum.includes('m')) {
            purseValue = parseFloat(cleanNum) * 1000000;
          } else if (cleanNum.includes('b')) {
            purseValue = parseFloat(cleanNum) * 1000000000;
          } else {
            purseValue = parseInt(cleanNum);
          }
          
          purseValue = Math.floor(purseValue);
          
          // 🔥 Solo actualizar si el purse es mayor a 1 millón
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
            
            const profit = this.startPurse !== null ? purseValue - this.startPurse : 0;
            console.log(`💰 [${this.name}] Purse updated: ${purseValue.toLocaleString()} (${profit >= 0 ? '+' : ''}${profit.toLocaleString()})`);
          } else if (!isNaN(purseValue) && purseValue <= 1000000) {
            console.log(`💰 [${this.name}] Purse too low (${purseValue.toLocaleString()}), not tracking`);
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
   * Destruye completamente el bot y limpia todos los recursos
   */
  destroy() {
    console.log(`🧹 [${this.name}] Destroying bot and cleaning up resources...`);
    
    try {
      // 1. Destruir FlipManager y todos sus Flips
      if (this.flipManager) {
        console.log(`   🔥 Destroying FlipManager...`);
        this.flipManager.destroy();
        this.flipManager = null;
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
}

module.exports = Bot;

