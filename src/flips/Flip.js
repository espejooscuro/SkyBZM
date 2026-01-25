const delay = ms => new Promise(r => setTimeout(r, ms));

// Función para formatear números grandes
function formatNumber(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000)         return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

class Flip {
  constructor(data, queue, sellTimeout = 300000, maxSpend = Infinity, defaultSpread = 0.05) {
    this.item = String(data.item || "unknown").toLowerCase();
    this.instaBuyPrice = Math.round(Number(data.sellPrice) || 1);
    this.instaSellPrice = Math.round(Number(data.buyPrice) || this.instaBuyPrice * 1.05);
    this.queue = queue;

    this.sellTimeout = sellTimeout;
    this.maxSpend = Math.round(Number(maxSpend) || Infinity);
    this.defaultSpread = defaultSpread;

    this.bought = false;
    this.sellExecuted = false;
    this.sellTimer = null;

    this.amountToBuy = Math.max(1, Math.floor(this.calculateAmount(data) || 1));
  }

  calculateAmount(data) {
    const volumeFactor = Math.min(Number(data.volume || 1) / 100_000, 1);
    const spreadFactor = 1 + (1 - volumeFactor) * this.defaultSpread;
    const rawAmount = (this.maxSpend / this.instaBuyPrice) / spreadFactor;
    return rawAmount;
  }

  start() {
    // No se llama automáticamente, para evitar duplicados
  }

  buy() {
    return this.queue.enqueue(async () => {
      if (this.bought) return; // evita comprar dos veces

      const totalSpent = Math.round(this.amountToBuy * this.instaBuyPrice);
      console.log(`Buying ${this.amountToBuy}x ${this.item} for ${formatNumber(this.instaBuyPrice)} each → Total spent: ${formatNumber(totalSpent)}`);
      await delay(2000);
      console.log(`Finished buying ${this.item}`);

      this.bought = true;
      this.startSellTimer();
    });
  }

  sell() {
    return this.queue.enqueue(async () => {
      if (!this.bought || this.sellExecuted) return;

      this.sellExecuted = true;
      this.clearSellTimer();

      const totalEarned = Math.round(this.amountToBuy * this.instaSellPrice);
      console.log(`Selling ${this.amountToBuy}x ${this.item} for ${formatNumber(this.instaSellPrice)} each → Total earned: ${formatNumber(totalEarned)}`);
      await delay(2000);
      console.log(`Finished selling ${this.item}`);
    });
  }

  startSellTimer() {
    this.sellTimer = setTimeout(() => {
      if (!this.sellExecuted) {
        console.log(`⏱ Timer expired for ${this.item}`);
        this.sell();
      }
    }, this.sellTimeout);
  }

  clearSellTimer() {
    if (this.sellTimer) clearTimeout(this.sellTimer);
  }
}

module.exports = Flip;
