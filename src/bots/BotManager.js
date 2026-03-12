



const Bot = require("./Bot");
const path = require("path");
const fs = require("fs");
const RestManager = require("../utils/RestManager");

class BotManager {
  constructor() {
    this.rootPath = process.cwd();
    this.configPath = path.join(this.rootPath, "config.json");
    this.bots = new Map(); // username -> Bot instance
    this.config = null;
    this.restManager = null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  loadConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error("config.json not found. Run the Launcher first.");
    }
    const rawData = fs.readFileSync(this.configPath, "utf-8");
    this.config = JSON.parse(rawData);
    
    // Initialize rest manager if config exists
    this.initRestManager();
  }

  initRestManager() {
    if (this.config.restSchedule) {
      console.log('🌙 Initializing Rest Manager...');
      this.restManager = new RestManager(this, this.config.restSchedule);
      
      // Only start if at least one option is enabled
      if (this.config.restSchedule.shortBreaks?.enabled || this.config.restSchedule.dailyRest?.enabled) {
        this.restManager.start();
      }
    }
  }

  async createBots(delayMs = 2000) {
    // Soportar ambos formatos: nuevo (accounts) y viejo (usernames)
    let accountsToCreate = [];

    if (this.config.accounts && Array.isArray(this.config.accounts)) {
      // Nuevo formato con accounts
      accountsToCreate = this.config.accounts.filter(acc => acc.enabled !== false);
    } else if (this.config.usernames && Array.isArray(this.config.usernames)) {
      // Formato viejo solo con usernames
      accountsToCreate = this.config.usernames.map(username => ({ username }));
    } else {
      throw new Error("No usernames or accounts found in config.");
    }


    let autoStartCount = 0;

    for (let i = 0; i < accountsToCreate.length; i++) {
      const account = accountsToCreate[i];
      
      // 🔥 PASAR TODA LA CONFIG DEL ACCOUNT al Bot
      const bot = new Bot(account.username, account);
      this.bots.set(account.username, bot);
      
      // ✨ Solo iniciar si tiene autoStart: true
      if (account.autoStart === true) {
        console.log(` Auto-starting bot: ${account.username}`);
        bot.init("mc.hypixel.net", 25565);
        autoStartCount++;
        await this.sleep(delayMs);
      }
    }
  }

  /* =========================
     CONTROL INDIVIDUAL DE BOTS
     ========================= */

  /**
   * Inicia un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async startBot(username) {
    try {
      let bot = this.bots.get(username);
      
      // Si el bot no existe, buscarlo en la config y crearlo
      if (!bot) {
        console.log(`🔍 Bot ${username} not found in memory, searching in config...`);
        
        const accountsToCreate = this.config.accounts && Array.isArray(this.config.accounts)
          ? this.config.accounts
          : this.config.usernames?.map(u => ({ username: u })) || [];
        
        const account = accountsToCreate.find(acc => acc.username === username);
        
        if (!account) {
          return {
            success: false,
            message: `Bot ${username} not found in configuration`
          };
        }
        
        console.log(`✨ Creating new bot instance for ${username}`);
        bot = new Bot(account.username, account);
        this.bots.set(account.username, bot);
      }
      
      // Verificar si ya está conectado
      if (bot.bot && bot.bot.player) {
        return {
          success: false,
          message: `Bot ${username} is already connected`
        };
      }
      
      // Iniciar o reiniciar la conexión
      bot.init("mc.hypixel.net", 25565);
      
      // Esperar un momento para verificar que la conexión comenzó
      await this.sleep(1000);
      
      return {
        success: true,
        message: `Bot ${username} started successfully`
      };
    } catch (error) {
      console.error(`❌ Error starting bot ${username}:`, error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Detiene un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async stopBot(username) {
    const bot = this.bots.get(username);
    
    if (!bot) {
      return {
        success: false,
        message: `Bot ${username} not found`
      };
    }

    try {
      console.log(`🛑 Stopping bot: ${username}`);
      
      // Usar el método destroy del bot para limpieza completa
      if (typeof bot.destroy === 'function') {
        bot.destroy();
      } else if (bot.bot) {
        bot.bot.end();
      }
      
      return {
        success: true,
        message: `Bot ${username} stopped successfully`
      };
    } catch (error) {
      console.error(`❌ Error stopping bot ${username}:`, error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Reinicia un bot específico con un delay de 5 segundos
   * @param {username} username - Nombre de usuario del bot
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async restartBot(username) {
    const bot = this.bots.get(username);
    
    if (!bot) {
      return {
        success: false,
        message: `Bot ${username} not found`
      };
    }

    try {
      console.log(`🔄 Restarting bot: ${username}`);
      
      // Detener el bot usando el método destroy
      if (typeof bot.destroy === 'function') {
        bot.destroy();
      } else if (bot.bot) {
        bot.bot.end();
      }
      
      console.log(`⏳ Waiting 5 seconds before reconnecting ${username}...`);
      await this.sleep(5000);
      
      // Reiniciar el bot
      bot.init("mc.hypixel.net", 25565);
      
      return {
        success: true,
        message: `Bot ${username} restarted successfully`
      };
    } catch (error) {
      console.error(`❌ Error restarting bot ${username}:`, error);
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Obtiene el estado de un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @returns {Object} Estado del bot
   */
  getBotStatus(username) {
    const bot = this.bots.get(username);
    
    if (!bot) {
      return {
        exists: false,
        connected: false,
        username: username
      };
    }

    const isConnected = bot.bot && bot.bot.player && bot.isLogged;
    const health = bot.getHealthStatus ? bot.getHealthStatus() : {};

    return {
      exists: true,
      connected: isConnected,
      username: username,
      state: bot.bot ? (isConnected ? 'connected' : 'connecting') : 'disconnected',
      health: {
        ...health,
        lastHeartbeat: bot.lastHeartbeat,
        lastActivity: bot.lastActivity
      }
    };
  }

  /**
   * Obtiene todos los bots y sus estados
   * @returns {Array} Lista de bots con sus estados
   */
  getAllBotsStatus() {
    const statuses = [];
    
    for (const [username, bot] of this.bots.entries()) {
      const isConnected = bot.bot && bot.bot.player && bot.isLogged;
      
      statuses.push({
        username: username,
        connected: isConnected,
        state: bot.bot ? (isConnected ? 'connected' : 'connecting') : 'disconnected'
      });
    }
    
    return statuses;
  }

  /**
   * Detiene todos los bots
   */
  async stopAllBots() {
    console.log('🛑 Stopping all bots...');
    
    for (const [username, bot] of this.bots.entries()) {
      try {
        if (typeof bot.destroy === 'function') {
          bot.destroy();
        } else if (bot.bot) {
          bot.bot.end();
        }
        console.log(`✅ Stopped: ${username}`);
      } catch (error) {
        console.error(`❌ Error stopping ${username}:`, error);
      }
    }
  }

  /**
   * Obtiene los logs de actividad de un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @param {number} limit - Cantidad de logs a retornar (default 20)
   * @returns {Array} Logs de actividad
   */
  getBotActivityLogs(username, limit = 20) {
    const bot = this.bots.get(username);
    
    if (!bot || !bot.flipManager) {
      return [];
    }

    return bot.flipManager.getActivityLogs(limit);
  }

  /**
   * Obtiene el historial de profits de un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @param {number} limit - Cantidad de registros a retornar (default 50)
   * @returns {Array} Historial de profits
   */
  getBotProfitHistory(username, limit = 50) {
    const bot = this.bots.get(username);
    
    if (!bot || !bot.flipManager) {
      return [];
    }

    return bot.flipManager.getProfitHistory(limit);
  }

  /**
   * Obtiene el historial de money flow (dinero gastado/ganado) de un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @param {number} limit - Cantidad de registros a retornar (default 100)
   * @returns {Array} Historial de transacciones de dinero
   */
  getBotMoneyFlow(username, limit = 100) {
    const bot = this.bots.get(username);
    
    if (!bot || !bot.flipManager) {
      return [];
    }

    return bot.flipManager.getMoneyFlow(limit);
  }
}

module.exports = BotManager;




