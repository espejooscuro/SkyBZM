


const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WebServer {
  constructor(configPath, port = 3000, botManager = null) {
    this.configPath = configPath;
    this.port = port;
    this.botManager = botManager; // Referencia al BotManager para actualizaciones en tiempo real
    this.app = express();
    this.server = null;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // CORS para desarrollo
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
    console.log('✅ Configuration saved successfully');
  }

  // Validar password
  validatePassword(password) {
    const config = this.getConfig();
    return password === config.webPassword;
  }

  setupRoutes() {
    // Servir el HTML principal
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // API: Login
    this.app.post('/api/login', (req, res) => {
      try {
        const { password } = req.body;
        const config = this.getConfig();

        if (password === config.webPassword) {
          res.json({ success: true, config });
        } else {
          res.json({ success: false, error: 'Contraseña incorrecta' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Obtener config (para recargas)
    this.app.get('/api/config', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const config = this.getConfig();
        res.json({ success: true, config });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Actualizar configuración de cuenta
    this.app.put('/api/account/:index', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { path: fieldPath, value } = req.body;
        
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        // Actualizar el valor usando el path
        this.setNestedValue(config.accounts[index], fieldPath, value);
        
        // Guardar configuración
        this.saveConfig(config);

        // Actualizar en tiempo real si el bot está corriendo
        if (this.botManager) {
          this.updateBotRealTime(config.accounts[index].username, fieldPath, value);
        }

        res.json({ success: true, message: 'Configuration updated', config });
      } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Agregar item a whitelist
    this.app.post('/api/account/:index/whitelist', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { itemId } = req.body;
        
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[index].flips.whitelist) {
          config.accounts[index].flips.whitelist = [];
        }

        if (!config.accounts[index].flips.whitelist.includes(itemId)) {
          config.accounts[index].flips.whitelist.push(itemId);
          this.saveConfig(config);

          // Actualizar en tiempo real
          if (this.botManager) {
            this.updateBotRealTime(config.accounts[index].username, 'flips.whitelist', config.accounts[index].flips.whitelist);
          }
        }

        res.json({ success: true, whitelist: config.accounts[index].flips.whitelist });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Remover item de whitelist
    this.app.delete('/api/account/:index/whitelist/:itemId', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { itemId } = req.params;
        
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (config.accounts[index].flips.whitelist) {
          config.accounts[index].flips.whitelist = config.accounts[index].flips.whitelist.filter(id => id !== itemId);
          this.saveConfig(config);

          // Actualizar en tiempo real
          if (this.botManager) {
            this.updateBotRealTime(config.accounts[index].username, 'flips.whitelist', config.accounts[index].flips.whitelist);
          }
        }

        res.json({ success: true, whitelist: config.accounts[index].flips.whitelist });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Agregar item a blacklist
    this.app.post('/api/account/:index/blacklist', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { itemId } = req.body;
        
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (!config.accounts[index].flips.blacklistContaining) {
          config.accounts[index].flips.blacklistContaining = [];
        }

        if (!config.accounts[index].flips.blacklistContaining.includes(itemId)) {
          config.accounts[index].flips.blacklistContaining.push(itemId);
          this.saveConfig(config);

          // Actualizar en tiempo real
          if (this.botManager) {
            this.updateBotRealTime(config.accounts[index].username, 'flips.blacklistContaining', config.accounts[index].flips.blacklistContaining);
          }
        }

        res.json({ success: true, blacklist: config.accounts[index].flips.blacklistContaining });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // API: Remover item de blacklist
    this.app.delete('/api/account/:index/blacklist/:itemId', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const { itemId } = req.params;
        
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        if (config.accounts[index].flips.blacklistContaining) {
          config.accounts[index].flips.blacklistContaining = config.accounts[index].flips.blacklistContaining.filter(id => id !== itemId);
          this.saveConfig(config);

          // Actualizar en tiempo real
          if (this.botManager) {
            this.updateBotRealTime(config.accounts[index].username, 'flips.blacklistContaining', config.accounts[index].flips.blacklistContaining);
          }
        }

        res.json({ success: true, blacklist: config.accounts[index].flips.blacklistContaining });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // ==================== BOT CONTROL ====================

    // API: Iniciar bot
    this.app.post('/api/bot/:index/start', async (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const username = config.accounts[index].username;

        if (!this.botManager) {
          return res.status(503).json({ 
            success: false, 
            error: 'Bot Manager not initialized' 
          });
        }

        console.log(`🚀 Starting bot: ${username}`);
        const result = await this.botManager.startBot(username);
        
        res.json(result);
      } catch (error) {
        console.error('Error starting bot:', error);
        res.status(500).json({ 
          success: false, 
          error: `Failed to start bot: ${error.message}` 
        });
      }
    });

    // API: Detener bot
    this.app.post('/api/bot/:index/stop', async (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const username = config.accounts[index].username;

        if (!this.botManager) {
          return res.status(503).json({ 
            success: false, 
            error: 'Bot Manager not initialized' 
          });
        }

        console.log(`🛑 Stopping bot: ${username}`);
        const result = await this.botManager.stopBot(username);
        
        res.json(result);
      } catch (error) {
        console.error('Error stopping bot:', error);
        res.status(500).json({ 
          success: false, 
          error: `Failed to stop bot: ${error.message}` 
        });
      }
    });

    // API: Reiniciar bot (con delay de 5 segundos)
    this.app.post('/api/bot/:index/restart', async (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ success: false, error: 'Account not found' });
        }

        const username = config.accounts[index].username;

        if (!this.botManager) {
          return res.status(503).json({ 
            success: false, 
            error: 'Bot Manager not initialized' 
          });
        }

        console.log(`🔄 Restarting bot: ${username} (5 second delay)`);
        const result = await this.botManager.restartBot(username);
        
        res.json(result);
      } catch (error) {
        console.error('Error restarting bot:', error);
        res.status(500).json({ 
          success: false, 
          error: `Failed to restart bot: ${error.message}` 
        });
      }
    });

    // API: Obtener estado del bot
    this.app.get('/api/bot/:index/status', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ 
            success: false, 
            exists: false, 
            connected: false 
          });
        }

        const username = config.accounts[index].username;

        if (!this.botManager) {
          return res.json({ 
            exists: false, 
            connected: false,
            error: 'Bot Manager not initialized'
          });
        }

        const status = this.botManager.getBotStatus(username);
        res.json(status);
      } catch (error) {
        console.error('Error getting bot status:', error);
        res.status(500).json({ 
          success: false,
          exists: false, 
          connected: false,
          error: error.message 
        });
      }
    });

    // API: Obtener estadísticas del bot (purse history)
    this.app.get('/api/bot/:index/stats', (req, res) => {
      try {
        const password = req.headers['x-password'];
        
        if (!this.validatePassword(password)) {
          return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const index = parseInt(req.params.index);
        const config = this.getConfig();
        
        if (!config.accounts[index]) {
          return res.status(404).json({ 
            success: false, 
            error: 'Account not found' 
          });
        }

        const username = config.accounts[index].username;

        if (!this.botManager) {
          return res.json({ 
            success: true,
            purseHistory: [],
            currentPurse: null,
            startPurse: null,
            currentProfit: 0,
            coinsPerHour: 0,
            runtime: 0,
            isLogged: false,
            message: 'Bot Manager not initialized'
          });
        }

        // Obtener el bot del manager
        const bot = this.botManager.bots.get(username);
        
        if (!bot) {
          return res.json({ 
            success: true,
            purseHistory: [],
            currentPurse: null,
            startPurse: null,
            currentProfit: 0,
            coinsPerHour: 0,
            runtime: 0,
            isLogged: false,
            message: 'Bot not running'
          });
        }

        // 🔥 Usar el método getStats() del bot si está disponible
        if (bot.getStats && typeof bot.getStats === 'function') {
          const stats = bot.getStats();
          console.log(`📊 Stats requested for ${username}: ${stats.purseHistory.length} data points`);
          
          return res.json({
            success: true,
            ...stats
          });
        }

        // Fallback: obtener datos manualmente (compatible con versiones antiguas)
        const purseHistory = bot.purseHistory || [];
        
        console.log(`📊 Stats requested for ${username}: ${purseHistory.length} data points (fallback)`);

        res.json({
          success: true,
          username,
          purseHistory: purseHistory,
          currentPurse: bot.currentPurse || null,
          startPurse: bot.startPurse || null,
          currentProfit: (bot.currentPurse && bot.startPurse) ? bot.currentPurse - bot.startPurse : 0,
          coinsPerHour: 0,
          runtime: bot.runtime || 0,
          isLogged: bot.isLogged || false
        });
      } catch (error) {
        console.error('Error getting bot stats:', error);
        res.status(500).json({ 
          success: false,
          error: error.message,
          purseHistory: []
        });
      }
    });

    // Proxy para la API de Hypixel (evitar CORS)
    this.app.get('/api/hypixel/items', async (req, res) => {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://api.hypixel.net/resources/skyblock/items');
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // Actualizar bot en tiempo real
  updateBotRealTime(username, fieldPath, value) {
    if (!this.botManager || !this.botManager.bots) return;

    const bot = this.botManager.bots.get(username);
    if (!bot || !bot.flipManager) return;

    console.log(`🔄 Updating ${username} - ${fieldPath} = ${JSON.stringify(value)}`);

    // Actualizar FlipManager en tiempo real
    const pathParts = fieldPath.split('.');
    if (pathParts[0] === 'flips' && pathParts.length > 1) {
      const flipField = pathParts[1];
      
      switch(flipField) {
        case 'maxBuyPrice':
        case 'minProfit':
        case 'minVolume':
        case 'maxFlips':
        case 'maxRelist':
          bot.flipManager.options[flipField] = value;
          break;
        case 'whitelist':
          bot.flipManager.options.whitelist = value;
          break;
        case 'blacklistContaining':
          bot.flipManager.options.blacklistContaining = value;
          break;
      }
      
      console.log(`✅ FlipManager updated for ${username}`);
    }
  }

  // Helper para establecer valores anidados
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
║              🌐 Panel Web Iniciado                     ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║  📱 Acceso Local:                                      ║
║     http://localhost:${this.port}                           ║
║                                                        ║
║  🌍 Acceso desde otros dispositivos:                   ║
║     http://${localIP}:${this.port}                    ║
║                                                        ║
║  🔐 Contraseña: ${config.webPassword}                  ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    this.server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${this.port} ya está en uso. Intenta con otro puerto.`);
      } else {
        console.error('❌ Error al iniciar servidor web:', error.message);
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



