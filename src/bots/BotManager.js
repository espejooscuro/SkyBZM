





const Bot = require("./Bot");
const path = require("path");
const fs = require("fs");

class BotManager {
  constructor() {
    this.rootPath = process.cwd();
    this.configPath = path.join(this.rootPath, "config.json");
    this.bots = new Map(); // Changed from array to Map for easier lookup
    this.config = null;
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

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║               📋 BOT MANAGER - Creating Bots                   ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log('║ Total accounts to create:', String(accountsToCreate.length).padEnd(35), '║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    for (let i = 0; i < accountsToCreate.length; i++) {
      const account = accountsToCreate[i];
      
      console.log(`\n🤖 Creating Bot ${i + 1}/${accountsToCreate.length}`);
      console.log('   📦 Account object being passed:');
      console.log('      - username:', account.username || 'N/A');
      console.log('      - proxy:', account.proxy ? 'EXISTS ✅' : 'MISSING ❌');
      if (account.proxy) {
        console.log('        • host:', account.proxy.host || 'N/A');
        console.log('        • port:', account.proxy.port || 'N/A');
        console.log('        • type:', account.proxy.type || 'N/A');
        console.log('        • username:', account.proxy.username ? 'SET' : 'NOT SET');
        console.log('        • password:', account.proxy.password ? 'SET' : 'NOT SET');
      }
      console.log('      - flips:', account.flips ? 'EXISTS ✅' : 'MISSING ❌');
      console.log('      - enabled:', account.enabled !== false ? 'YES' : 'NO');
      console.log('\n   🔍 FULL ACCOUNT OBJECT (JSON):');
      console.log('   ═══════════════════════════════════════════════════════════');
      console.log(JSON.stringify(account, null, 2));
      console.log('   ═══════════════════════════════════════════════════════════\n');
      
      // 🔥 PASAR TODA LA CONFIG DEL ACCOUNT al Bot
      const bot = new Bot(account.username, account);
      this.bots.set(account.username, bot); // Store in Map with username as key
      bot.init("mc.hypixel.net", 25565);
      await this.sleep(delayMs);
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
      
      // 🔥 Usar destroy() en lugar de solo end()
      if (bot.destroy && typeof bot.destroy === 'function') {
        bot.destroy();
      } else if (bot.client) {
        bot.client.end();
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
   * @param {string} username - Nombre de usuario del bot
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
      
      // 🔥 Destruir completamente el bot primero
      if (bot.destroy && typeof bot.destroy === 'function') {
        bot.destroy();
      } else if (bot.client) {
        bot.client.end();
      }
      
      console.log(`⏳ Waiting 5 seconds before reconnecting ${username}...`);
      await this.sleep(5000);
      
      // Reiniciar el bot
      await bot.init("mc.hypixel.net", 25565);
      
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
   * Obtiene las estadísticas de un bot específico
   * @param {string} username - Nombre de usuario del bot
   * @returns {object|null} Estadísticas del bot o null si no existe
   */
  getBotStats(username) {
    const bot = this.bots.get(username);
    
    if (!bot) {
      return null;
    }
    
    if (bot.getStats && typeof bot.getStats === 'function') {
      return bot.getStats();
    }
    
    return {
      username,
      error: 'Stats not available'
    };
  }

  /**
   * Detiene todos los bots
   */
  async stopAllBots() {
    console.log('🛑 Stopping all bots...');
    
    for (const [username, bot] of this.bots.entries()) {
      try {
        // 🔥 Usar destroy() para limpieza completa
        if (bot.destroy && typeof bot.destroy === 'function') {
          bot.destroy();
        } else if (bot.client) {
          bot.client.end();
        }
        console.log(`✅ Stopped: ${username}`);
      } catch (error) {
        console.error(`❌ Error stopping ${username}:`, error);
      }
    }
  }
}

module.exports = BotManager;








