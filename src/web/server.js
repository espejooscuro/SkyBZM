



const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WebServer {
  constructor(configPath, port = 3000, botManager = null) {
    this.configPath = configPath;
    this.port = port;
    this.botManager = botManager;
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Add no-cache headers for JS and CSS files to prevent browser caching
    this.app.use((req, res, next) => {
      if (req.url.endsWith('.js') || req.url.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    });
    
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, x-password');
      next();
    });
  }

  getConfig() {
    if (!fs.existsSync(this.configPath)) {
      throw new Error('configuracion.json not found');
    }
    return JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
  }

  saveConfig(config) {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ Configuration saved');
  }

  validatePassword(password) {
    return password === this.getConfig().webPassword;
  }

  setupRoutes() {
    this.app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

    this.app.post('/api/login', (req, res) => {
      try {
        const { password } = req.body;
        const config = this.getConfig();
        res.json(password === config.webPassword 
          ? { success: true, config } 
          : { success: false, error: 'Contraseña incorrecta' }
        );
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.get('/api/config', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        res.json({ success: true, config: this.getConfig() });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.put('/api/account/:index', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { path: fieldPath, value } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        this.setNestedValue(config.accounts[index], fieldPath, value);
        this.saveConfig(config);

        if (this.botManager) {
          this.updateBotRealTime(config.accounts[index].username, fieldPath, value);
        }

        res.json({ success: true, message: 'Configuration updated', config });
      } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Whitelist/Blacklist management
    this.setupListManagement();

    // Bot control endpoints
    this.setupBotControl();

    // Rest schedule endpoints
    this.app.get('/rest-schedule', (req, res) => {
      try {
        const { accountIndex } = req.query;
        const config = this.getConfig();
        
        if (accountIndex === undefined) {
          return res.status(400).json({ success: false, error: 'accountIndex required' });
        }
        
        const index = parseInt(accountIndex);
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        if (!config.accounts[index].restSchedule) {
          config.accounts[index].restSchedule = {
            shortBreaks: { enabled: false, workDuration: 60, breakDuration: 5 },
            dailyRest: { enabled: false, workHours: 16 }
          };
        }
        
        const status = this.botManager?.restManager?.getStatus() || {
          mode: 'Working',
          nextBreak: '--',
          dailyCycle: '--'
        };
        
        res.json({
          ...config.accounts[index].restSchedule,
          status
        });
      } catch (error) {
        console.error('Error getting rest schedule:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    this.app.post('/rest-schedule', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { accountIndex, restSchedule } = req.body;
        
        if (accountIndex === undefined) {
          return res.status(400).json({ success: false, error: 'accountIndex required' });
        }

        const config = this.getConfig();
        const index = parseInt(accountIndex);
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }
        
        config.accounts[index].restSchedule = restSchedule;
        this.saveConfig(config);
        
        // Initialize or update rest manager
        if (this.botManager?.restManager) {
          this.botManager.restManager.updateConfig(restSchedule);
        } else if (this.botManager) {
          const RestManager = require('../utils/RestManager');
          this.botManager.restManager = new RestManager(this.botManager, restSchedule);
          this.botManager.restManager.start();
        }
        
        console.log(`✅ Rest schedule updated for account ${index}:`, restSchedule);
        res.json({ success: true, message: 'Rest schedule updated' });
      } catch (error) {
        console.error('Error saving rest schedule:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  setupListManagement() {
    // Add to whitelist
    this.app.post('/api/account/:index/whitelist', (req, res) => {
      this.manageList(req, res, 'whitelist', 'add');
    });

    // Remove from whitelist
    this.app.delete('/api/account/:index/whitelist/:itemId', (req, res) => {
      this.manageList(req, res, 'whitelist', 'remove');
    });

    // Add to blacklist
    this.app.post('/api/account/:index/blacklist', (req, res) => {
      this.manageList(req, res, 'blacklist', 'add');
    });

    // Remove from blacklist
    this.app.delete('/api/account/:index/blacklist/:itemId', (req, res) => {
      this.manageList(req, res, 'blacklist', 'remove');
    });
  }

  manageList(req, res, listType, action) {
    try {
      if (!this.validatePassword(req.headers['x-password'])) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const index = parseInt(req.params.index);
      const config = this.getConfig();
      
      if (!config.accounts[index]) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      // Asegurar que flips existe
      if (!config.accounts[index].flips) {
        config.accounts[index].flips = {};
      }

      const listKey = listType === 'whitelist' ? 'whitelist' : 'blacklistContaining';
      const itemId = action === 'add' ? req.body.itemId : req.params.itemId;

      if (!config.accounts[index].flips[listKey]) {
        config.accounts[index].flips[listKey] = [];
      }

      if (action === 'add') {
        if (!config.accounts[index].flips[listKey].includes(itemId)) {
          config.accounts[index].flips[listKey].push(itemId);
          console.log(`✅ Added ${itemId} to ${listType}`);
        }
      } else {
        config.accounts[index].flips[listKey] = config.accounts[index].flips[listKey].filter(id => id !== itemId);
        console.log(`✅ Removed ${itemId} from ${listType}`);
      }

      this.saveConfig(config);

      if (this.botManager) {
        this.updateBotRealTime(config.accounts[index].username, `flips.${listKey}`, config.accounts[index].flips[listKey]);
      }

      res.json({ success: true, [listType]: config.accounts[index].flips[listKey] });
    } catch (error) {
      console.error(`❌ Error managing ${listType}:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  setupBotControl() {
    // Start bot
    this.app.post('/api/bot/:index/start', async (req, res) => {
      this.botAction(req, res, 'start', '🚀 Starting bot');
    });

    // Stop bot
    this.app.post('/api/bot/:index/stop', async (req, res) => {
      this.botAction(req, res, 'stop', '🛑 Stopping bot');
    });

    // Restart bot
    this.app.post('/api/bot/:index/restart', async (req, res) => {
      this.botAction(req, res, 'restart', '🔄 Restarting bot');
    });

    // Bot status
    this.app.get('/api/bot/:index/status', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.json({ success: false, exists: false, connected: false });
        }

        if (!this.botManager) {
          return res.json({ exists: false, connected: false, error: 'Bot Manager not initialized' });
        }

        res.json(this.botManager.getBotStatus(config.accounts[index].username));
      } catch (error) {
        console.error('Error getting bot status:', error);
        res.status(500).json({ success: false, exists: false, connected: false, error: error.message });
      }
    });

    // Bot stats
    this.app.get('/api/bot/:index/stats', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const emptyStats = {
          success: true,
          purseHistory: [],
          currentPurse: null,
          startPurse: null,
          currentProfit: 0,
          coinsPerHour: 0,
          runtime: 0,
          isLogged: false
        };

        if (!this.botManager) {
          return res.json({ ...emptyStats, message: 'Bot Manager not initialized' });
        }

        const bot = this.botManager.bots.get(config.accounts[index].username);
        
        if (!bot) {
          return res.json({ ...emptyStats, message: 'Bot not running' });
        }

        if (bot.getStats && typeof bot.getStats === 'function') {
          return res.json({ success: true, ...bot.getStats() });
        }

        // Fallback
        res.json({
          success: true,
          username: config.accounts[index].username,
          purseHistory: bot.purseHistory || [],
          currentPurse: bot.currentPurse || null,
          startPurse: bot.startPurse || null,
          currentProfit: (bot.currentPurse && bot.startPurse) ? bot.currentPurse - bot.startPurse : 0,
          coinsPerHour: 0,
          runtime: bot.runtime || 0,
          isLogged: bot.isLogged || false
        });
      } catch (error) {
        console.error('Error getting bot stats:', error);
        res.status(500).json({ success: false, error: error.message, purseHistory: [] });
      }
    });

    // Bot logs (activity logs)
    this.app.get('/api/bot/:index/logs', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const limit = parseInt(req.query.limit) || 20;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!this.botManager) {
          return res.json({ success: true, logs: [], message: 'Bot Manager not initialized' });
        }

        const logs = this.botManager.getBotActivityLogs(config.accounts[index].username, limit);
        res.json({ success: true, logs });
      } catch (error) {
        console.error('❌ Error getting activity logs:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Bot profit history (NEW!)
    this.app.get('/api/bot/:index/profit', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const limit = parseInt(req.query.limit) || 50;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!this.botManager) {
          return res.json({ success: true, profits: [], message: 'Bot Manager not initialized' });
        }

        const profits = this.botManager.getBotProfitHistory(config.accounts[index].username, limit);
        res.json({ success: true, profits });
      } catch (error) {
        console.error('❌ Error getting profit history:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  async botAction(req, res, action, logMessage) {
    try {
      if (!this.validatePassword(req.headers['x-password'])) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const index = parseInt(req.params.index);
      const config = this.getConfig();
      
      if (!config.accounts[index]) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      if (!this.botManager) {
        return res.status(503).json({ success: false, error: 'Bot Manager not initialized' });
      }

      const username = config.accounts[index].username;
      console.log(`${logMessage}: ${username}`);
      
      const result = await this.botManager[`${action}Bot`](username);
      res.json(result);
    } catch (error) {
      console.error(`Error ${action} bot:`, error);
      res.status(500).json({ success: false, error: `Failed to ${action} bot: ${error.message}` });
    }
  }

  updateBotRealTime(username, fieldPath, value) {
    if (!this.botManager?.bots) return;

    const bot = this.botManager.bots.get(username);
    if (!bot?.flipManager) return;

    const pathParts = fieldPath.split('.');
    if (pathParts[0] === 'flips' && pathParts.length > 1) {
      const flipField = pathParts[1];
      
      // Update FlipManager properties directly
      if (flipField === 'maxBuyPrice' || flipField === 'minProfit' || flipField === 'minVolume') {
        // These properties are in the API
        if (bot.flipManager.api) {
          bot.flipManager.api[flipField] = value;
          console.log(`✅ FlipManager.api.${flipField} updated for ${username} to ${value}`);
        }
      } else if (flipField === 'blacklistContaining') {
        // blacklistContaining is in the API
        if (bot.flipManager.api) {
          bot.flipManager.api.blacklistContaining = value;
          console.log(`✅ FlipManager.api.blacklistContaining updated for ${username}`);
        }
      } else if (['maxFlips', 'maxRelist', 'maxBuyRelist', 'whitelist', 'minOrder', 'maxOrder', 'minSpread', 'sellTimeout', 'purse', 'defaultSpread'].includes(flipField)) {
        // These properties are direct on FlipManager
        bot.flipManager[flipField] = value;
        console.log(`✅ FlipManager.${flipField} updated for ${username} to ${value}`);
      }
    }
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((acc, key) => acc[key] = acc[key] || {}, obj);
    target[lastKey] = value;
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  start() {
    const config = this.getConfig();
    const localIP = this.getLocalIP();
    
    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║                       🌐 Web App                      ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  🌍 Website:                                           ║
║     http://${localIP}:${this.port}                    ║
║                                                        ║
║  🔐 Password: ${config.webPassword}                   ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${this.port} already in use`);
      } else {
        console.error('❌ Error starting web server:', error.message);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Web server stopped');
    }
  }
}

module.exports = WebServer;




