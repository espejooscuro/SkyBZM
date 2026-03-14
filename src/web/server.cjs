
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
    // API Routes
    this.app.get('/api/config', (req, res) => {
      this.loadConfig();
      res.json(this.config);
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

    this.app.get('/api/bots', (req, res) => {
      if (!this.botManager) {
        return res.json({ bots: [] });
      }

      const botsData = this.botManager.bots.map((bot) => ({
        id: bot.username,
        username: bot.username,
        status: bot.bot ? 'online' : 'offline',
        autoStart: bot.autoStart || false,
        flips: bot.flips || [],
        stats: bot.stats || {
          totalProfit: 0,
          totalFlips: 0,
          successRate: 0,
        },
        inventory: bot.inventory || [],
        restSchedule: bot.restSchedule || {
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

      const bot = this.botManager.bots.find((b) => b.username === username);
      if (!bot) {
        return res
          .status(404)
          .json({ success: false, message: 'Bot not found' });
      }

      try {
        await bot.login();
        res.json({ success: true, message: `Bot ${username} started` });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: error.message });
      }
    });

    this.app.post('/api/bot/:username/stop', (req, res) => {
      const { username } = req.params;

      if (!this.botManager) {
        return res
          .status(400)
          .json({ success: false, message: 'Bot manager not available' });
      }

      const bot = this.botManager.bots.find((b) => b.username === username);
      if (!bot) {
        return res
          .status(404)
          .json({ success: false, message: 'Bot not found' });
      }

      try {
        bot.disconnect('User requested stop');
        res.json({ success: true, message: `Bot ${username} stopped` });
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

      const bot = this.botManager.bots.find((b) => b.username === username);
      if (!bot) {
        return res
          .status(404)
          .json({ success: false, message: 'Bot not found' });
      }

      try {
        bot.disconnect('Restarting bot');
        setTimeout(async () => {
          await bot.login();
        }, 2000);
        res.json({ success: true, message: `Bot ${username} restarting` });
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
      if (this.botManager) {
        const bot = this.botManager.bots.find((b) => b.username === username);
        if (bot) {
          Object.assign(bot, updates);
        }
      }

      res.json({ success: true, message: 'Configuration updated' });
    });

    this.app.get('/api/bot/:username/logs', (req, res) => {
      const { username } = req.params;

      if (!this.botManager) {
        return res.json({ logs: [] });
      }

      const bot = this.botManager.bots.find((b) => b.username === username);
      if (!bot) {
        return res
          .status(404)
          .json({ success: false, message: 'Bot not found' });
      }

      res.json({ logs: bot.logs || [] });
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

