
const express = require('express');
const path = require('path');
const fs = require('fs');

class WebServer {
  constructor(configPath, port = 7392, botManager = null) {
    this.configPath = configPath;
    this.port = port;
    this.botManager = botManager;
    this.app = express();
    this.server = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Enable JSON parsing
    this.app.use(express.json());
    
    // Enable CORS for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Serve static files from dist (production build)
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      console.log(`📂 Serving static files from: ${distPath}`);
      this.app.use(express.static(distPath));
    } else {
      console.log('⚠️ dist/ folder not found. Run "npm run build" in /src/web/ first.');
    }
  }

  setupRoutes() {
    // ===== API ROUTES =====
    
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok',
        timestamp: Date.now(),
        bots: this.botManager ? this.botManager.getAllBotsStatus() : []
      });
    });

    // Get all bots status
    this.app.get('/api/bots', (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const bots = this.botManager.getAllBotsStatus();
      res.json({ bots });
    });

    // Get specific bot status
    this.app.get('/api/bots/:username', (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const bot = this.botManager.getBotStatus(username);
      
      if (!bot.exists) {
        return res.status(404).json({ error: 'Bot not found' });
      }
      
      res.json({ bot });
    });

    // Start a bot
    this.app.post('/api/bots/:username/start', async (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const result = await this.botManager.startBot(username);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    });

    // Stop a bot
    this.app.post('/api/bots/:username/stop', async (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const result = await this.botManager.stopBot(username);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    });

    // Restart a bot
    this.app.post('/api/bots/:username/restart', async (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const result = await this.botManager.restartBot(username);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    });

    // Get bot activity logs
    this.app.get('/api/bots/:username/activity', (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      
      const logs = this.botManager.getBotActivityLogs(username, limit);
      res.json({ logs });
    });

    // Get bot profit history
    this.app.get('/api/bots/:username/profits', (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      
      const profits = this.botManager.getBotProfitHistory(username, limit);
      res.json({ profits });
    });

    // Get bot money flow
    this.app.get('/api/bots/:username/money-flow', (req, res) => {
      if (!this.botManager) {
        return res.status(503).json({ error: 'Bot manager not initialized' });
      }
      
      const { username } = req.params;
      const limit = parseInt(req.query.limit) || 100;
      
      const transactions = this.botManager.getBotMoneyFlow(username, limit);
      res.json({ transactions });
    });

    // Get configuration
    this.app.get('/api/config', (req, res) => {
      try {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        res.json({ config });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update configuration
    this.app.put('/api/config', (req, res) => {
      try {
        const newConfig = req.body;
        fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2), 'utf8');
        res.json({ success: true, message: 'Configuration updated' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update bot configuration
    this.app.put('/api/bots/:username/config', (req, res) => {
      try {
        const { username } = req.params;
        const updates = req.body;
        
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        const accountIndex = config.accounts.findIndex(acc => acc.username === username);
        
        if (accountIndex === -1) {
          return res.status(404).json({ error: 'Bot not found in configuration' });
        }
        
        // Update bot configuration
        config.accounts[accountIndex] = {
          ...config.accounts[accountIndex],
          ...updates
        };
        
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
        
        res.json({ success: true, message: 'Bot configuration updated' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Catch all other routes and serve index.html (for React Router)
    // Use middleware instead of wildcard route to avoid Express 5.x path-to-regexp issues
    this.app.use((req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      // Skip if it's a file with extension (already handled by static middleware)
      if (path.extname(req.path)) {
        return next();
      }
      
      // Serve index.html for all other routes (SPA routing)
      const distPath = path.join(__dirname, 'dist', 'index.html');
      
      if (fs.existsSync(distPath)) {
        res.sendFile(distPath);
      } else {
        res.status(404).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>SkyBZM - Build Required</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #0F172A;
                color: #F8FAFC;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .container {
                max-width: 600px;
              }
              h1 {
                color: #A78BFA;
                margin-bottom: 20px;
              }
              p {
                color: #CBD5E1;
                margin-bottom: 30px;
                line-height: 1.6;
              }
              code {
                background: #1E293B;
                padding: 2px 8px;
                border-radius: 4px;
                color: #93C5FD;
                font-family: 'Courier New', monospace;
              }
              .steps {
                background: #1E293B;
                border-radius: 8px;
                padding: 20px;
                text-align: left;
                margin-top: 20px;
              }
              .steps ol {
                margin: 10px 0;
                padding-left: 20px;
              }
              .steps li {
                margin: 10px 0;
                color: #CBD5E1;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🚀 Build Required</h1>
              <p>The web interface needs to be built before it can be served.</p>
              <div class="steps">
                <strong>To build and start the web interface:</strong>
                <ol>
                  <li>Navigate to the web directory: <code>cd src/web</code></li>
                  <li>Install dependencies: <code>npm install</code></li>
                  <li>Build the project: <code>npm run build</code></li>
                  <li>Restart the bot from the root directory</li>
                </ol>
              </div>
              <p style="margin-top: 30px; font-size: 0.9em; color: #64748B;">
                For development with hot reload: <code>npm run dev</code>
              </p>
            </div>
          </body>
          </html>
        `);
      }
    });
  }

  start() {
    this.server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log('\n┌────────────────────────────────┐');
      console.log('│     🌐 Web Server Started      │');
      console.log('├────────────────────────────────┤');
      console.log(`│  Local:   http://localhost:${this.port}  │`);
      console.log(`│  Network: http://0.0.0.0:${this.port}    │`);
      console.log('└────────────────────────────────┘\n');
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${this.port} is already in use.`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
      }
    });
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('🛑 Web server stopped');
      });
    }
  }
}

module.exports = WebServer;

