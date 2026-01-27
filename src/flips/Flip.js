const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function formatPrice(num) {
  return num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function formatNumber(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

class Flip {
  constructor(data, queue, api, sellTimeout = 300_000, maxSpend = Infinity, defaultSpread = 0.05) {
    this.item = String(data.item || "unknown").toLowerCase();
    this.itemTag = String(data.itemTag || data.item || "unknown");

    this.instaBuyPrice = Number(data.sellPrice) || 1;
    this.instaSellPrice = Number(data.buyPrice) || this.instaBuyPrice * 1.05;

    this.queue = queue;
    this.api = api;

    this.sellTimeout = sellTimeout;
    this.maxSpend = Number(maxSpend) || Infinity;
    this.defaultSpread = defaultSpread;

    this.bought = false;
    this.sellExecuted = false;
    this.active = true;          // estado general del flip
    this.sellTimer = null;
    this.priceWatcher = null;

    this.buyReferencePrice = this.instaBuyPrice;
    this.sellReferencePrice = this.instaSellPrice;

    this.amountToBuy = Math.max(1, Math.floor(this.calculateAmount(data) || 1));

    this.onFinish = null; // callback externo
  }

  calculateAmount(data) {
    const volumeFactor = Math.min(Number(data.volume || 1) / 100_000, 1);
    const spreadFactor = 1 + (1 - volumeFactor) * this.defaultSpread;
    return (this.maxSpend / this.instaBuyPrice) / spreadFactor;
  }

  async buy() {
    return this.queue.enqueue(async () => {
      if (!this.active || this.bought) return;

      const totalSpent = this.amountToBuy * this.instaBuyPrice;
      console.log(`Buying ${this.amountToBuy}x ${this.item} [${this.itemTag}] for ${formatPrice(this.instaBuyPrice)} each → Total spent: ${formatNumber(totalSpent)}`);
      await delay(2000);

      this.bought = true;
      console.log(`Finished buying ${this.item}`);

      this.startSellTimer();
      this.startPriceWatcher();
    });
  }

  async sell(endedByTimeout = false) {
    return this.queue.enqueue(async () => {
      if (!this.active || !this.bought || this.sellExecuted) return;

      this.sellExecuted = true;           // marcar venta inmediatamente
      this.clearSellTimer();

      let currentSellPrice = this.instaSellPrice;
      try {
        const snapshot = await this.api.getBazaarSnapshot(this.itemTag);
        currentSellPrice = Number(snapshot.buyPrice);
      } catch (err) {
        console.warn(`Error fetching sell price for ${this.itemTag}, using fallback: ${err}`);
      }

      // Actualizar referencia antes del delay
      this.sellReferencePrice = currentSellPrice;

      const totalEarned = this.amountToBuy * currentSellPrice;
      console.log(`Selling ${this.amountToBuy}x ${this.item} [${this.itemTag}] for ${formatPrice(currentSellPrice)} each → Total earned: ${formatNumber(totalEarned)}`);

      await delay(2000); // simula tiempo de venta

      // Llamada al final para destruir flip
      setTimeout(() => this.finishFlip(endedByTimeout), 30_000);
    });
  }

  startSellTimer() {
    this.sellTimer = setTimeout(() => {
      if (!this.sellExecuted) this.sell(true);
    }, this.sellTimeout);
  }

  clearSellTimer() {
    if (this.sellTimer) clearTimeout(this.sellTimer);
  }

  startPriceWatcher() {
    this.priceWatcher = setInterval(async () => {
      if (!this.active) return;

      try {
        const snapshot = await this.api.getBazaarSnapshot(this.itemTag);
        const apiBuyPrice = Number(snapshot.sellPrice);
        const apiSellPrice = Number(snapshot.buyPrice);

        // Relist de compra solo antes de vender
        if (this.bought && !this.sellExecuted && apiBuyPrice > this.buyReferencePrice) {
          console.log(`BUY price increased for ${this.item} [${this.itemTag}]: ${formatPrice(this.buyReferencePrice)} → ${formatPrice(apiBuyPrice)}`);
          this.buyReferencePrice = apiBuyPrice;
          this.buyRelist();
        }

        // Relist de venta solo después de vender
        if (this.sellExecuted && apiSellPrice < this.sellReferencePrice) {
          console.log(`SELL price decreased for ${this.item} [${this.itemTag}]: ${formatPrice(this.sellReferencePrice)} → ${formatPrice(apiSellPrice)}`);
          this.sellReferencePrice = apiSellPrice;
          this.sellRelist();
        }

      } catch (err) {
        console.warn(`Error checking prices for ${this.itemTag}: ${err}`);
      }
    }, 5000);
  }

  buyRelist() {
    console.log(`Executed BuyRelist for ${this.item} [${this.itemTag}]`);
  }

  sellRelist() {
    console.log(`Executed SellRelist for ${this.item} [${this.itemTag}]`);
  }

  finishFlip(endedByTimeout = false) {
    this.active = false; // marcar flip como terminado
    this.clearSellTimer();
    if (this.priceWatcher) clearInterval(this.priceWatcher);

    this.bought = false;
    this.sellExecuted = false;
    this.sellTimer = null;
    this.priceWatcher = null;

    if (typeof this.onFinish === 'function') {
      console.log(`Flip for ${this.item} ended ${endedByTimeout ? 'by timeout' : 'normally'}`);
      this.onFinish(endedByTimeout);
    }
  }
}

module.exports = Flip;
