











const TaskQueue = require('../utils/TaskQueue');
const Flip = require('./Flip');
const NPCFlip = require('./NPCflip');
const CoflAPI = require('../utils/CoflAPI');
const ChatListener = require('../events/ChatListener');
const fs = require('fs');
const path = require('path');

function cleanChatText(text) {
  return text.replace(/§[0-9a-fklmnor]/gi, '').toLowerCase().trim();
}

class FlipManager {
  constructor(bot, accountConfig = {}, sharedQueue = null) {
    this.bot = bot;
    this.username = accountConfig.username || (bot && bot.username) || 'Unknown';
    
    // 🔥 Ruta al config.json para guardar el estado
    this.configPath = path.join(process.cwd(), 'config.json');
    
    // 🔥 Use shared queue if provided, otherwise create a new one
    if (sharedQueue) {
      this.log(`✅ Using shared TaskQueue from Bot`);
      this.queue = sharedQueue;
      // Set the save callback on the shared queue
      sharedQueue.onSaveState = (queueState) => {
        this.saveStateToConfig(queueState);
      };
    } else {
      this.log(`⚠️ Creating new TaskQueue (no shared queue provided)`);
      this.queue = new TaskQueue((queueState) => {
        this.saveStateToConfig(queueState);
      });
    }

    // accountConfig now contains the config directly from Bot.js
    // which passes maxBuyPrice, minProfit, etc. as direct properties
    
    this.api = new CoflAPI(
      accountConfig.apiUrl,
      accountConfig.maxBuyPrice,
      accountConfig.minProfit,
      accountConfig.minVolume,
      accountConfig.blacklistContaining || []
    );

    this.sellTimeout = accountConfig.sellTimeout || 300_000;
    this.purse = accountConfig.purse || 40_000_000;
    this.defaultSpread = accountConfig.defaultSpread || 0.05;

    // New flip settings
    this.maxFlips = accountConfig.maxFlips || 7;
    this.maxRelist = accountConfig.maxRelist || 3;
    this.maxBuyRelist = accountConfig.maxBuyRelist || 3;
    this.whitelist = accountConfig.whitelist || [];
    
    // New order size and spread filters
    this.minOrder = accountConfig.minOrder || 1;
    this.maxOrder = accountConfig.maxOrder || 10000;
    this.minSpread = accountConfig.minSpread || 0; // Minimum spread percentage (0-100+)

    this.flips = [];
    
    // Activity logs for web panel
    this.activityLogs = [];
    this.maxLogs = 50; // Keep last 50 logs
    
    // Profit tracking for charts
    this.profitHistory = []; // Array of { timestamp, profit, itemTag, item }
    this.maxProfitHistory = 100; // Keep last 100 profit records
    
    // 🔥 NEW: Money flow tracking for fourth chart
    this.moneyFlowHistory = []; // Array of { timestamp, amount, type, itemTag, item }
    this.maxMoneyFlowHistory = 200; // Keep last 200 transactions
    
    this.amount = null;

    if (bot && typeof bot.on === 'function') {
      this.chatListener = new ChatListener(bot, { 
        callback: (msg) => this.onChatMessage(msg) 
      });
    } else {
      this.chatListener = null;
      console.log(`[${this.username}] ChatListener disabled (no bot provided)`);
    }

    this.log(`💰 Purse: ${this.purse.toLocaleString()}`);
    
    // Try to load previous state
    this.loadState();
  }

  log(...args) {
    console.log(`[${this.username}][FlipManager]`, ...args);
  }

  // 🔥 Guardar estado en config.json
  saveStateToConfig(queueState = null) {
    try {
      // Leer config.json actual
      if (!fs.existsSync(this.configPath)) {
        this.log(`⚠️ config.json not found, cannot save state`);
        return;
      }
      
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Encontrar el índice de esta cuenta
      const accountIndex = config.accounts.findIndex(acc => acc.username === this.username);
      
      if (accountIndex === -1) {
        this.log(`⚠️ Account ${this.username} not found in config.json`);
        return;
      }
      
      // Crear objeto de estado
      const state = {
        timestamp: Date.now(),
        amount: this.amount,
        purse: this.purse,
        flips: this.flips.map(flip => flip.serialize ? flip.serialize() : {
          itemTag: flip.itemTag,
          item: flip.item,
          active: flip.active,
          bought: flip.bought,
          buyFilled: flip.buyFilled,
          sellExecuted: flip.sellExecuted,
          orderFilled: flip.orderFilled,
          flipFinished: flip.flipFinished,
          instaBuyPrice: flip.instaBuyPrice,
          instaSellPrice: flip.instaSellPrice,
          amountToBuy: flip.amountToBuy,
          buyRelistCounter: flip.buyRelistCounter,
          relistCounter: flip.relistCounter,
          moneyPerFlip: flip.maxSpend,
          startTime: flip.startTime
        }),
        activityLogs: this.activityLogs,
        profitHistory: this.profitHistory,
        moneyFlowHistory: this.moneyFlowHistory, // 🔥 NEW
        queueState: queueState || this.queue.getState()
      };
      
      // Guardar estado en la cuenta
      config.accounts[accountIndex].state = state;
      
      // Escribir config.json actualizado
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    } catch (error) {
      this.log(`❌ Error saving state to config.json: ${error.message}`);
    }
  }

  // 🔥 Cargar estado desde config.json
  loadStateFromConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.log(`📂 config.json not found`);
        return false;
      }
      
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Encontrar esta cuenta
      const account = config.accounts.find(acc => acc.username === this.username);
      
      if (!account || !account.state) {
        this.log(`📂 No previous state found for ${this.username}`);
        return false;
      }
      
      const state = account.state;
      
      // Verificar que el estado no sea muy antiguo (max 24 horas)
      const stateAge = Date.now() - state.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (stateAge > maxAge) {
        this.log(`⚠️ State is too old (${Math.floor(stateAge / 3600000)}h), ignoring`);
        this.clearStateFromConfig();
        return false;
      }
      
      this.log(`📂 Loading previous state from ${new Date(state.timestamp).toLocaleString()}`);
      
      // Restaurar logs y profit history
      this.activityLogs = state.activityLogs || [];
      this.profitHistory = state.profitHistory || [];
      this.moneyFlowHistory = state.moneyFlowHistory || []; // 🔥 NEW
      this.amount = state.amount;
      
      this.log(`✅ Restored ${this.activityLogs.length} activity logs`);
      this.log(`✅ Restored ${this.profitHistory.length} profit records`);
      this.log(`✅ Restored ${this.moneyFlowHistory.length} money flow transactions`); // 🔥 NEW
      
      // Guardar flips para restaurar después
      if (state.flips && state.flips.length > 0) {
        this.log(`🔄 Found ${state.flips.length} flips in saved state`);
        this.savedFlipStates = state.flips;
        this.savedQueueState = state.queueState;
        this.log(`💡 Call resumeFlips() after bot connects to continue`);
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Error loading state from config.json: ${error.message}`);
      return false;
    }
  }

  // 🔥 Limpiar estado de config.json
  clearStateFromConfig() {
    try {
      if (!fs.existsSync(this.configPath)) {
        return;
      }
      
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      
      const accountIndex = config.accounts.findIndex(acc => acc.username === this.username);
      
      if (accountIndex !== -1 && config.accounts[accountIndex].state) {
        delete config.accounts[accountIndex].state;
        fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
        this.log(`🗑️ State cleared from config.json`);
      }
    } catch (error) {
      this.log(`❌ Error clearing state: ${error.message}`);
    }
  }

  // Métodos alias para simplificar llamadas
  saveState() {
    this.saveStateToConfig();
  }

  loadState() {
    return this.loadStateFromConfig();
  }

  clearState() {
    this.clearStateFromConfig();
  }
  
  // Pausar el FlipManager (detener la cola sin perder estado)
  pause() {
    this.log(`⏸️ Pausing FlipManager...`);
    
    // Pausar la cola de tareas
    this.queue.pause();
    
    // Pausar todos los timers de los flips activos
    this.flips.forEach(flip => {
      if (flip.sellTimer) {
        clearTimeout(flip.sellTimer);
        flip.sellTimer = null;
      }
      if (flip.priceWatcher) {
        clearInterval(flip.priceWatcher);
        flip.priceWatcher = null;
      }
    });
    
    // Guardar estado actual
    this.saveStateToConfig();
    
    this.log(`✅ FlipManager paused, state saved`);
  }
  
  // Reanudar el FlipManager
  resume() {
    this.log(`▶️ Resuming FlipManager...`);
    
    // Reanudar la cola
    this.queue.resume();
    
    // Reactivar price watchers de flips activos
    this.flips.forEach(flip => {
      if (flip.active && !flip.flipFinished) {
        if (!flip.sellExecuted && !flip.priceWatcher) {
          flip.startPriceWatcher();
        }
      }
    });
    
    this.log(`✅ FlipManager resumed`);
  }

  // Filter flips based on order size and spread percentage
  // Returns: { pass: boolean, adjustedMoneyPerFlip: number }
  filterFlipByOrderAndSpread(flipData, moneyPerFlip) {
    const { buyPrice, sellPrice, item, itemTag } = flipData;
    
    const itemName = item || itemTag;
    
    // Calculate spread percentage (profit margin)
    // spread = (sellPrice - buyPrice) / buyPrice * 100
    const spread = ((buyPrice - sellPrice) / sellPrice) * 100;
    
    // Check if spread meets minimum requirement
    if (spread < this.minSpread) {
      this.log(`  ❌ ${itemName}: Spread ${spread.toFixed(2)}% < ${this.minSpread}%`);
      return { pass: false, adjustedMoneyPerFlip: moneyPerFlip };
    }
    
    // Calculate how many items the bot will actually buy
    // This mimics the logic from Flip.calculateAmount()
    const volumeFactor = Math.min(Number(flipData.volume || flipData.demand || 1) / 100_000, 1);
    const spreadFactor = 1 + (1 - volumeFactor) * this.defaultSpread;
    const instaBuyPrice = Number(sellPrice) || 1; // sellPrice is instaBuyPrice in the API
    let amountToBuy = Math.max(1, Math.floor((moneyPerFlip / instaBuyPrice) / spreadFactor));
    let adjustedMoneyPerFlip = moneyPerFlip;
    
    // Check if the calculated order amount is within limits
    if (amountToBuy < this.minOrder) {
      this.log(`  ❌ ${itemName}: Order amount ${amountToBuy} < ${this.minOrder}`);
      return { pass: false, adjustedMoneyPerFlip: moneyPerFlip };
    }
    
    // If order is too large, adjust money to buy exactly maxOrder items
    if (amountToBuy > this.maxOrder) {
      this.log(`  ⚠️ ${itemName}: Order amount ${amountToBuy} > ${this.maxOrder}, adjusting budget...`);
      
      // Calculate how much money we need to buy exactly maxOrder items
      adjustedMoneyPerFlip = this.maxOrder * instaBuyPrice * spreadFactor;
      amountToBuy = this.maxOrder;
      
      this.log(`  ✅ ${itemName}: Adjusted to ${amountToBuy} items with budget ${adjustedMoneyPerFlip.toLocaleString()}`);
    }
    
    this.log(`  ✅ ${itemName}: Spread ${spread.toFixed(2)}% > ${this.minSpread}%, Order ${amountToBuy} items`);
    return { pass: true, adjustedMoneyPerFlip };
  }

  async buildFlips(amount = this.maxFlips, retryCount = 0) {
    const maxRetries = 10;
    
    this.log(`🔨 Building ${amount} flips... ${retryCount > 0 ? `(Retry ${retryCount}/${maxRetries})` : ''}`);
    
    const flipsData = await this.api.getSortedFlips();
    let selectedFlips = [];
    
    // Calculate money per flip for filtering
    const moneyPerFlip = this.purse / amount;

    // 1️⃣ If whitelist exists
    if (this.whitelist.length > 0) {
      const whitelistFlips = [];

      for (const w of this.whitelist) {
        let snapshot = null;

        this.log(`Processing whitelist item: ${w}`);
        const tag = typeof w === "string" ? w : w.itemTag;
        
        try {
          snapshot = await this.api.getBazaarSnapshot(tag);

          const flipData = {
            itemTag: tag,
            item: snapshot.item,
            buyPrice: snapshot.buyPrice,
            sellPrice: snapshot.sellPrice,
            buyVolume: snapshot.buyVolume,
            sellVolume: snapshot.sellVolume,
            volume: snapshot.buyVolume,
            demand: snapshot.buyVolume
          };

          // Apply order and spread filters
          const filterResult = this.filterFlipByOrderAndSpread(flipData, moneyPerFlip);
          if (filterResult.pass) {
            flipData.adjustedMoneyPerFlip = filterResult.adjustedMoneyPerFlip;
            whitelistFlips.push(flipData);
          }
        } catch (err) {
          this.log(`⚠️ Error fetching whitelist item ${tag}:`, err.message);
        }
      }

      if (whitelistFlips.length >= amount) {
        selectedFlips = whitelistFlips.slice(0, amount);
      } else {
        selectedFlips = [...whitelistFlips];

        const remaining = amount - selectedFlips.length;

        // Fill with normal flips excluding whitelist
        const random = this.api.getRandomSafeFlips(flipsData, remaining * 3); // Get more candidates
        
        for (const f of random) {
          if (selectedFlips.length >= amount) break;
          
          if (whitelistFlips.some(w => w.itemTag === f.itemTag)) continue;
          
          const filterResult = this.filterFlipByOrderAndSpread(f, moneyPerFlip);
          if (filterResult.pass) {
            f.adjustedMoneyPerFlip = filterResult.adjustedMoneyPerFlip;
            selectedFlips.push(f);
          }
        }
      }
    } else {
      // No whitelist → normal behavior
      const candidates = this.api.getRandomSafeFlips(flipsData, amount * 3); // Get more candidates
      
      for (const f of candidates) {
        if (selectedFlips.length >= amount) break;
        
        const filterResult = this.filterFlipByOrderAndSpread(f, moneyPerFlip);
        if (filterResult.pass) {
          f.adjustedMoneyPerFlip = filterResult.adjustedMoneyPerFlip;
          selectedFlips.push(f);
        }
      }
    }
    
    // 🔄 If no flips found, retry with fresh data
    if (selectedFlips.length === 0) {
      if (retryCount < maxRetries) {
        this.log(`⚠️ No flips passed filters, retrying with fresh API data... (${retryCount + 1}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Retry recursively
        return this.buildFlips(amount, retryCount + 1);
      } else {
        this.log(`❌ Max retries reached (${maxRetries}), no suitable flips found`);
        this.log(`💡 Suggestion: Lower your minSpread (${this.minSpread}%) or increase maxOrder (${this.maxOrder})`);
        return;
      }
    }

    // 🔀 Shuffle final flip order (Fisher-Yates)
    for (let i = selectedFlips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedFlips[i], selectedFlips[j]] = [selectedFlips[j], selectedFlips[i]];
    }

    this.amount = selectedFlips.length;

    this.log(`💵 Base money per flip: ${moneyPerFlip.toLocaleString()}`);

    // Create flips with adjusted budgets
    this.flips = selectedFlips.map(f => {
      const budget = f.adjustedMoneyPerFlip || moneyPerFlip;
      return this.createFlip(f, budget);
    });
    
    this.log(`✅ ${this.flips.length} flips created successfully`);
    
    // Save state after building flips
    this.saveState();
  }

  createFlip(flipData, moneyPerFlip) {
    const flip = new Flip(
      this.bot,
      this.chatListener,
      flipData,
      this.queue,
      this.api,
      this.sellTimeout,
      moneyPerFlip,
      this.defaultSpread,
      this.maxRelist,
      this.maxBuyRelist
    );

    flip.onFinish = (endedByTimeout) => {
      if (endedByTimeout) {
        this.log(`Flip for ${flip.item} ended by timeout, creating a different flip.`);
        this.createNextFlipDifferent(flip);
      } else {
        this.log(`Flip for ${flip.item} finished normally, creating a new flip with same values.`);
        this.createNextFlipSame(flip);
      }
      
      // Guardar estado después de finalizar
      this.saveState();
    };
    
    // 🔥 Conectar callback para guardar estado cuando el flip cambia
    flip.onStateChange = () => {
      this.saveState();
    };

    return flip;
  }

  /**
   * Initialize flips from bot configuration
   * Supports multiple flip types: SELL_ORDER, NPC, KAT, FORGE, CRAFT
   */
  async initializeFlipsFromConfig(flipConfigs = []) {
    if (!flipConfigs || flipConfigs.length === 0) {
      this.log('No flip configurations provided');
      return;
    }
    
    this.log(`🎯 Initializing ${flipConfigs.length} flip configurations...`);
    
    for (const config of flipConfigs) {
      const flipType = (config.type || 'SELL_ORDER').toUpperCase();
      
      try {
        switch (flipType) {
          case 'NPC':
            await this.initializeNPCFlip(config);
            break;
          
          case 'SELL_ORDER':
            break;
          
          case 'KAT':
          case 'FORGE':
          case 'CRAFT':
            this.log(`  ⚠️ ${flipType} flip type not yet implemented`);
            break;
          
          default:
            this.log(`  ⚠️ Unknown flip type: ${flipType}`);
        }
      } catch (error) {
        this.log(`  ❌ Error initializing ${flipType} flip:`, error.message);
      }
    }
    
    this.log(`✅ Flip initialization complete`);
  }

  /**
   * Initialize an NPC Flip
   */
  async initializeNPCFlip(config) {
    if (!config.enabled) {
      this.log('  ⏭️ NPC Flip is disabled, skipping...');
      return;
    }
    
    if (!config.item && !config.npcItem) {
      this.log('  ⚠️ NPC Flip has no item configured, skipping...');
      return;
    }
    
    
    // Create NPC flip with all required parameters
    const npcFlip = new NPCFlip(
      this.bot,
      this.chatListener,
      config,
      this.queue,
      this.api
    );
    
    this.flips.push(npcFlip);
    
    // Wait for item name to be fetched before starting
    await npcFlip.start();
  }

  /**
   * Start execution loop for NPC Flip
   * @deprecated - NPCFlip now manages its own loop via start()
   */
  async startNPCFlipLoop(npcFlip) {
    // This method is no longer needed, keeping for backwards compatibility
    this.log('⚠️ startNPCFlipLoop is deprecated, NPCFlip manages its own loop');
  }

  // Obtener flips activos en fase de compra
  getActiveFlipsInBuy() {
    return this.flips.filter(f => f.active && !f.flipFinished);
  }
  
  // Verificar si se puede crear un nuevo flip
  canCreateNewFlipInBuy() {
    const activeInBuy = this.getActiveFlipsInBuy().length;
    const canCreate = activeInBuy < this.maxFlips;
    
    if (!canCreate) {
      this.log(`⚠️ Cannot create new flip: ${activeInBuy}/${this.maxFlips} flips active in buy phase`);
    }
    
    return canCreate;
  }

  async createNextFlipSame(oldFlip) {
    // 🔥 CHECK 1: Verify we have space in BUY phase
    if (!this.canCreateNewFlipInBuy()) {
      this.log(`  ❌ Max buy slots reached (${this.maxFlips}), waiting for flips to complete...`);
      return;
    }
    
    // 🔥 CHECK 2: Verify this item isn't already being flipped
    const existingFlip = this.flips.find(f => 
      f.itemTag === oldFlip.itemTag && 
      f.active && 
      !f.flipFinished
    );
    
    if (existingFlip) {
      this.log(`  ⚠️ Item ${oldFlip.item} is already being flipped, creating different flip instead...`);
      return this.createNextFlipDifferent(oldFlip);
    }
    
    const moneyPerFlip = this.purse / this.amount;
    
    try {
      // Fetch fresh snapshot from API to get current prices
      const snapshot = await this.api.getBazaarSnapshot(oldFlip.itemTag);
      
      const newFlipData = {
        item: snapshot.item,
        itemTag: oldFlip.itemTag,
        sellPrice: Number(snapshot.sellPrice), // instaBuyPrice
        buyPrice: Number(snapshot.buyPrice),   // instaSellPrice
        buyVolume: snapshot.buyVolume,
        sellVolume: snapshot.sellVolume,
        volume: snapshot.buyVolume,
        demand: snapshot.buyVolume
      };

      // ✅ Apply order and spread filters for same flip
      const filterResult = this.filterFlipByOrderAndSpread(newFlipData, moneyPerFlip);
      
      if (!filterResult.pass) {
        this.log(`  ⚠️ Same item ${oldFlip.item} no longer meets filter requirements`);
        this.log(`   Falling back to different flip...`);
        this.log('═══════════════════════════════════════════════════');
        return this.createNextFlipDifferent(oldFlip);
      }
      
      newFlipData.adjustedMoneyPerFlip = filterResult.adjustedMoneyPerFlip;

      this.log(`  → Buy: ${newFlipData.sellPrice.toFixed(1)} | Sell: ${newFlipData.buyPrice.toFixed(1)}`);

      const budget = newFlipData.adjustedMoneyPerFlip || moneyPerFlip;
      const newFlip = this.createFlip(newFlipData, budget);
      this.flips.push(newFlip);
      newFlip.buy();
    } catch (err) {
      this.log(`❌ Error creating next flip (same): ${err.message}`);
      this.log(`   Falling back to different flip...`);
      // If same flip fails, try different
      this.createNextFlipDifferent(oldFlip);
    }
  }

  async createNextFlipDifferent(oldFlip, retryCount = 0) {
    const maxRetries = 10; // Maximum number of retries to avoid infinite loops

    
    // 🔥 CHECK: Verify we have space in BUY phase
    if (!this.canCreateNewFlipInBuy()) {
      this.log(`  ❌ Max buy slots reached (${this.maxFlips}), waiting for flips to complete...`);
      return;
    }
    
    const moneyPerFlip = this.purse / this.amount;
    let nextFlipData = null;

    // Helper to check if itemTag is currently active (bought but not finished)
    const isCurrentlyActive = (tag) => this.flips.some(f => 
      f.itemTag === tag && f.active && !f.flipFinished
    );

    // 1️⃣ Priority: whitelist
    if (this.whitelist.length > 0) {
      
      // Filter whitelist: exclude oldFlip and currently active flips
      const availableWhitelist = this.whitelist.filter(tag => 
        tag !== oldFlip.itemTag && !isCurrentlyActive(tag)
      );

      this.log(`  → Available whitelist items: ${availableWhitelist.length}`);

      if (availableWhitelist.length > 0) {
        // Try multiple whitelist items until one passes filters
        for (const tag of availableWhitelist) {
          try {
            this.log(`  → Checking whitelist item: ${tag}`);
            
            const snapshot = await this.api.getBazaarSnapshot(tag);

            const candidateFlip = {
              itemTag: tag,
              item: snapshot.item,
              buyPrice: Number(snapshot.buyPrice),
              sellPrice: Number(snapshot.sellPrice),
              buyVolume: snapshot.buyVolume,
              sellVolume: snapshot.sellVolume,
              volume: snapshot.buyVolume,
              demand: snapshot.buyVolume
            };
            
            // ✅ Apply order and spread filters
            const filterResult = this.filterFlipByOrderAndSpread(candidateFlip, moneyPerFlip);
            
            if (filterResult.pass) {
              candidateFlip.adjustedMoneyPerFlip = filterResult.adjustedMoneyPerFlip;
              nextFlipData = candidateFlip;
              this.log(`  ✅ Whitelist item fetched: ${snapshot.item}`);
              break; // Found a valid whitelist item, stop searching
            }
          } catch (err) {
            this.log(`  ⚠️ Whitelist item ${tag} not found in API: ${err.message}`);
          }
        }
        
        if (!nextFlipData) {
          this.log(`  ⚠️ No whitelist items passed filters, falling back to normal flips`);
        }
      } else {
        this.log(`  ⚠️ No available whitelist items (all are active or same as previous)`);
      }
    }

    // 2️⃣ If no valid whitelist, use normal flips with filters
    if (!nextFlipData) {
      this.log(`  🔍 Fetching flips from API with filters...`);
      
      try {
        const flipsData = await this.api.getSortedFlips();
        this.log(`  → API returned ${flipsData.length} flips`);
        
        // Apply filters: exclude oldFlip and currently active flips
        const candidates = this.api.getRandomSafeFlips(flipsData, 50) // Get more candidates for better filtering
          .filter(f => f.itemTag !== oldFlip.itemTag && !isCurrentlyActive(f.itemTag));
        
        this.log(`  → After excluding active: ${candidates.length} candidates`);
        
        const available = [];
        for (const f of candidates) {
          const filterResult = this.filterFlipByOrderAndSpread(f, moneyPerFlip);
          if (filterResult.pass) {
            f.adjustedMoneyPerFlip = filterResult.adjustedMoneyPerFlip;
            available.push(f);
          }
          if (available.length >= 10) break; // Stop after finding 10 valid flips
        }

        this.log(`  → After filtering: ${available.length} available flips`);

        if (available.length === 0) {
          // 🔄 No flips found, retry with fresh data
          if (retryCount < maxRetries) {
            this.log(`  ⚠️ No flips passed filters, retrying with fresh API data... (${retryCount + 1}/${maxRetries})`);
            
            // Wait a bit before retrying to avoid hammering the API
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Retry recursively
            return this.createNextFlipDifferent(oldFlip, retryCount + 1);
          } else {
            this.log(`  ❌ Max retries reached (${maxRetries}), no suitable flips found`);
            this.log(`  💡 Suggestion: Lower your minSpread (${this.minSpread}%) or increase maxOrder (${this.maxOrder})`);
            return;
          }
        }

        // Pick random from available
        nextFlipData = available[Math.floor(Math.random() * available.length)];
        this.log(`  ✅ Selected: ${nextFlipData.item || nextFlipData.itemTag}`);
      } catch (err) {
        this.log(`  ❌ Error fetching flips from API: ${err.message}`);
        
        // Retry on API error
        if (retryCount < maxRetries) {
          this.log(`  ⚠️ API error, retrying... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return this.createNextFlipDifferent(oldFlip, retryCount + 1);
        }
        
        return;
      }
    }

    // 3️⃣ Create flip and add it
    if (nextFlipData) {
      this.log(`  🚀 Creating new flip for ${nextFlipData.item || nextFlipData.itemTag}...`);
      
      const budget = nextFlipData.adjustedMoneyPerFlip || moneyPerFlip;
      const newFlip = this.createFlip(nextFlipData, budget);
      this.flips.push(newFlip);
      
      this.log(`  ✅ New flip created, starting buy...`);
      this.log(`  📊 Current buy slots: ${this.getActiveFlipsInBuy().length}/${this.maxFlips}`);
      this.log('═══════════════════════════════════════════════════');
      newFlip.buy();
    }
  }

  onChatMessage(record) {
    const text = cleanChatText(record.message);
    const originalMessage = record.message.replace(/§[0-9a-fklmnor]/gi, ''); // Keep original formatting but clean color codes

    // Detect important messages and add to activity logs
    
    // "[Bazaar] Claimed 1x Wet Book worth 380,000 coins bought for 380,000 each!"
    const claimedMatch = originalMessage.match(/\[Bazaar\] Claimed (\d+)x? (.+?) worth ([\d,]+) coins bought for ([\d,\.]+) each!/i);
    if (claimedMatch) {
      const amount = parseInt(claimedMatch[1]);
      const itemName = claimedMatch[2].trim();
      const totalValue = parseInt(claimedMatch[3].replace(/,/g, ''));
      const itemTag = this.flips.find(f => f.item && f.item.toLowerCase().includes(itemName.toLowerCase()))?.itemTag || itemName;
      
      this.addActivityLog(
        `Claimed ${amount}x ${itemName} worth ${totalValue.toLocaleString()} coins`,
        itemTag
      );
    }

    // "Buy Order Setup! 674x Enchanted Eye of Ender for 5,437,293 coins"
    const buyOrderMatch = originalMessage.match(/Buy Order Setup! (\d+)x? (.+?) for ([\d,]+) coins/i);
    if (buyOrderMatch) {
      const amount = buyOrderMatch[1];
      const itemName = buyOrderMatch[2].trim();
      const totalCost = parseInt(buyOrderMatch[3].replace(/,/g, ''));
      const itemTag = this.flips.find(f => f.item && f.item.toLowerCase().includes(itemName.toLowerCase()))?.itemTag || null;
      
      // 🔥 Record money spent on buy order
      this.addMoneyFlowTransaction(totalCost, 'buy', itemTag, itemName);
      
      this.addActivityLog(
        `Buy Order Setup: ${amount}x ${itemName} for ${totalCost.toLocaleString()} coins`,
        itemTag
      );
    }

    // "Claimed 2,690,011 coins from selling 2x Fuming Potato Book at 1,362,031 each!"
    const sellClaimMatch = originalMessage.match(/\[Bazaar\] Claimed ([\d,]+) coins from selling (\d+)x? (.+?) at ([\d,]+) each!/i);
    if (sellClaimMatch) {
      const totalCoins = parseInt(sellClaimMatch[1].replace(/,/g, ''));
      const amount = parseInt(sellClaimMatch[2]);
      const itemName = sellClaimMatch[3].trim();
      const itemTag = this.flips.find(f => f.item && f.item.toLowerCase().includes(itemName.toLowerCase()))?.itemTag || itemName;
      
      // 🔥 Record money earned from selling (negative because it reduces total spent)
      this.addMoneyFlowTransaction(-totalCoins, 'sell', itemTag, itemName);
      
      // 🔥 NEW PROFIT CALCULATION: Using API price at the moment of sale
      this.calculateProfitFromSale(itemTag, itemName, totalCoins, amount);
      
      this.addActivityLog(
        `Sold ${amount}x ${itemName} for ${totalCoins.toLocaleString()} coins`,
        itemTag
      );
    }

    // Original flip detection logic
    for (const flip of this.flips) {
      // Skip inactive flips
      if (!flip.active) continue;

      // 🔥 FIX: Detectar cuando se completa la orden de COMPRA
      // Solo marcar el flag, no llamar método inexistente
      if (!flip.buyFilled && text.includes(flip.item.toLowerCase()) && text.includes("buy order") && text.includes("was filled")) {
        this.log(`✅ Buy order filled for ${flip.item}`);
        flip.buyFilled = true;
        flip.notifyStateChange();
      }

      // 🔥 FIX: Detectar cuando se completa la orden de VENTA
      // Marcar flag y finalizar flip
      if (!flip.flipFinished && text.includes(flip.item.toLowerCase()) && text.includes("sell offer") && text.includes("was filled")) {
        this.log(`✅ Sell order filled for ${flip.item}`);
        flip.orderFilled = true;
        flip.finishFlip(false);
      }
    }
  }

  // 🔥 NEW METHOD: Calculate profit using API price at the moment of sale
  async calculateProfitFromSale(itemTag, itemName, totalCoinsReceived, amountSold) {
    try {
      // ✅ Check if we already recorded this sale in the last 2 seconds (prevent duplicates)
      const recentSale = this.profitHistory.find(entry => 
        entry.itemTag === itemTag && 
        (Date.now() - entry.timestamp) < 2000
      );
      
      if (recentSale) {
        this.log(`⚠️ Duplicate sale detection prevented for ${itemName}`);
        return;
      }

      this.log(`💰 Calculating profit for ${itemName} (${itemTag})...`);
      
      // Fetch current buy price from API
      const snapshot = await this.api.getBazaarSnapshot(itemTag);
      const apiBuyPrice = Math.round(Number(snapshot.sellPrice) * 10) / 10;
      
      // Calculate buy cost based on API price
      const buyCost = apiBuyPrice * amountSold;
      
      // Calculate profit: totalCoinsReceived - buyCost
      const profit = totalCoinsReceived - buyCost;
      
      // Add to profit history
      this.profitHistory.unshift({
        timestamp: Date.now(),
        profit,
        itemTag,
        item: itemName
      });
      
      // Keep only last N records
      if (this.profitHistory.length > this.maxProfitHistory) {
        this.profitHistory = this.profitHistory.slice(0, this.maxProfitHistory);
      }
      
      this.log(`💰 Profit calculated: ${profit > 0 ? '+' : ''}${profit.toLocaleString()} coins for ${itemName}`);
      this.log(`   → API Buy Price: ${apiBuyPrice.toLocaleString()} × ${amountSold} = ${buyCost.toLocaleString()} coins`);
      this.log(`   → Sold for: ${totalCoinsReceived.toLocaleString()} coins`);
      this.log(`   → Profit: ${totalCoinsReceived.toLocaleString()} - ${buyCost.toLocaleString()} = ${profit > 0 ? '+' : ''}${profit.toLocaleString()}`);
    } catch (error) {
      this.log(`⚠️ Error calculating profit for ${itemName}: ${error.message}`);
    }
  }

  // Add activity log
  addActivityLog(message, itemTag = null) {
    const log = {
      timestamp: Date.now(),
      message: message,
      itemTag: itemTag
    };
    
    this.activityLogs.unshift(log); // Add to beginning
    
    // Keep only last N logs
    if (this.activityLogs.length > this.maxLogs) {
      this.activityLogs = this.activityLogs.slice(0, this.maxLogs);
    }
    
    this.log(`📜 Activity log: ${message}`);
  }

  // Get recent activity logs
  getActivityLogs(limit = 20) {
    return this.activityLogs.slice(0, limit);
  }

  // Get profit history for charts
  getProfitHistory(limit = 50) {
    return this.profitHistory.slice(0, limit);
  }

  // 🔥 NEW: Add money flow transaction
  addMoneyFlowTransaction(amount, type, itemTag = null, itemName = null) {
    const transaction = {
      timestamp: Date.now(),
      amount: amount, // Positive for money spent, negative for money earned
      type: type, // 'buy', 'sell', 'buyrelist', 'sellrelist'
      itemTag: itemTag,
      item: itemName
    };
    
    this.moneyFlowHistory.unshift(transaction); // Add to beginning
    
    // Keep only last N transactions
    if (this.moneyFlowHistory.length > this.maxMoneyFlowHistory) {
      this.moneyFlowHistory = this.moneyFlowHistory.slice(0, this.maxMoneyFlowHistory);
    }
    
    const sign = amount > 0 ? '+' : '';
    this.log(`💸 Money flow: ${sign}${amount.toLocaleString()} coins (${type}) for ${itemName || itemTag || 'unknown'}`);
  }

  // 🔥 NEW: Get money flow history
  getMoneyFlow(limit = 100) {
    return this.moneyFlowHistory.slice(0, limit);
  }

  // Get comprehensive stats for UI
  getStats() {
    return {
      totalFlips: this.totalFlips,
      successfulFlips: this.successfulFlips,
      failedFlips: this.failedFlips,
      totalProfit: this.totalProfit,
      totalVolume: this.totalVolume,
      averageProfit: this.successfulFlips > 0 ? this.totalProfit / this.successfulFlips : 0,
      activeFlips: this.activeFlips.size,
      queuedFlips: this.flipQueue.length,
      isPaused: this.isPaused,
      activityLogs: this.getActivityLogs(20),
      profitHistory: this.getProfitHistory(50)
    };
  }

  // Resume flips from saved state (call this after bot connects)
  async resumeFlips() {
    if (!this.savedFlipStates || this.savedFlipStates.length === 0) {
      this.log(`No flips to resume`);
      return;
    }
    
    this.log(`🔄 Resuming ${this.savedFlipStates.length} flips from previous session...`);
    
    // Restaurar flips primero
    for (const savedFlip of this.savedFlipStates) {
      try {
        // Only resume active flips that haven't finished
        if (!savedFlip.active || savedFlip.flipFinished) {
          this.log(`  ⏭️ Skipping finished flip: ${savedFlip.item}`);
          continue;
        }
        
        this.log(`  🔄 Resuming flip: ${savedFlip.item}`);
        
        // Fetch fresh data from API
        const snapshot = await this.api.getBazaarSnapshot(savedFlip.itemTag);
        
        const flipData = {
          itemTag: savedFlip.itemTag,
          item: snapshot.item,
          buyPrice: Number(snapshot.buyPrice),
          sellPrice: Number(snapshot.sellPrice),
          buyVolume: snapshot.buyVolume,
          sellVolume: snapshot.sellVolume,
          volume: snapshot.buyVolume,
          demand: snapshot.buyVolume
        };
        
        // Create new flip with saved state
        const flip = this.createFlip(flipData, savedFlip.moneyPerFlip);
        
        // Restore flip state
        flip.bought = savedFlip.bought;
        flip.buyFilled = savedFlip.buyFilled;
        flip.sellExecuted = savedFlip.sellExecuted;
        flip.orderFilled = savedFlip.orderFilled;
        flip.buyRelistCounter = savedFlip.buyRelistCounter;
        flip.relistCounter = savedFlip.relistCounter;
        flip.startTime = savedFlip.startTime;
        
        this.flips.push(flip);
        
      } catch (error) {
        this.log(`  ❌ Error resuming flip ${savedFlip.item}: ${error.message}`);
      }
    }
    
    // Ahora verificar si hay un nodo actual que debe reejecutarse
    if (this.savedQueueState && this.savedQueueState.currentTask) {
      const currentTask = this.savedQueueState.currentTask;
      this.log(`🔄 Found interrupted task: ${currentTask.metadata.type} for ${currentTask.metadata.item}`);
      
      // Encontrar el flip correspondiente
      const flip = this.flips.find(f => f.itemTag === currentTask.metadata.itemTag);
      
      if (flip) {
        this.log(`  → Restarting ${currentTask.metadata.type} for ${flip.item}...`);
        
        // Reejecutar el nodo según su tipo
        switch (currentTask.metadata.type) {
          case 'buy':
            flip.buy();
            break;
          case 'sell':
            flip.sell();
            break;
          case 'buyrelist':
            flip.buyRelist();
            break;
          case 'sellrelist':
            flip.sellRelist();
            break;
          case 'finish':
            flip.finishFlip();
            break;
          default:
            this.log(`  ⚠️ Unknown task type: ${currentTask.metadata.type}`);
        }
      } else {
        this.log(`  ⚠️ Could not find flip for task: ${currentTask.metadata.item}`);
      }
    }
    
    // Procesar tareas pendientes en la cola
    if (this.savedQueueState && this.savedQueueState.queuedTasks && this.savedQueueState.queuedTasks.length > 0) {
      this.log(`📋 Found ${this.savedQueueState.queuedTasks.length} pending tasks in queue`);
      // Las tareas pendientes se procesarán automáticamente cuando la cola se reanude
    }
    
    // Clear saved states after resuming
    this.savedFlipStates = null;
    this.savedQueueState = null;
    this.saveState();
    
    this.log(`✅ Resumed ${this.flips.length} active flips`);
  }

  destroy() {
    this.log('🧹 Destroying FlipManager...');
    
    // 1. Destruir ChatListener
    if (this.chatListener && typeof this.chatListener.destroy === 'function') {
      this.chatListener.destroy();
      this.chatListener = null;
    }
    
    // 2. Destruir todos los Flips
    if (this.flips && this.flips.length > 0) {
      this.log(`   🔥 Destroying ${this.flips.length} active flips...`);
      this.flips.forEach((flip, index) => {
        if (flip && typeof flip.destroy === 'function') {
          flip.destroy();
        }
      });
    }
    
    // 3. Limpiar array de flips
    this.flips = [];
    
    // 4. Limpiar referencias
    this.api = null;
    this.queue = null;
    this.bot = null;
    
    this.log('✅ FlipManager destroyed');
  }
}

module.exports = FlipManager;














