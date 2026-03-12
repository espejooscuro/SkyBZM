const delay = ms => new Promise(r => setTimeout(r, ms));

/**
 * RestScheduler - Manages short breaks and daily rest for bot health
 * Enqueues rest nodes into TaskQueue for visibility in Bot Brain
 */
class RestScheduler {
  constructor(bot, config, queue) {
    this.bot = bot;
    this.queue = queue;
    this.config = config || {
      shortBreaks: { enabled: false },
      dailyRest: { enabled: false }
    };
    
    // Short breaks tracking
    this.shortBreaksEnabled = this.config.shortBreaks?.enabled || false;
    this.workDuration = this.config.shortBreaks?.workDuration || 10;
    this.breakDuration = this.config.shortBreaks?.breakDuration || 3;
    
    // Daily rest tracking
    this.dailyRestEnabled = this.config.dailyRest?.enabled || false;
    this.workHours = this.config.dailyRest?.workHours || 16;
    this.restHours = 24 - this.workHours;
    
    // Timers
    this.shortBreakTimer = null;
    this.dailyRestTimer = null;
    
    // State
    this.sessionStartTime = Date.now();
    this.lastShortBreak = Date.now();
    this.isResting = false;
  }
  
  /**
   * Start the rest scheduler
   */
  start() {
    if (this.shortBreaksEnabled) {
      this.scheduleNextShortBreak();
    }
    
    if (this.dailyRestEnabled) {
      this.scheduleNextDailyRest();
    }
  }
  
  /**
   * Schedule the next short break
   */
  scheduleNextShortBreak() {
    if (!this.shortBreaksEnabled) return;
    
    if (this.shortBreakTimer) {
      return;
    }
    
    const workTimeMs = this.workDuration * 60 * 1000;
    
    this.shortBreakTimer = setTimeout(() => {
      this.shortBreakTimer = null;
      this.enqueueShortBreak();
    }, workTimeMs);
  }
  
  /**
   * Schedule the next daily rest
   */
  scheduleNextDailyRest() {
    if (!this.dailyRestEnabled) return;
    
    if (this.dailyRestTimer) {
      return;
    }
    
    const workTimeMs = this.workHours * 60 * 60 * 1000;
    
    this.dailyRestTimer = setTimeout(() => {
      this.dailyRestTimer = null;
      this.enqueueDailyRest();
    }, workTimeMs);
  }
  
  /**
   * Reconnect to the server and login to Skyblock
   */
  async reconnectAndLogin() {
    const mineflayer = require('mineflayer');
    const ChatListener = require('../events/ChatListener');
    const socks = require('socks').SocksClient;
    const { ProxyAgent } = require('proxy-agent');
    
    const proxy = this.bot.config?.proxy;
    const server = 'mc.hypixel.net';
    const port = 25565;
    
    this.bot.bot = mineflayer.createBot({
      host: server,
      port,
      username: this.bot.name,
      auth: "microsoft",
      version: "1.21.11",
      hideErrors: true,
      
      checkTimeoutInterval: 60000,
      keepAlive: true,
      
      clientOptions: {
        keepAlive: true,
        keepAliveInitialDelay: 120000
      },

      connect: (client) => {
        if (!proxy) {
          client.connect(server, port);
          return;
        }

        socks.createConnection({
          proxy: {
            host: proxy.host,
            port: Number(proxy.port),
            type: 5,
            userId: proxy.username,
            password: proxy.password
          },
          command: "connect",
          destination: {
            host: server,
            port: Number(port)
          },
          timeout: 30000
        }, (err, info) => {
          if (err) {
            return;
          }
          
          info.socket.setKeepAlive(true, 60000);
          info.socket.setTimeout(0);
          
          if (info.socket.setNoDelay) {
            info.socket.setNoDelay(true);
          }

          client.setSocket(info.socket);
          client.emit("connect");
        });
      },

      agent: proxy
        ? new ProxyAgent(`socks5://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`)
        : undefined
    });
    
    this.bot.chat = new ChatListener(this.bot.bot, {
      watchList: ["sold", "bought", "coins", "flip", "skyblock", "joined", "Hypixel", "Sending to", "Bazaar"],
      callback: (msg) => {
        console.log(msg.message);
      }
    });
    
    this.bot.chat.onMessageContains(/limbo|packets too fast|server will restart soon|game update|server is too laggy/i, (msg) => {
      this.bot.handleCriticalMessage(msg.message);
    });
    
    await new Promise((resolve) => this.bot.bot.once('spawn', resolve));
    
    let attempts = 0;
    while (!this.bot.bot.entity && attempts < 20) {
      await delay(100);
      attempts++;
    }
    
    if (!this.bot.bot.entity) {
      throw new Error('Bot entity not ready');
    }
    
    if (!this.bot.bot._client) {
      throw new Error('Bot _client not initialized');
    }
    
    if (!this.bot.bot.inventory) {
      throw new Error('Bot inventory not initialized');
    }
    
    await delay(3000);
    
    const botId = `${this.bot.name}_${Date.now()}`;
    this.bot.bot._customBotId = botId;
    
    if (this.bot.flipManager) {
      this.bot.flipManager.bot = this.bot.bot;
      
      for (const flip of this.bot.flipManager.flips) {
        flip.bot = this.bot.bot;
        flip.chatListener = this.bot.chat;
        
        if (flip.type === 'NPC' && flip._ContainerManagerClass) {
          flip.ContainerManager = new flip._ContainerManagerClass(flip.bot);
        }
      }
    }

    if (this.bot.heartbeatInterval) {
      clearInterval(this.bot.heartbeatInterval);
    }
    
    this.bot.lastHeartbeat = Date.now();
    this.bot.lastActivity = Date.now();
    this.bot.lastPacketReceived = Date.now();
    
    this.bot.heartbeatInterval = setInterval(() => {
      if (this.bot.bot && this.bot.bot._client && this.bot.bot._client.socket && !this.bot.bot._client.socket.destroyed) {
        try {
          this.bot.bot._client.write('arm_animation', {
            hand: 0
          });
          this.bot.lastHeartbeat = Date.now();
        } catch (e) {
          try {
            if (this.bot.bot.entity && this.bot.bot.entity.position) {
              this.bot.bot._client.write('position', {
                x: this.bot.bot.entity.position.x,
                y: this.bot.bot.entity.position.y,
                z: this.bot.bot.entity.position.z,
                onGround: this.bot.bot.entity.onGround
              });
              this.bot.lastHeartbeat = Date.now();
            }
          } catch (e2) {
            // Ignorar
          }
        }
      }
    }, 25000);
    
    if (this.bot.inactivityMonitor) {
      clearInterval(this.bot.inactivityMonitor);
    }
    
    this.bot.inactivityMonitor = setInterval(() => {
      if (this.bot.isResting) return;
      
      const timeSinceLogin = Date.now() - this.bot.startTime;
      const timeSinceLastPacket = Date.now() - this.bot.lastPacketReceived;
      
      if (timeSinceLogin < 30000) return;
      
      if (timeSinceLastPacket > 15000) {
        if (this.bot.heartbeatInterval) {
          clearInterval(this.bot.heartbeatInterval);
          this.bot.heartbeatInterval = null;
        }
        
        if (this.bot.inactivityMonitor) {
          clearInterval(this.bot.inactivityMonitor);
          this.bot.inactivityMonitor = null;
        }
        
        if (this.bot.bot && this.bot.bot._client) {
          this.bot.bot._client.end();
        }
      }
    }, 1000);
    
    this.bot.bot._client.on('packet', (data, meta) => {
      if (!this.bot.isResting) {
        this.bot.lastPacketReceived = Date.now();
        this.bot.lastActivity = Date.now();
      }
      
      if (meta.name !== 'teams') return;

      let prefixText = '';
      let suffixText = '';

      if (data.prefix && data.prefix.type === 'compound' && data.prefix.value.text) {
        prefixText = data.prefix.value.text.value || '';
      }

      if (data.suffix && data.suffix.type === 'compound' && data.suffix.value.text) {
        suffixText = data.suffix.value.text.value || '';
      }

      const fullLine = (prefixText + suffixText).replace(/§./g, '').trim();

      if (fullLine.includes('Purse') || fullLine.includes('Piggy')) {
        const match = fullLine.match(/([0-9,]+)/);
        if (match) {
          const purseString = match[1];
          const purseValue = parseInt(purseString.replace(/,/g, ''));
          
          if (!isNaN(purseValue) && purseValue > 1000000 && purseValue !== this.bot.currentPurse) {
            this.bot.currentPurse = purseValue;
            
            if (this.bot.startPurse === null) {
              this.bot.startPurse = purseValue;
            }
            
            const now = Date.now();
            this.bot.runtime = Math.floor((now - this.bot.startTime) / 1000);
            
            this.bot.purseHistory.push({
              timestamp: now,
              purse: purseValue,
              runtime: this.bot.runtime
            });
            
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            this.bot.purseHistory = this.bot.purseHistory.filter(entry => entry.timestamp > oneDayAgo);
            if (this.bot.purseHistory.length > 1000) {
              this.bot.purseHistory = this.bot.purseHistory.slice(-1000);
            }
          }
        }
      }
    });
    
    this.bot.bot.on('end', () => {
      this.bot.isLogged = false;
      
      if (this.bot.heartbeatInterval) {
        clearInterval(this.bot.heartbeatInterval);
        this.bot.heartbeatInterval = null;
      }
      
      if (this.bot.inactivityMonitor) {
        clearInterval(this.bot.inactivityMonitor);
        this.bot.inactivityMonitor = null;
      }
    });
    
    this.bot.bot.on('error', (err) => {
      if (err.name === "PartialReadError") return;
    });
    
    this.bot.chat.send('/skyblock');
    await delay(5000);
    
    this.bot.chat.send('/is');
    await delay(5000);
  }
  
  /**
   * Reconnect wrapper (used by break nodes)
   */
  async reconnect() {
    try {
      if (this.bot.bot) {
        this.bot.bot.quit();
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      await this.reconnectAndLogin();

      if (this.bot.flipManager) {
        this.bot.flipManager.resume();
      }

      this.bot.isResting = false;
      
    } catch (err) {
      // Silent error handling
    }
  }
  
  /**
   * Enqueue a SHORT BREAK node
   */
  enqueueShortBreak() {
    if (this.isResting) {
      return;
    }
    
    const timeSinceLastBreak = Date.now() - this.lastShortBreak;
    const workTimeMs = this.workDuration * 60 * 1000;
    
    if (timeSinceLastBreak < workTimeMs) {
      return;
    }
    
    const breakDurationMs = this.breakDuration * 60 * 1000;
    
    this.queue.enqueue(
      async () => {
        console.log(`[${this.bot.name}] Short break starting (${this.breakDuration} minutes)`);
        this.isResting = true;
        this.bot.isResting = true;
        
        if (this.bot.flipManager) {
          this.bot.flipManager.pause();
        }
        
        if (this.bot.bot) {
          this.bot.bot.end();
        }
        
        await new Promise(resolve => setTimeout(resolve, breakDurationMs));
        
        await this.reconnect();
        
        console.log(`[${this.bot.name}] Short break complete`);
        this.isResting = false;
        
        this.lastShortBreak = Date.now();
        
        this.scheduleNextShortBreak();
        
        return true;
      },
      {
        type: 'shortbreak',
        item: 'Rest Period',
        description: `Short break: ${this.breakDuration} minutes`,
        priority: 5
      }
    );
  }
  
  /**
   * Enqueue a DAILY REST node
   */
  enqueueDailyRest() {
    if (this.isResting) {
      return;
    }
    
    const restDurationMs = this.restHours * 60 * 60 * 1000;
    
    this.queue.enqueue(
      async () => {
        console.log(`[${this.bot.name}] Daily rest starting (${this.restHours} hours)`);
        this.isResting = true;
        this.bot.isResting = true;
        
        if (this.bot.flipManager) {
          this.bot.flipManager.pause();
        }
        
        if (this.bot.bot) {
          this.bot.bot.end();
        }
        
        await new Promise(resolve => setTimeout(resolve, restDurationMs));
        
        await this.reconnect();
        
        console.log(`[${this.bot.name}] Daily rest complete`);
        this.isResting = false;
        this.dailyRestScheduled = false;
        
        this.scheduleNextDailyRest();
        
        return true;
      },
      {
        type: 'dailyrest',
        item: 'Daily Rest',
        description: `Daily rest: ${this.restHours} hours`,
        priority: 5
      }
    );
  }
  
  /**
   * Enqueue a RESET node (critical priority)
   * Used when critical messages are detected (limbo, restart, etc.)
   */
  enqueueReset(reason = 'Critical message detected') {
    this.queue.enqueue(
      async () => {
        this.isResting = true;
        this.bot.isResting = true;
        
        if (this.bot.flipManager) {
          this.bot.flipManager.pause();
        }
        
        if (this.bot.bot) {
          this.bot.bot.end();
        }
        
        await delay(30000);
        
        await this.reconnectAndLogin();
        
        if (this.bot.flipManager) {
          this.bot.flipManager.resume();
        }
        
        this.isResting = false;
        this.bot.isResting = false;
        
        return true;
      },
      {
        type: 'reset',
        item: 'Emergency Reset',
        description: reason,
        priority: 1
      }
    );
  }
  
  /**
   * Get current status
   */
  getStatus() {
    const now = Date.now();
    const sessionDuration = now - this.sessionStartTime;
    
    let nextShortBreak = null;
    if (this.shortBreaksEnabled && this.lastShortBreak) {
      const timeSinceLastBreak = now - this.lastShortBreak;
      const workTimeMs = this.workDuration * 60 * 1000;
      nextShortBreak = Math.max(0, workTimeMs - timeSinceLastBreak);
    }
    
    return {
      isResting: this.isResting,
      shortBreaksEnabled: this.shortBreaksEnabled,
      dailyRestEnabled: this.dailyRestEnabled,
      sessionDuration: Math.floor(sessionDuration / 1000),
      nextShortBreak: nextShortBreak ? Math.floor(nextShortBreak / 1000) : null,
      lastShortBreak: this.lastShortBreak
    };
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.shortBreakTimer) {
      clearTimeout(this.shortBreakTimer);
      this.shortBreakTimer = null;
    }
    
    if (this.dailyRestTimer) {
      clearTimeout(this.dailyRestTimer);
      this.dailyRestTimer = null;
    }
  }
}

module.exports = RestScheduler;
