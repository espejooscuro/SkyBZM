




const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

class WebServer {
  constructor(configPath, port = 7392, botManager = null) {
    this.app = express();
    this.configPath = configPath;
    this.port = port;
    this.botManager = botManager;
    this.config = null;
    this.server = null;

    this.loadConfig();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocketOrSSE();
  }

  loadConfig() {
    try {
      const rawData = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(rawData);
    } catch (error) {
      console.error('❌ Error loading config:', error.message);
      this.config = { accounts: [] };
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('❌ Error saving config:', error.message);
    }
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from dist folder
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      this.app.use(express.static(distPath));
    } else {
      console.warn('⚠️  Warning: dist folder not found. Run npm run build first.');
    }
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      this.loadConfig();
      
      const bots = [];
      
      if (this.config && this.config.accounts) {
        this.config.accounts.forEach(account => {
          const botInfo = {
            username: account.username,
            connected: false,
            state: 'disconnected',
            exists: true,
            health: {
              lastHeartbeat: Date.now(),
              lastActivity: Date.now()
            },
            purse: 0
          };

          // If botManager exists, get live data
          if (this.botManager && this.botManager.bots) {
            const bot = this.botManager.bots.get(account.username);
            if (bot) {
              botInfo.connected = !!bot.bot;
              botInfo.state = bot.bot ? 'connected' : 'disconnected';
              botInfo.purse = bot.purse || 0;
            }
          }

          bots.push(botInfo);
        });
      }

      res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        bots
      });
    });

    // Login endpoint
    this.app.post('/api/login', (req, res) => {
      const { password } = req.body;
      
      this.loadConfig();
      
      const webPassword = this.config.webPassword || '';
      
      if (password === webPassword) {
        res.json({ success: true, message: 'Login successful' });
      } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
      }
    });

    // API Routes
    this.app.get('/api/config', (req, res) => {
      this.loadConfig();
      res.json({ config: this.config });
    });

    this.app.post('/api/config', (req, res) => {
      try {
        this.config = req.body;
        this.saveConfig();
        res.json({ success: true, message: 'Configuration saved' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    this.app.put('/api/config', (req, res) => {
      try {
        this.config = req.body.config || req.body;
        this.saveConfig();
        res.json({ success: true, message: 'Configuration updated' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    this.app.get('/api/bots', (req, res) => {
      this.loadConfig();
      
      // If no config or accounts, return empty array
      if (!this.config || !this.config.accounts || this.config.accounts.length === 0) {
        return res.json({ bots: [] });
      }

      // If botManager exists, return live bot data
      if (this.botManager && this.botManager.bots) {
        const botsData = this.config.accounts.map((account) => {
          const bot = this.botManager.bots.get(account.username);
          
          if (bot) {
            return {
              id: bot.username,
              username: bot.username,
              status: bot.bot ? 'online' : 'offline',
              autoStart: account.autoStart || false,
              flips: account.flipConfigs || account.flips || [],
              stats: bot.stats || {
                totalProfit: 0,
                totalFlips: 0,
                successRate: 0,
              },
              inventory: bot.inventory || [],
              restSchedule: account.restSchedule || {
                shortBreaks: { enabled: false, workDuration: 10, breakDuration: 3 },
                dailyRest: { enabled: false, workHours: 16 },
              },
            };
          } else {
            // Bot not in memory
            return {
              id: account.username,
              username: account.username,
              status: 'offline',
              autoStart: account.autoStart || false,
              flips: account.flipConfigs || account.flips || [],
              stats: {
                totalProfit: 0,
                totalFlips: 0,
                successRate: 0,
              },
              inventory: [],
              restSchedule: account.restSchedule || {
                shortBreaks: { enabled: false, workDuration: 10, breakDuration: 3 },
                dailyRest: { enabled: false, workHours: 16 },
              },
            };
          }
        });

        return res.json({ bots: botsData });
      }

      // If no botManager, return bots from config.json
      const botsData = this.config.accounts.map((account) => ({
        id: account.username,
        username: account.username,
        status: 'offline',
        autoStart: account.autoStart || false,
        flips: account.flipConfigs || account.flips || [],
        stats: account.stats || {
          totalProfit: 0,
          totalFlips: 0,
          successRate: 0,
        },
        inventory: [],
        restSchedule: account.restSchedule || {
          shortBreaks: { enabled: false, workDuration: 10, breakDuration: 3 },
          dailyRest: { enabled: false, workHours: 16 },
        },
      }));

      res.json({ bots: botsData });
    });

    this.app.post('/api/bot/:username/start', async (req, res) => {
      const { username } = req.params;

      if (!this.botManager) {
        return res
          .status(400)
          .json({ success: false, message: 'Bot manager not available' });
      }

      try {
        const result = await this.botManager.startBot(username);
        if (result.success) {
          res.json({ success: true, message: result.message });
        } else {
          res.status(400).json({ success: false, message: result.message });
        }
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: error.message });
      }
    });

    this.app.post('/api/bot/:username/stop', async (req, res) => {
      const { username } = req.params;

      if (!this.botManager) {
        return res
          .status(400)
          .json({ success: false, message: 'Bot manager not available' });
      }

      try {
        const result = await this.botManager.stopBot(username);
        if (result.success) {
          res.json({ success: true, message: result.message });
        } else {
          res.status(400).json({ success: false, message: result.message });
        }
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: error.message });
      }
    });

    this.app.post('/api/bot/:username/restart', async (req, res) => {
      const { username } = req.params;

      if (!this.botManager) {
        return res
          .status(400)
          .json({ success: false, message: 'Bot manager not available' });
      }

      try {
        const result = await this.botManager.restartBot(username);
        if (result.success) {
          res.json({ success: true, message: result.message });
        } else {
          res.status(400).json({ success: false, message: result.message });
        }
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: error.message });
      }
    });

    this.app.post('/api/bot/:username/config', (req, res) => {
      const { username } = req.params;
      const updates = req.body;

      this.loadConfig();
      const account = this.config.accounts.find(
        (acc) => acc.username === username
      );

      if (!account) {
        return res
          .status(404)
          .json({ success: false, message: 'Account not found' });
      }

      Object.assign(account, updates);
      this.saveConfig();

      // Update bot configuration if it exists
      if (this.botManager && this.botManager.bots) {
        const bot = this.botManager.bots.get(username);
        if (bot) {
          Object.assign(bot, updates);
        }
      }

      res.json({ success: true, message: 'Configuration updated' });
    });

    this.app.get('/api/bot/:username/logs', (req, res) => {
      const { username } = req.params;

      if (!this.botManager || !this.botManager.bots) {
        return res.json({ logs: [] });
      }

      const bot = this.botManager.bots.get(username);
      if (!bot) {
        return res
          .status(404)
          .json({ success: false, message: 'Bot not found' });
      }

      res.json({ logs: bot.logs || [] });
    });

    this.app.get('/api/bots/:username', (req, res) => {
      const { username } = req.params;
      this.loadConfig();

      const account = this.config.accounts.find(acc => acc.username === username);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Bot not found' });
      }

      const botInfo = {
        username: account.username,
        connected: false,
        state: 'disconnected',
        exists: true,
        health: {
          lastHeartbeat: Date.now(),
          lastActivity: Date.now()
        },
        purse: 0
      };

      if (this.botManager && this.botManager.bots) {
        const bot = this.botManager.bots.get(username);
        if (bot) {
          botInfo.connected = !!bot.bot;
          botInfo.state = bot.bot ? 'connected' : 'disconnected';
          botInfo.purse = bot.purse || 0;
        }
      }

      res.json({ bot: botInfo });
    });

    this.app.get('/api/bots/:username/activity', (req, res) => {
      const { username } = req.params;
      const limit = parseInt(req.query.limit) || 30;

      if (!this.botManager || !this.botManager.bots) {
        return res.json({ logs: [] });
      }

      const bot = this.botManager.bots.get(username);
      if (!bot) {
        return res.status(404).json({ success: false, message: 'Bot not found' });
      }

      const logs = (bot.logs || []).slice(-limit).map(log => ({
        timestamp: log.timestamp || Date.now(),
        message: log.message || log,
        level: log.level || 'info',
        type: log.type || 'general'
      }));

      res.json({ logs });
    });

    this.app.get('/api/bots/:username/profits', (req, res) => {
      const { username } = req.params;
      const limit = parseInt(req.query.limit) || 50;

      if (!this.botManager || !this.botManager.bots) {
        return res.json({ profits: [] });
      }

      const bot = this.botManager.bots.get(username);
      if (!bot) {
        return res.status(404).json({ success: false, message: 'Bot not found' });
      }

      const profits = (bot.profits || []).slice(-limit);
      res.json({ profits });
    });

    this.app.get('/api/bots/:username/money-flow', (req, res) => {
      const { username } = req.params;
      const limit = parseInt(req.query.limit) || 100;

      if (!this.botManager || !this.botManager.bots) {
        return res.json({ transactions: [] });
      }

      const bot = this.botManager.bots.get(username);
      if (!bot) {
        return res.status(404).json({ success: false, message: 'Bot not found' });
      }

      const transactions = (bot.moneyFlow || []).slice(-limit);
      res.json({ transactions });
    });

    this.app.get('/api/bots/:username/config', (req, res) => {
      const { username } = req.params;
      this.loadConfig();

      const account = this.config.accounts.find(acc => acc.username === username);
      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }

      res.json({ config: account });
    });

    this.app.put('/api/bots/:username/config', (req, res) => {
      const { username } = req.params;
      const updates = req.body;

      this.loadConfig();
      const account = this.config.accounts.find(acc => acc.username === username);

      if (!account) {
        return res.status(404).json({ success: false, message: 'Account not found' });
      }

      // Clean up old restAfter and restTime fields from shortBreaks
      if (updates.restSchedule && updates.restSchedule.shortBreaks) {
        const { enabled, workDuration, breakDuration } = updates.restSchedule.shortBreaks;
        updates.restSchedule.shortBreaks = {
          enabled: enabled || false,
          workDuration: workDuration || 10,
          breakDuration: breakDuration || 3
        };
      }

      Object.assign(account, updates);
      this.saveConfig();

      // Update bot configuration if it exists
      if (this.botManager && this.botManager.bots) {
        const bot = this.botManager.bots.get(username);
        if (bot) {
          Object.assign(bot, updates);
        }
      }

      res.json({ success: true, message: 'Configuration updated' });
    });

    // Serve React app for all other routes
    this.app.use((req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }
      
      const distPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(distPath)) {
        res.sendFile(distPath);
      } else {
        res.status(404).send('Frontend not built. Run: npm run build');
      }
    });
  }

  setupWebSocketOrSSE() {
    // TODO: Implement WebSocket or Server-Sent Events for real-time updates
    // For now, clients will poll the API
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      console.log(`\n✅ Web Dashboard: http://localhost:${this.port}`);
      console.log(`📊 API Endpoint: http://localhost:${this.port}/api`);
      
      if (this.config.webPassword) {
        console.log(`🔑 Web Password: ${this.config.webPassword}\n`);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

module.exports = WebServer;













