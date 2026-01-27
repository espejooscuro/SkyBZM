const TaskQueue = require('../utils/TaskQueue');
const Flip = require('./Flip');
const CoflAPI = require('../utils/CoflAPI');
const ChatListener = require('../events/ChatListener');

function cleanChatText(text) {
  return text.replace(/§[0-9a-fklmnor]/gi, '').toLowerCase().trim();
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

    this.sellTimeout = options.sellTimeout || 300_000;
    this.flips = [];
    this.purse = options.purse || 1_000_000;
    this.defaultSpread = options.defaultSpread || 0.05;

    if (bot && typeof bot.on === 'function') {
      this.chatListener = new ChatListener(bot, { callback: (msg) => this.onChatMessage(msg) });
    } else {
      this.chatListener = null;
      console.log("ChatListener disabled (no bot provided)");
    }
  }

  async buildFlips(amount = 10) {
    const flipsData = await this.api.getSortedFlips();
    const random = this.api.getRandomSafeFlips(flipsData, amount);

    const moneyPerFlip = this.purse / random.length;

    this.flips = random.map(f => this.createFlip(f, moneyPerFlip));
  }

  createFlip(flipData, moneyPerFlip) {
    const flip = new Flip(flipData, this.queue, this.api, this.sellTimeout, moneyPerFlip, this.defaultSpread);

    // Callback cuando termina
    flip.onFinish = (endedByTimeout) => {
      if (endedByTimeout) {
        console.log(`Flip for ${flip.item} ended by timeout, creating a different flip.`);
        this.createNextFlipDifferent(flip);
      } else {
        console.log(`Flip for ${flip.item} finished normally, creating a new flip with same values.`);
        this.createNextFlipSame(flip);
      }
    };

    return flip;
  }

  createNextFlipSame(flip) {
    const moneyPerFlip = this.purse / Math.max(1, this.flips.length);
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
    const flipsData = await this.api.getSortedFlips();
    const available = this.api.getRandomSafeFlips(flipsData, 1)
      .filter(f => f.itemTag !== oldFlip.itemTag); // evitar mismo flip
    if (available.length === 0) return;

    const moneyPerFlip = this.purse / Math.max(1, this.flips.length);
    const newFlip = this.createFlip(available[0], moneyPerFlip);
    this.flips.push(newFlip);
    newFlip.buy();
  }

  onChatMessage(record) {
    const text = cleanChatText(record.message);
    for (const flip of this.flips) {
      if (flip.bought && !flip.sellExecuted && text.includes(flip.item)) {
        console.log(`Chat detected item ${flip.item}, forcing sell`);
        flip.sell();
      }
    }
  }
}

module.exports = FlipManager;
