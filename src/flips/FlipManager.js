

const TaskQueue = require('../utils/TaskQueue');
const Flip = require('./Flip');
const CoflAPI = require('../utils/CoflAPI');
const ChatListener = require('../events/ChatListener');

function cleanChatText(text) {
  return text.replace(/§[0-9a-fklmnor]/gi, '').toLowerCase().trim();
}

class FlipManager {
  constructor(bot, accountConfig = {}) {
    this.bot = bot;
    this.queue = new TaskQueue();

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
    this.whitelist = accountConfig.whitelist || [];

    this.flips = [];
    this.amount = null;
    this.username = accountConfig.username || (bot && bot.username) || 'Unknown';

    if (bot && typeof bot.on === 'function') {
      this.chatListener = new ChatListener(bot, { 
        callback: (msg) => this.onChatMessage(msg) 
      });
    } else {
      this.chatListener = null;
      console.log(`[${this.username}] ChatListener disabled (no bot provided)`);
    }

    this.log(`✅ FlipManager initialized`);
    this.log(`💰 Purse: ${this.purse.toLocaleString()}`);
    this.log(`🎯 Max flips: ${this.maxFlips}`);
    this.log(`🔄 Max relist: ${this.maxRelist}`);
    this.log(`📋 Whitelist items: ${this.whitelist.length > 0 ? this.whitelist.join(', ') : 'NONE'}`);
    this.log(`🚫 Blacklist patterns: ${(accountConfig.blacklistContaining || []).length > 0 ? (accountConfig.blacklistContaining || []).join(', ') : 'NONE'}`);
  }

  log(...args) {
    console.log(`[${this.username}][FlipManager]`, ...args);
  }

  async buildFlips(amount = this.maxFlips) {
    this.log(`🔨 Building ${amount} flips...`);
    
    const flipsData = await this.api.getSortedFlips();
    let selectedFlips = [];

    // 1️⃣ If whitelist exists
    if (this.whitelist.length > 0) {
      const whitelistFlips = [];

      for (const w of this.whitelist) {
        let snapshot = null;

        this.log(`Processing whitelist item: ${w}`);
        const tag = typeof w === "string" ? w : w.itemTag;
        
        try {
          snapshot = await this.api.getBazaarSnapshot(tag);

          whitelistFlips.push({
            itemTag: tag,
            item: snapshot.item,
            buyPrice: snapshot.buyPrice,
            sellPrice: snapshot.sellPrice,
            buyVolume: snapshot.buyVolume,
            sellVolume: snapshot.sellVolume
          });
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
        const random = this.api.getRandomSafeFlips(flipsData, remaining)
          .filter(f => !whitelistFlips.some(w => w.itemTag === f.itemTag));

        selectedFlips = selectedFlips.concat(random);
      }
    } else {
      // No whitelist → normal behavior
      selectedFlips = this.api.getRandomSafeFlips(flipsData, amount);
    }

    // 🔀 Shuffle final flip order (Fisher-Yates)
    for (let i = selectedFlips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selectedFlips[i], selectedFlips[j]] = [selectedFlips[j], selectedFlips[i]];
    }

    this.amount = selectedFlips.length;
    const moneyPerFlip = this.purse / this.amount;

    this.log(`💵 Money per flip: ${moneyPerFlip.toLocaleString()}`);

    // Create flips
    this.flips = selectedFlips.map(f => this.createFlip(f, moneyPerFlip));
    
    this.log(`✅ ${this.flips.length} flips created successfully`);
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
    );

    flip.onFinish = (endedByTimeout) => {
      if (endedByTimeout) {
        this.log(`Flip for ${flip.item} ended by timeout, creating a different flip.`);
        this.createNextFlipDifferent(flip);
      } else {
        this.log(`Flip for ${flip.item} finished normally, creating a new flip with same values.`);
        this.createNextFlipSame(flip);
      }
    };

    return flip;
  }

  getActiveFlips() {
    return this.flips.filter(flip => flip.bought && !flip.sellExecuted);
  }

  getActiveFlipsSummary() {
    const activeFlips = this.getActiveFlips();
    let totalSpent = 0;

    const summary = activeFlips.map(flip => {
      const unitPrice = flip.instaBuyPrice; 
      const amount = flip.amountToBuy;
      const total = unitPrice * amount;

      totalSpent += total;

      return { item: flip.item, unitPrice, amount, total };
    });

    return { flips: summary, totalSpent };
  }

  createNextFlipSame(flip) {
    const moneyPerFlip = this.purse / this.amount;

    const newFlip = this.createFlip({
      item: flip.item,
      itemTag: flip.itemTag,
      sellPrice: flip.instaBuyPrice,
      buyPrice: flip.instaSellPrice,
      volume: flip.amountToBuy
    }, moneyPerFlip);

    this.flips.push(newFlip);
    newFlip.buy();
  }

  async createNextFlipDifferent(oldFlip) {
    const moneyPerFlip = this.purse / this.amount;
    let nextFlipData = null;

    // Helper to check if itemTag already exists in current flips
    const isAlreadyFlipped = (tag) => this.flips.some(f => f.itemTag === tag);

    // 1️⃣ Priority whitelist
    if (this.whitelist.length > 0) {
      // Filter whitelist removing oldFlip and existing flips
      const availableWhitelist = this.whitelist.filter(tag => 
        tag !== oldFlip.itemTag && !isAlreadyFlipped(tag)
      );

      if (availableWhitelist.length > 0) {
        const tag = availableWhitelist[Math.floor(Math.random() * availableWhitelist.length)];

        try {
          const snapshot = await this.api.getBazaarSnapshot(tag);

          nextFlipData = {
            itemTag: tag,
            item: snapshot.item,
            buyPrice: snapshot.buyPrice,
            sellPrice: snapshot.sellPrice,
            buyVolume: snapshot.buyVolume,
            sellVolume: snapshot.sellVolume
          };
        } catch (err) {
          this.log(`⚠️ Whitelist item ${tag} not found in API, ignoring.`);
        }
      }
    }

    // 2️⃣ If no valid whitelist, use normal flips
    if (!nextFlipData) {
      const flipsData = await this.api.getSortedFlips();
      const available = this.api.getRandomSafeFlips(flipsData, 1)
        .filter(f => f.itemTag !== oldFlip.itemTag && !isAlreadyFlipped(f.itemTag));

      if (available.length === 0) {
        this.log('⚠️ No new flips available');
        return;
      }

      nextFlipData = available[0];
    }

    // 3️⃣ Create flip and add it
    const newFlip = this.createFlip(nextFlipData, moneyPerFlip);
    this.flips.push(newFlip);
    newFlip.buy();
  }

  onChatMessage(record) {
    const text = cleanChatText(record.message);

    for (const flip of this.flips) {
      if (!flip.buyFilled && text.includes(flip.item) && text.includes("buy order") && text.includes("was filled!")) {
        this.log(`✅ Buy order filled for ${flip.item}`);
        flip.sell();
      }

      if (!flip.flipFinished && text.includes(flip.item) && text.includes("sell offer") && text.includes("was filled!")) {
        this.log(`✅ Sell order filled for ${flip.item}`);
        flip.finishFlip(false);
      }
    }
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


