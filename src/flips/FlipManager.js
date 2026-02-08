const TaskQueue = require('../utils/TaskQueue');
const Flip = require('./Flip');
const CoflAPI = require('../utils/CoflAPI');
const ChatListener = require('../events/ChatListener');

function cleanChatText(text) {
  return text.replace(/§[0-9a-fklmnor]/gi, '').toLowerCase().trim();
}

class FlipManager {
  constructor(bot, options = {}) {
    this.bot = bot;
    this.queue = new TaskQueue();

    this.api = new CoflAPI(
      options.apiUrl,
      options.maxBuyPrice,
      options.minProfit,
      options.minVolume,
      options.blacklistContaining
    );

    this.sellTimeout = options.sellTimeout || 300_000;
    this.purse = options.purse || 40_000_000;
    this.defaultSpread = options.defaultSpread || 0.05;

    // NUEVOS
    this.maxFlips = options.maxFlips || 7;
    this.maxRelist = options.maxRelist || 3;
    this.whitelist = options.whitelist || [];

    this.flips = [];
    this.amount = null;

    if (bot && typeof bot.on === 'function') {
      this.chatListener = new ChatListener(bot, { callback: (msg) => this.onChatMessage(msg) });
    } else {
      this.chatListener = null;
      console.log("ChatListener disabled (no bot provided)");
    }
  }

  async buildFlips(amount = this.maxFlips) {
  const flipsData = await this.api.getSortedFlips();
  let selectedFlips = [];

  // 1️⃣ Si hay whitelist
  if (this.whitelist.length > 0) {
    const whitelistFlips = [];

  for (const w of this.whitelist) {
    let snapshot = null;

  console.log("Procesando whitelist item:", w);
  const tag = typeof w === "string" ? w : w.itemTag;
  snapshot = await this.api.getBazaarSnapshot(tag);

  whitelistFlips.push({
    itemTag: tag,
    item: snapshot.item,        // nombre legible
    buyPrice: snapshot.buyPrice,
    sellPrice: snapshot.sellPrice,
    buyVolume: snapshot.buyVolume,
    sellVolume: snapshot.sellVolume
  });
}


    if (whitelistFlips.length >= amount) {
      selectedFlips = whitelistFlips.slice(0, amount);
    } else {
      selectedFlips = [...whitelistFlips];

      const remaining = amount - selectedFlips.length;

      // Rellenar con flips normales excluyendo whitelist
      const random = this.api.getRandomSafeFlips(flipsData, remaining)
        .filter(f => !whitelistFlips.some(w => w.itemTag === f.itemTag));

      selectedFlips = selectedFlips.concat(random);
    }
  } else {
    // sin whitelist → comportamiento normal
    selectedFlips = this.api.getRandomSafeFlips(flipsData, amount);
  }

  this.amount = selectedFlips.length;
  const moneyPerFlip = this.purse / this.amount;

  // Crear los flips
  this.flips = selectedFlips.map(f => this.createFlip(f, moneyPerFlip));
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
      this.maxRelist,      // NUEVO
    );

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

    // 1️⃣ Prioridad whitelist (ahora whitelist puede ser array de strings)
    if (this.whitelist.length > 0) {
      const availableWhitelist = this.whitelist.filter(tag => tag !== oldFlip.itemTag);

      if (availableWhitelist.length > 0) {
        const tag = availableWhitelist[Math.floor(Math.random() * availableWhitelist.length)];

        try {
          const snapshot = await this.api.getBazaarSnapshot(tag);

          nextFlipData = {
            itemTag: tag,
            item: snapshot.item,        // nombre legible
            buyPrice: snapshot.buyPrice,
            sellPrice: snapshot.sellPrice,
            buyVolume: snapshot.buyVolume,
            sellVolume: snapshot.sellVolume
          };
        } catch (err) {
          console.warn(`Whitelist item ${tag} no encontrado en la API, ignorando.`);
        }
      }
    }

    // 2️⃣ Si no hay whitelist válida, usar flips normales
    if (!nextFlipData) {
      const flipsData = await this.api.getSortedFlips();
      const available = this.api.getRandomSafeFlips(flipsData, 1)
        .filter(f => f.itemTag !== oldFlip.itemTag);

      if (available.length === 0) return;

      nextFlipData = available[0];
    }

    const newFlip = this.createFlip(nextFlipData, moneyPerFlip);
    this.flips.push(newFlip);
    newFlip.buy();
  }




  onChatMessage(record) {
    const text = cleanChatText(record.message);

    for (const flip of this.flips) {
      if (!flip.buyFilled && text.includes(flip.item) && text.includes("buy order") && text.includes("was filled!")) {
        console.log(`Buy order filled for ${flip.item}`);
        flip.sell();
      }

      if (!flip.flipFinished && text.includes(flip.item) && text.includes("sell offer") && text.includes("was filled!")) {
        console.log(`Sell order filled for ${flip.item}`);
        flip.finishFlip(false);
      }
    }
  }
}

module.exports = FlipManager;
