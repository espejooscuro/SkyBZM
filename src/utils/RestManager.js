/**
 * RestManager - Manages bot rest schedules
 * Handles short breaks and daily rest periods
 */

class RestManager {
  constructor(botManager, config) {
    this.botManager = botManager;
    this.config = config || {
      shortBreaks: { enabled: false, workDuration: 60, breakDuration: 5 },
      dailyRest: { enabled: false, workHours: 16 }
    };
    
    this.isResting = false;
    this.mode = 'Working';
    this.shortBreakTimer = null;
    this.dailyRestTimer = null;
    this.dailyStartTime = Date.now();
    this.lastShortBreakTime = Date.now();
    this.nextBreakTime = null;
    this.dailyRestStartTime = null;
  }

  start() {
    console.log('🌙 RestManager: Starting rest schedule system');
    this.dailyStartTime = Date.now();
    this.lastShortBreakTime = Date.now();
    
    if (this.config.shortBreaks?.enabled) {
      this.scheduleShortBreak();
    }
    
    if (this.config.dailyRest?.enabled) {
      this.scheduleDailyRest();
    }
  }

  stop() {
    console.log('🛑 RestManager: Stopping rest schedule system');
    this.clearTimers();
  }

  clearTimers() {
    if (this.shortBreakTimer) {
      clearTimeout(this.shortBreakTimer);
      this.shortBreakTimer = null;
    }
    if (this.dailyRestTimer) {
      clearTimeout(this.dailyRestTimer);
      this.dailyRestTimer = null;
    }
  }

  updateConfig(newConfig) {
    console.log('🔄 RestManager: Updating configuration');
    this.config = newConfig;
    this.clearTimers();
    
    // Reset timers if currently working
    if (!this.isResting) {
      this.lastShortBreakTime = Date.now();
      this.dailyStartTime = Date.now();
      
      if (this.config.shortBreaks?.enabled) {
        this.scheduleShortBreak();
      }
      
      if (this.config.dailyRest?.enabled) {
        this.scheduleDailyRest();
      }
    }
  }

  scheduleShortBreak() {
    if (!this.config.shortBreaks?.enabled) return;
    
    const workDurationMs = this.config.shortBreaks.workDuration * 60 * 1000;
    const timeSinceLastBreak = Date.now() - this.lastShortBreakTime;
    const timeUntilBreak = Math.max(0, workDurationMs - timeSinceLastBreak);
    
    this.nextBreakTime = Date.now() + timeUntilBreak;
    
    this.shortBreakTimer = setTimeout(() => {
      this.takeShortBreak();
    }, timeUntilBreak);
    
    console.log(`⏰ Next short break in ${Math.round(timeUntilBreak / 60000)} minutes`);
  }

  scheduleDailyRest() {
    if (!this.config.dailyRest?.enabled) return;
    
    const workHoursMs = this.config.dailyRest.workHours * 60 * 60 * 1000;
    const timeWorked = Date.now() - this.dailyStartTime;
    const timeUntilRest = Math.max(0, workHoursMs - timeWorked);
    
    this.dailyRestTimer = setTimeout(() => {
      this.takeDailyRest();
    }, timeUntilRest);
    
    console.log(`🌙 Daily rest scheduled in ${Math.round(timeUntilRest / 3600000)} hours`);
  }

  async takeShortBreak() {
    if (this.isResting) return;
    
    this.isResting = true;
    this.mode = 'Short Break';
    const breakDuration = this.config.shortBreaks.breakDuration;
    
    console.log(`\n😴 ====== SHORT BREAK STARTED ======`);
    console.log(`⏱️  Duration: ${breakDuration} minutes`);
    console.log(`====================================\n`);
    
    // Stop all bots
    await this.stopAllBots();
    
    // Wait for break duration
    await this.sleep(breakDuration * 60 * 1000);
    
    console.log(`\n🔋 ====== SHORT BREAK ENDED ======`);
    console.log(`✅ Resuming work...`);
    console.log(`===================================\n`);
    
    // Resume all bots
    await this.startAllBots();
    
    this.isResting = false;
    this.mode = 'Working';
    this.lastShortBreakTime = Date.now();
    
    // Schedule next short break
    if (this.config.shortBreaks?.enabled) {
      this.scheduleShortBreak();
    }
  }

  async takeDailyRest() {
    if (this.isResting) return;
    
    this.isResting = true;
    this.mode = 'Daily Rest';
    const workHours = this.config.dailyRest.workHours;
    const restHours = 24 - workHours;
    
    console.log(`\n🌙 ====== DAILY REST STARTED ======`);
    console.log(`💤 Worked: ${workHours} hours`);
    console.log(`⏱️  Resting: ${restHours} hours`);
    console.log(`===================================\n`);
    
    // Stop all bots
    await this.stopAllBots();
    
    // Clear short break timer during daily rest
    if (this.shortBreakTimer) {
      clearTimeout(this.shortBreakTimer);
      this.shortBreakTimer = null;
    }
    
    // Wait for rest duration
    this.dailyRestStartTime = Date.now();
    await this.sleep(restHours * 60 * 60 * 1000);
    
    console.log(`\n☀️ ====== DAILY REST ENDED ======`);
    console.log(`✅ Starting new work day...`);
    console.log(`==================================\n`);
    
    // Resume all bots
    await this.startAllBots();
    
    this.isResting = false;
    this.mode = 'Working';
    this.dailyStartTime = Date.now();
    this.lastShortBreakTime = Date.now();
    this.dailyRestStartTime = null;
    
    // Reschedule both timers for new day
    if (this.config.shortBreaks?.enabled) {
      this.scheduleShortBreak();
    }
    if (this.config.dailyRest?.enabled) {
      this.scheduleDailyRest();
    }
  }

  async stopAllBots() {
    console.log('🛑 Stopping all bots for rest...');
    const stopPromises = [];
    
    for (const [username, bot] of this.botManager.bots.entries()) {
      if (bot && bot.bot) {
        console.log(`  ⏸️  Stopping bot: ${username}`);
        stopPromises.push(
          this.botManager.stopBot(username).catch(err => {
            console.error(`  ❌ Error stopping ${username}:`, err.message);
          })
        );
      }
    }
    
    await Promise.all(stopPromises);
    console.log('✅ All bots stopped');
  }

  async startAllBots() {
    console.log('🚀 Starting all bots after rest...');
    
    // Get config to check which bots should auto-start
    const fs = require('fs');
    const configPath = this.botManager.configPath;
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ Config file not found');
      return;
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const startPromises = [];
    
    for (const account of config.accounts) {
      // Only start bots that were running before rest or have autoStart enabled
      if (account.autoStart || this.botManager.bots.has(account.username)) {
        console.log(`  ▶️  Starting bot: ${account.username}`);
        startPromises.push(
          this.botManager.startBot(account.username).catch(err => {
            console.error(`  ❌ Error starting ${account.username}:`, err.message);
          })
        );
      }
    }
    
    await Promise.all(startPromises);
    console.log('✅ All bots started');
  }

  getStatus() {
    const status = {
      mode: this.mode,
      nextBreak: '--',
      dailyCycle: '--'
    };
    
    // Calculate next break time
    if (this.config.shortBreaks?.enabled && !this.isResting && this.mode !== 'Daily Rest') {
      if (this.nextBreakTime) {
        const minutesUntilBreak = Math.round((this.nextBreakTime - Date.now()) / 60000);
        if (minutesUntilBreak > 0) {
          status.nextBreak = `${minutesUntilBreak} minutes`;
        } else {
          status.nextBreak = 'Soon...';
        }
      }
    } else if (this.mode === 'Short Break') {
      const breakEnd = this.lastShortBreakTime + (this.config.shortBreaks.breakDuration * 60 * 1000);
      const minutesRemaining = Math.round((breakEnd - Date.now()) / 60000);
      status.nextBreak = `Resting (${minutesRemaining}m remaining)`;
    }
    
    // Calculate daily cycle progress
    if (this.config.dailyRest?.enabled) {
      if (this.mode === 'Daily Rest' && this.dailyRestStartTime) {
        const restHours = 24 - this.config.dailyRest.workHours;
        const restEnd = this.dailyRestStartTime + (restHours * 60 * 60 * 1000);
        const hoursRemaining = Math.round((restEnd - Date.now()) / 3600000);
        status.dailyCycle = `Resting (${hoursRemaining}h remaining)`;
      } else {
        const hoursWorked = Math.round((Date.now() - this.dailyStartTime) / 3600000);
        const workHours = this.config.dailyRest.workHours;
        status.dailyCycle = `${hoursWorked}h / ${workHours}h worked`;
      }
    }
    
    return status;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = RestManager;
