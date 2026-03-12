




const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WebServer {
  constructor(configPath, port = 9527, botManager = null) {
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
    
    // Serve static files from dist directory (production build)
    const distPath = path.join(__dirname, 'public', 'dist');
    if (fs.existsSync(distPath)) {
      this.app.use(express.static(distPath));
    } else {
      // Fallback to public directory for development
      this.app.use(express.static(path.join(__dirname, 'public')));
    }
    
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
  }

  validatePassword(password) {
    return password === this.getConfig().webPassword;
  }

  setupRoutes() {
    // API routes first
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
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        // Check if this is a full account update or a field update
        if (req.body.path && req.body.value !== undefined) {
          // Old format: { path, value }
          const { path: fieldPath, value } = req.body;
          this.setNestedValue(config.accounts[index], fieldPath, value);
        } else {
          // New format: full account object
          // Preserve critical fields that shouldn't be overwritten
          const username = config.accounts[index].username;
          const password = config.accounts[index].password;
          
          // Update account with new data
          config.accounts[index] = {
            ...req.body,
            username,  // Ensure username doesn't change
            password,  // Ensure password doesn't change
            index      // Ensure index doesn't change
          };
        }

        this.saveConfig(config);

        if (this.botManager) {
          // Update bot in real-time if it's running
          const bot = this.botManager.bots.get(config.accounts[index].username);
          if (bot && bot.flipManager) {
            bot.flipManager.updateConfig(config.accounts[index].flips || {});
          }
        }

        res.json(config.accounts[index]);
      } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Whitelist/Blacklist management
    this.setupListManagement();

    // 🔥 NEW: Flip Configurations Management
    this.setupFlipConfigsManagement();

    // Bot control endpoints
    this.setupBotControl();

    // Bot data endpoint (for new dashboard)
    this.app.get('/api/bot-data', (req, res) => {
      try {
        const config = this.getConfig();
        
        // Get first account data (or you can modify to handle multiple accounts)
        const accountIndex = 0;
        if (!config.accounts[accountIndex]) {
          return res.json({
            config: {},
            stats: {},
            activeFlips: [],
            recentFlips: [],
            taskQueue: { currentTask: null, queuedTasks: [] },
            logs: []
          });
        }

        const account = config.accounts[accountIndex];
        
        // Get bot instance
        const bot = this.botManager?.bots?.get(account.username);
        
        // Collect data
        const data = {
          config: account.flips || {},
          stats: this.collectBotStats(bot),
          activeFlips: this.collectActiveFlips(bot),
          recentFlips: this.collectRecentFlips(bot),
          taskQueue: this.collectTaskQueue(bot),
          logs: this.collectBotLogs(bot, 50)
        };
        
        res.json(data);
      } catch (error) {
        console.error('Error getting bot data:', error);
        res.status(500).json({ error: error.message });
      }
    });

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
    
    // Serve index.html for all non-API routes (SPA fallback)
    this.app.get('*', (req, res) => {
      const distIndexPath = path.join(__dirname, 'public', 'dist', 'index.html');
      const publicIndexPath = path.join(__dirname, 'public', 'index.html');
      
      if (fs.existsSync(distIndexPath)) {
        res.sendFile(distIndexPath);
      } else if (fs.existsSync(publicIndexPath)) {
        res.sendFile(publicIndexPath);
      } else {
        res.status(404).send('Application not found. Please run npm run build.');
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

  setupFlipConfigsManagement() {
    const crypto = require('crypto');
    
    // CREATE new flip configuration
    this.app.post('/api/account/:index/flips', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { type } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        // Initialize flipConfigs array if it doesn't exist
        if (!config.accounts[index].flipConfigs) {
          config.accounts[index].flipConfigs = [];
        }

        // Create new flip config based on type
        const newFlip = {
          id: crypto.randomBytes(8).toString('hex'),
          type: type,
          name: `${this.getFlipTypeName(type)} ${config.accounts[index].flipConfigs.length + 1}`,
          enabled: true,
          config: this.getDefaultFlipConfig(type)
        };

        config.accounts[index].flipConfigs.push(newFlip);
        this.saveConfig(config);

        console.log(`✅ Created flip configuration: ${newFlip.name} for account ${index}`);
        res.json({ success: true, flip: newFlip, account: config.accounts[index] });
      } catch (error) {
        console.error('❌ Error creating flip:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // UPDATE flip enabled status
    this.app.patch('/api/account/:index/flips/:flipIndex', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const flipIndex = parseInt(req.params.flipIndex);
        const { enabled } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[index].flipConfigs || !config.accounts[index].flipConfigs[flipIndex]) {
          return res.status(404).json({ success: false, error: 'Flip not found' });
        }

        config.accounts[index].flipConfigs[flipIndex].enabled = enabled;
        this.saveConfig(config);

        console.log(`✅ Flip ${flipIndex} ${enabled ? 'enabled' : 'disabled'} for account ${index}`);
        res.json({ success: true, account: config.accounts[index] });
      } catch (error) {
        console.error('❌ Error updating flip:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // DELETE flip configuration
    this.app.delete('/api/account/:index/flips/:flipIndex', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const flipIndex = parseInt(req.params.flipIndex);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[index].flipConfigs || !config.accounts[index].flipConfigs[flipIndex]) {
          return res.status(404).json({ success: false, error: 'Flip not found' });
        }

        const deletedFlip = config.accounts[index].flipConfigs.splice(flipIndex, 1)[0];
        this.saveConfig(config);

        console.log(`✅ Deleted flip configuration: ${deletedFlip.name} from account ${index}`);
        res.json({ success: true, account: config.accounts[index] });
      } catch (error) {
        console.error('❌ Error deleting flip:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // UPDATE flip config values
    this.app.patch('/api/account/:index/flips/:flipIndex/config', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const flipIndex = parseInt(req.params.flipIndex);
        const { key, value } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[index].flipConfigs || !config.accounts[index].flipConfigs[flipIndex]) {
          return res.status(404).json({ success: false, error: 'Flip not found' });
        }

        if (!config.accounts[index].flipConfigs[flipIndex].config) {
          config.accounts[index].flipConfigs[flipIndex].config = {};
        }

        config.accounts[index].flipConfigs[flipIndex].config[key] = value;
        this.saveConfig(config);

        console.log(`✅ Updated flip config ${key} = ${value} for account ${index}, flip ${flipIndex}`);
        res.json({ success: true, account: config.accounts[index] });
      } catch (error) {
        console.error('❌ Error updating flip config:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ADD item to flip whitelist
    this.app.post('/api/account/:index/flips/:flipIndex/whitelist', (req, res) => {
      this.manageFlipList(req, res, 'whitelist', 'add');
    });

    // REMOVE item from flip whitelist
    this.app.delete('/api/account/:index/flips/:flipIndex/whitelist/:itemId', (req, res) => {
      this.manageFlipList(req, res, 'whitelist', 'remove');
    });

    // ADD item to flip blacklist
    this.app.post('/api/account/:index/flips/:flipIndex/blacklist', (req, res) => {
      this.manageFlipList(req, res, 'blacklist', 'add');
    });

    // REMOVE item from flip blacklist
    this.app.delete('/api/account/:index/flips/:flipIndex/blacklist/:itemId', (req, res) => {
      this.manageFlipList(req, res, 'blacklist', 'remove');
    });

    // CREATE new flip
    this.app.post('/api/flip/create', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { accountIndex, type } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[accountIndex]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[accountIndex].flipConfigs) {
          config.accounts[accountIndex].flipConfigs = [];
        }

        const newFlip = {
          type: type || 'SELL_ORDER',
          maxBuyPrice: 5000000,
          minProfit: 50000,
          minVolume: 1000,
          maxFlips: 5,
          maxRelist: 5,
          maxBuyRelist: 3,
          minOrder: 1,
          maxOrder: 640,
          minSpread: 0,
          whitelist: [],
          blacklistContaining: []
        };

        config.accounts[accountIndex].flipConfigs.push(newFlip);
        this.saveConfig(config);

        console.log(`✅ Created new ${type} flip for account ${accountIndex}`);
        res.json({ success: true, flip: newFlip });
      } catch (error) {
        console.error('❌ Error creating flip:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // UPDATE flip configuration
    this.app.post('/api/flip/update', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { accountIndex, flipIndex, key, value } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[accountIndex]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[accountIndex].flipConfigs || !config.accounts[accountIndex].flipConfigs[flipIndex]) {
          return res.status(404).json({ success: false, error: 'Flip not found' });
        }

        config.accounts[accountIndex].flipConfigs[flipIndex][key] = value;
        this.saveConfig(config);

        console.log(`✅ Updated flip ${flipIndex} ${key} to ${value} for account ${accountIndex}`);
        res.json({ success: true });
      } catch (error) {
        console.error('❌ Error updating flip:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // DELETE flip
    this.app.post('/api/flip/delete', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { accountIndex, flipIndex } = req.body;
        const config = this.getConfig();
        
        if (!config.accounts[accountIndex]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[accountIndex].flipConfigs || !config.accounts[accountIndex].flipConfigs[flipIndex]) {
          return res.status(404).json({ success: false, error: 'Flip not found' });
        }

        config.accounts[accountIndex].flipConfigs.splice(flipIndex, 1);
        this.saveConfig(config);

        console.log(`✅ Deleted flip ${flipIndex} for account ${accountIndex}`);
        res.json({ success: true });
      } catch (error) {
        console.error('❌ Error deleting flip:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  manageFlipList(req, res, listType, action) {
    try {
      if (!this.validatePassword(req.headers['x-password'])) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const index = parseInt(req.params.index);
      const flipIndex = parseInt(req.params.flipIndex);
      const config = this.getConfig();
      
      if (!config.accounts[index]) {
        return res.status(404).json({ success: false, error: 'Account not found' });
      }

      if (!config.accounts[index].flipConfigs || !config.accounts[index].flipConfigs[flipIndex]) {
        return res.status(404).json({ success: false, error: 'Flip not found' });
      }

      const flip = config.accounts[index].flipConfigs[flipIndex];
      
      if (!flip.config) {
        flip.config = {};
      }

      const listKey = listType === 'whitelist' ? 'whitelist' : 'blacklistContaining';
      const itemId = action === 'add' ? req.body.itemId : req.params.itemId;

      if (!flip.config[listKey]) {
        flip.config[listKey] = [];
      }

      if (action === 'add') {
        if (!flip.config[listKey].includes(itemId)) {
          flip.config[listKey].push(itemId);
          console.log(`✅ Added ${itemId} to flip ${flipIndex} ${listType}`);
        }
      } else {
        flip.config[listKey] = flip.config[listKey].filter(id => id !== itemId);
        console.log(`✅ Removed ${itemId} from flip ${flipIndex} ${listType}`);
      }

      this.saveConfig(config);
      res.json({ success: true, account: config.accounts[index] });
    } catch (error) {
      console.error(`❌ Error managing flip ${listType}:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  getFlipTypeName(type) {
    const names = {
      'sell_order': 'Sell Order Flip',
      'kat': 'Kat Flip',
      'forge': 'Forge Flip',
      'npc': 'NPC Flip',
      'craft': 'Craft Flip'
    };
    return names[type] || 'Unknown Flip';
  }

  getDefaultFlipConfig(type) {
    if (type === 'sell_order') {
      return {
        maxBuyPrice: 5000000,
        minProfit: 10000,
        minVolume: 1000,
        maxFlips: 7,
        maxRelist: 3,
        maxBuyRelist: 3,
        minOrder: 1,
        maxOrder: 640,
        minSpread: 0,
        whitelist: [],
        blacklistContaining: []
      };
    }
    
    // Para otros tipos, retornar config vacía
    return {};
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

    // GET brain data (task queue visualization)
    this.app.get('/api/bot/:index/brain', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const emptyBrain = {
          success: true,
          queueLength: 0,
          running: false,
          paused: false,
          currentTask: null,
          queuedTasks: []
        };

        if (!this.botManager) {
          return res.json({ ...emptyBrain, message: 'Bot Manager not initialized' });
        }

        const bot = this.botManager.bots.get(config.accounts[index].username);
        
        if (!bot) {
          return res.json({ ...emptyBrain, message: 'Bot not running' });
        }

        // 🔥 Access the Bot's central TaskQueue directly
        const taskQueue = bot.queue;

        if (!taskQueue) {
          console.log('[Brain API] ⚠️ Bot has no TaskQueue');
          return res.json(emptyBrain);
        }

        if (typeof taskQueue.getState === 'function') {
          const queueState = taskQueue.getState();
          
          return res.json({
            success: true,
            queueLength: queueState.queueLength || 0,
            running: queueState.running || false,
            paused: queueState.paused || false,
            currentTask: queueState.currentTask || null,
            queuedTasks: queueState.queuedTasks || [],
            heartbeat: {
              lastPacketReceived: bot.lastPacketReceived || Date.now(),
              lastHeartbeat: bot.lastHeartbeat || Date.now(),
              timeSinceLastPacket: Date.now() - (bot.lastPacketReceived || Date.now()),
              isAlive: (Date.now() - (bot.lastPacketReceived || Date.now())) < 10000,
              isResting: bot.isResting || false
            }
          });
        }

        console.log('[Brain API] ⚠️ TaskQueue has no getState method');
        // Fallback
        res.json(emptyBrain);
      } catch (error) {
        console.error('Error getting brain data:', error);
        res.status(500).json({ success: false, error: error.message });
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

    // Bot money flow history (NEW!)
    this.app.get('/api/bot/:index/moneyflow', (req, res) => {
      try {
        if (!this.validatePassword(req.headers['x-password'])) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const limit = parseInt(req.query.limit) || 100;
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!this.botManager) {
          return res.json({ success: true, transactions: [], message: 'Bot Manager not initialized' });
        }

        const transactions = this.botManager.getBotMoneyFlow(config.accounts[index].username, limit);
        res.json({ success: true, transactions });
      } catch (error) {
        console.error('❌ Error getting money flow:', error);
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

  collectBotStats(bot) {
    if (!bot) {
      return {
        totalProfit: 0,
        totalVolume: 0,
        successfulFlips: 0,
        failedFlips: 0
      };
    }

    const currentProfit = (bot.currentPurse && bot.startPurse) 
      ? bot.currentPurse - bot.startPurse 
      : 0;

    return {
      totalProfit: currentProfit,
      totalVolume: bot.totalVolume || 0,
      successfulFlips: bot.successfulFlips || 0,
      failedFlips: bot.failedFlips || 0,
      currentPurse: bot.currentPurse || 0,
      startPurse: bot.startPurse || 0,
      coinsPerHour: bot.coinsPerHour || 0,
      runtime: bot.runtime || 0
    };
  }

  collectActiveFlips(bot) {
    if (!bot?.flipManager?.activeFlips) {
      return [];
    }

    return Array.from(bot.flipManager.activeFlips.values()).map(flip => ({
      id: flip.id,
      item: flip.item,
      buyPrice: flip.buyPrice,
      sellPrice: flip.sellPrice,
      profit: flip.profit || 0,
      status: flip.status || 'active',
      timestamp: flip.timestamp || Date.now(),
      phase: flip.phase || 'unknown'
    }));
  }

  collectRecentFlips(bot) {
    if (!bot?.flipManager?.completedFlips) {
      return [];
    }

    return bot.flipManager.completedFlips.slice(-20).map(flip => ({
      id: flip.id,
      item: flip.item,
      buyPrice: flip.buyPrice,
      sellPrice: flip.sellPrice,
      profit: flip.profit || 0,
      status: flip.status || 'completed',
      timestamp: flip.completedAt || flip.timestamp || Date.now()
    }));
  }

  collectTaskQueue(bot) {
    if (!bot?.taskQueue) {
      return {
        currentTask: null,
        queuedTasks: []
      };
    }

    const currentTask = bot.taskQueue.currentTask ? {
      id: bot.taskQueue.currentTask.id,
      metadata: bot.taskQueue.currentTask.metadata,
      startTime: bot.taskQueue.currentTask.startTime
    } : null;

    const queuedTasks = (bot.taskQueue.queue || []).map(task => ({
      id: task.id,
      metadata: task.metadata
    }));

    return {
      currentTask,
      queuedTasks
    };
  }

  collectBotLogs(bot, limit = 50) {
    if (!bot?.activityLogs) {
      return [];
    }

    return bot.activityLogs.slice(-limit).map(log => ({
      timestamp: log.timestamp || Date.now(),
      message: log.message || log.text || '',
      level: log.level || 'info'
    }));
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    let fallbackIP = null;
    
    // First pass: look for common local network IPs (WiFi)
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          const ip = iface.address;
          
          // Prioritize local network ranges (WiFi/Ethernet)
          if (ip.startsWith('192.168.') || 
              ip.startsWith('10.') || 
              (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
            return ip;
          }
          
          // Store first non-local IP as fallback (Hamachi, etc.)
          if (!fallbackIP) {
            fallbackIP = ip;
          }
        }
      }
    }
    
    // If no local network IP found, use fallback or localhost
    return fallbackIP || 'localhost';
  }

  start() {
    const config = this.getConfig();
    const localIP = this.getLocalIP();
    
    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`\nWebsite: http://${localIP}:${this.port}`);
      console.log(`Password: ${config.webPassword}\n`);
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



























