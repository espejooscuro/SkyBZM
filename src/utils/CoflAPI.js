class CoflAPI {
  constructor(
    apiUrl = 'https://sky.coflnet.com/api/flip/bazaar/spread',
    maxBuyPrice = Infinity,
    minProfit = 0,
    minVolume = 0,
    blacklistContaining = [] // ahora puede ser array de strings
  ) {
    this.apiUrl = apiUrl;
    this.maxBuyPrice = maxBuyPrice;
    this.minProfit = minProfit;
    this.minVolume = minVolume;
    this.blacklistContaining = Array.isArray(blacklistContaining)
      ? blacklistContaining
      : blacklistContaining ? [blacklistContaining] : [];
  }

  async fetchSpreads() {
    const res = await fetch(this.apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  computeProfit(item) {
    const buy = item.flip.buyPrice;
    const sell = item.flip.sellPrice;
    if (!buy || !sell) return 0;

    const fees = (buy + sell) * 0.025; // 2.5% tax
    return buy - sell - fees;
  }

  process(items) {
    return items
      .map(item => {
        const buyPrice = item.flip.buyPrice;
        const sellPrice = item.flip.sellPrice;
        const demand = item.flip.volume ?? 0;
        const profit = this.computeProfit(item);
        const score = profit * demand;

        return {
          item: item.itemName,
          buyPrice,
          sellPrice,
          profitPerItem: profit,
          demand,
          score,
          manipulated: item.isManipulated
        };
      })
      .filter(f =>
        f.profitPerItem >= this.minProfit &&
        f.buyPrice <= this.maxBuyPrice &&
        f.demand >= this.minVolume &&
        !this.blacklistContaining.some(str => new RegExp(str, 'i').test(f.item))
      )
      .sort((a, b) => b.score - a.score);
  }

  async getSortedFlips() {
    const data = await this.fetchSpreads();
    return this.process(data);
  }

  getRandomSafeFlips(flips, amount = 15) {
    const safe = flips.filter(f => !f.manipulated);

    for (let i = safe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [safe[i], safe[j]] = [safe[j], safe[i]];
    }

    return safe.slice(0, amount);
  }
}

module.exports = CoflAPI;
