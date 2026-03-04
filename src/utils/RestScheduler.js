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
    this.workDuration = this.config.shortBreaks?.workDuration || 10;  // Work for X minutes
    this.breakDuration = this.config.shortBreaks?.breakDuration || 3;   // Rest for Y minutes
    
    // Daily rest tracking
    this.dailyRestEnabled = this.config.dailyRest?.enabled || false;
    this.workHours = this.config.dailyRest?.workHours || 16; // Work for 16 hours
    this.restHours = 24 - this.workHours; // Rest for remaining hours
    
    // Timers
    this.shortBreakTimer = null;
    this.dailyRestTimer = null;
    
    // State
    this.sessionStartTime = Date.now();
    this.lastShortBreak = Date.now(); // 🔥 Iniciar con tiempo actual para respetar workDuration
    this.isResting = false;
    this.hasScheduledLogin = false; // 🔥 Flag para evitar múltiples logins
    
    this.log('✅ RestScheduler initialized');
    this.log(`   Short Breaks: ${this.shortBreaksEnabled ? 'ENABLED' : 'DISABLED'}`);
    if (this.shortBreaksEnabled) {
      this.log(`   → Work ${this.workDuration}min, rest ${this.breakDuration}min`);
    }
    this.log(`   Daily Rest: ${this.dailyRestEnabled ? 'ENABLED' : 'DISABLED'}`);
    if (this.dailyRestEnabled) {
      this.log(`   → Work ${this.workHours}h/day, rest ${this.restHours}h/day`);
    }
  }
  
  log(...args) {
    console.log(`[RestScheduler]`, ...args);
  }
  
  /**
   * Start the rest scheduler
   */
  start() {
    this.log('🚀 Starting rest scheduler...');
    
    if (this.shortBreaksEnabled) {
      this.scheduleNextShortBreak();
    }
    
    if (this.dailyRestEnabled) {
      this.scheduleNextDailyRest();
    }
    
    this.log('✅ Rest scheduler started');
  }
  
  /**
   * Schedule the next short break
   */
  scheduleNextShortBreak() {
    if (!this.shortBreaksEnabled) return;
    
    // 🔥 Evitar programar múltiples timers
    if (this.shortBreakTimer) {
      this.log('⚠️ Short break already scheduled, skipping duplicate');
      return;
    }
    
    const workTimeMs = this.workDuration * 60 * 1000;
    
    this.log(`⏰ Next short break scheduled in ${this.workDuration} minutes`);
    
    this.shortBreakTimer = setTimeout(() => {
      this.shortBreakTimer = null; // Limpiar referencia
      this.enqueueShortBreak();
    }, workTimeMs);
  }
  
  /**
   * Schedule the next daily rest
   */
  scheduleNextDailyRest() {
    if (!this.dailyRestEnabled) return;
    
    // 🔥 Evitar programar múltiples timers
    if (this.dailyRestTimer) {
      this.log('⚠️ Daily rest already scheduled, skipping duplicate');
      return;
    }
    
    const workTimeMs = this.workHours * 60 * 60 * 1000;
    
    this.log(`⏰ Daily rest scheduled in ${this.workHours} hours`);
    
    this.dailyRestTimer = setTimeout(() => {
      this.dailyRestTimer = null; // Limpiar referencia
      this.enqueueDailyRest();
    }, workTimeMs);
  }
  
  /**
   * Enqueue a SHORT BREAK node
   */
  enqueueShortBreak() {
    // 🔥 Validación: no encolar si ya estamos en descanso
    if (this.isResting) {
      this.log('⚠️ Already resting, skipping SHORT BREAK enqueue');
      return;
    }
    
    // 🔥 Validación: respetar el tiempo de trabajo mínimo
    const timeSinceLastBreak = Date.now() - this.lastShortBreak;
    const workTimeMs = this.workDuration * 60 * 1000;
    
    if (timeSinceLastBreak < workTimeMs) {
      const remainingTime = Math.ceil((workTimeMs - timeSinceLastBreak) / 60000);
      this.log(`⚠️ Not enough work time, need ${remainingTime} more minutes before break`);
      return;
    }
    
    this.log('😴 Enqueueing SHORT BREAK node...');
    
    const breakDurationMs = this.breakDuration * 60 * 1000;
    
    this.queue.enqueue(
      async () => {
        this.log('💤 [SHORT BREAK NODE] Starting short break...');
        this.isResting = true;
        this.bot.isResting = true;
        
        // Pause all flip operations
        if (this.bot.flipManager) {
          this.log('   ⏸️ Pausing FlipManager...');
          this.bot.flipManager.pause();
        }
        
        // Disconnect from server
        this.log('   🔌 Disconnecting from server...');
        if (this.bot.bot) {
          this.bot.bot.end();
        }
        
        // Wait for break duration
        this.log(`   ⏳ Resting for ${this.breakDuration} minutes...`);
        await delay(breakDurationMs);
        
        // Reconnect to server
        this.log('   🔄 Reconnecting to server...');
        this.hasScheduledLogin = false; // Reset flag antes de reconectar
        await this.bot.reconnect();
        
        // Esperar a que el login se complete
        this.log('   ⏳ Waiting for Skyblock login to complete...');
        await delay(15000); // 15 segundos para login + chunks
        
        // Resume flip operations
        if (this.bot.flipManager) {
          this.log('   ▶️ Resuming FlipManager...');
          this.bot.flipManager.resume();
        }
        
        this.isResting = false;
        this.bot.isResting = false;
        this.lastShortBreak = Date.now(); // 🔥 Actualizar timestamp DESPUÉS del break
        
        this.log('✅ Short break completed, bot resumed');
        
        // Schedule next short break
        this.scheduleNextShortBreak();
        
        return true;
      },
      {
        type: 'shortbreak',
        item: 'Rest Period',
        description: `Short break: ${this.breakDuration} minutes`,
        priority: 5 // Normal priority
      }
    );
  }
  
  /**
   * Enqueue a DAILY REST node
   */
  enqueueDailyRest() {
    // 🔥 Validación: no encolar si ya estamos en descanso
    if (this.isResting) {
      this.log('⚠️ Already resting, skipping DAILY REST enqueue');
      return;
    }
    
    this.log('😴 Enqueueing DAILY REST node...');
    
    const restDurationMs = this.restHours * 60 * 60 * 1000;
    
    this.queue.enqueue(
      async () => {
        this.log('💤 [DAILY REST NODE] Starting daily rest...');
        this.isResting = true;
        this.bot.isResting = true;
        
        // Pause all flip operations
        if (this.bot.flipManager) {
          this.log('   ⏸️ Pausing FlipManager...');
          this.bot.flipManager.pause();
        }
        
        // Disconnect from server
        this.log('   🔌 Disconnecting from server...');
        if (this.bot.bot) {
          this.bot.bot.end();
        }
        
        // Wait for daily rest duration
        this.log(`   ⏳ Resting for ${this.restHours} hours...`);
        await delay(restDurationMs);
        
        // Reconnect to server
        this.log('   🔄 Reconnecting to server...');
        this.hasScheduledLogin = false; // Reset flag antes de reconectar
        await this.bot.reconnect();
        
        // Esperar a que el login se complete
        this.log('   ⏳ Waiting for Skyblock login to complete...');
        await delay(15000);
        
        // Resume flip operations
        if (this.bot.flipManager) {
          this.log('   ▶️ Resuming FlipManager...');
          this.bot.flipManager.resume();
        }
        
        this.isResting = false;
        this.bot.isResting = false;
        this.sessionStartTime = Date.now(); // Reset session
        
        this.log('✅ Daily rest completed, bot resumed');
        
        // Schedule next daily rest
        this.scheduleNextDailyRest();
        
        return true;
      },
      {
        type: 'dailyrest',
        item: 'Daily Rest',
        description: `Daily rest: ${this.restHours} hours`,
        priority: 5 // Normal priority
      }
    );
  }
  
  /**
   * Enqueue a RESET node (critical priority)
   * Used when critical messages are detected (limbo, restart, etc.)
   */
  enqueueReset(reason = 'Critical message detected') {
    this.log(`🚨 Enqueueing RESET node (reason: ${reason})...`);
    
    this.queue.enqueue(
      async () => {
        this.log('🔄 [RESET NODE] Starting emergency reset...');
        this.isResting = true;
        this.bot.isResting = true;
        
        // Pause all flip operations
        if (this.bot.flipManager) {
          this.log('   ⏸️ Pausing FlipManager...');
          this.bot.flipManager.pause();
        }
        
        // Disconnect from server
        this.log('   🔌 Disconnecting from server...');
        if (this.bot.bot) {
          this.bot.bot.end();
        }
        
        // Wait before reconnecting (30 seconds)
        this.log('   ⏳ Waiting 30 seconds before reconnect...');
        await delay(30000);
        
        // Reconnect to server
        this.log('   🔄 Reconnecting to server...');
        this.hasScheduledLogin = false; // Reset flag
        await this.bot.reconnect();
        
        // Esperar a que el login se complete
        this.log('   ⏳ Waiting for Skyblock login to complete...');
        await delay(15000);
        
        // Resume flip operations
        if (this.bot.flipManager) {
          this.log('   ▶️ Resuming FlipManager...');
          this.bot.flipManager.resume();
        }
        
        this.isResting = false;
        this.bot.isResting = false;
        
        this.log('✅ Reset completed, bot resumed');
        
        return true;
      },
      {
        type: 'reset',
        item: 'Emergency Reset',
        description: reason,
        priority: 1 // MAXIMUM PRIORITY - executes ASAP
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
      sessionDuration: Math.floor(sessionDuration / 1000), // seconds
      nextShortBreak: nextShortBreak ? Math.floor(nextShortBreak / 1000) : null,
      lastShortBreak: this.lastShortBreak
    };
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.log('🧹 Destroying RestScheduler...');
    
    if (this.shortBreakTimer) {
      clearTimeout(this.shortBreakTimer);
      this.shortBreakTimer = null;
    }
    
    if (this.dailyRestTimer) {
      clearTimeout(this.dailyRestTimer);
      this.dailyRestTimer = null;
    }
    
    this.log('✅ RestScheduler destroyed');
  }
}

module.exports = RestScheduler;
