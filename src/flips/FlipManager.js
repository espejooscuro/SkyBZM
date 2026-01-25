const TaskQueue = require('../utils/TaskQueue');
const Flip = require('./Flip');
const CoflAPI = require('../utils/CoflAPI');
const ChatListener = require('../events/ChatListener');

function cleanChatText(text) {
  return text
    .replace(/§[0-9a-fklmnor]/gi, '') // elimina códigos de color/formato
    .toLowerCase()                     // minusculas
    .trim();
}

class FlipManager {
  constructor(bot, options = {}) {
    this.queue = new TaskQueue();
    this.api = new CoflAPI(
      options.apiUrl,
      options.maxBuyPrice,
      options.minProfit,
      options.minVolume,
      options.blacklistContaining
    );

    this.sellTimeout = options.sellTimeout || 300000;   // ⏱ configurable
    this.flips = [];
    this.purse = options.purse || 1_000_000;           // dinero disponible para flips
    this.defaultSpread = options.defaultSpread || 0.05; // spread base

    // ChatListener solo si bot válido
    if (bot && typeof bot.on === 'function') {
      this.chatListener = new ChatListener(bot, {
        callback: (msg) => this.onChatMessage(msg)
      });
    } else {
      this.chatListener = null;
      console.log("⚠ ChatListener disabled (no bot provided)");
    }
  }

  async buildFlips(amount = 10) {
    const flipsData = await this.api.getSortedFlips();
    const random = this.api.getRandomSafeFlips(flipsData, amount);

    // calcular dinero por flip
    const moneyPerFlip = this.purse / random.length;

    this.flips = random.map(f => {
      const flip = new Flip(f, this.queue, this.sellTimeout, moneyPerFlip, this.defaultSpread);
      // flip.start(); // opcional: auto-buy al construir flips
      return flip;
    });
  }

  onChatMessage(record) {
    const text = cleanChatText(record.message);

    for (const flip of this.flips) {
      const itemName = flip.item.toLowerCase(); // asegurar minusculas
      if (flip.bought && !flip.sellExecuted && text.includes(itemName)) {
        console.log(`Chat detected item ${flip.item}, forcing sell`);
        flip.sell();
      }
    }
  }
}

module.exports = FlipManager;
