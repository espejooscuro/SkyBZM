class CoflAPI {
  constructor(
    apiUrl = 'https://sky.coflnet.com/api/flip/bazaar/spread',
    maxBuyPrice = Infinity,
    minProfit = 0,
    minVolume = 0,
    blacklistContaining = []
  ) {
    this.apiUrl = apiUrl;
    this.maxBuyPrice = maxBuyPrice;
    this.minProfit = minProfit;
    this.minVolume = minVolume;
    this.blacklistContaining = Array.isArray(blacklistContaining)
      ? blacklistContaining
      : blacklistContaining ? [blacklistContaining] : [];
  }

  /* =========================
     FETCH PRINCIPAL (SPREAD)
     ========================= */

  async fetchSpreads() {
    const res = await fetch(this.apiUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

/* =========================
   SNAPSHOT BAZAAR (HYPIXEL)
   ========================= */

  async getBazaarSnapshot(itemTag) {
    const res = await fetch("https://api.hypixel.net/v2/skyblock/bazaar");
    if (!res.ok) throw new Error(`Bazaar HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success || !data.products[itemTag]) {
      throw new Error(`Item ${itemTag} not found in bazaar`);
    }
    const product = data.products[itemTag];

    const buyPrice = Math.round((product.buy_summary?.[0]?.pricePerUnit ?? 0) * 10) / 10;
    const sellPrice = Math.round((product.sell_summary?.[0]?.pricePerUnit ?? 0) * 10) / 10;
    const buyVolume = product.buy_summary?.[0]?.amount ?? 0;
    const sellVolume = product.sell_summary?.[0]?.amount ?? 0;

    const resNames = await fetch("https://api.hypixel.net/resources/skyblock/items");
    if (!resNames.ok) throw new Error(`HTTP ${resNames.status} loading item names`);
    const dataNames = await resNames.json();

    const itemsList = dataNames.items; // ✅ acceder al array
    const hypixelItem = itemsList.find(i => i.id === itemTag);
    const itemName = hypixelItem ? hypixelItem.name : itemTag; // fallback

    return {
      item: itemName,
      itemTag,
      buyPrice,
      sellPrice,
      buyVolume,
      sellVolume
    };
  }



/* =========================
   PROFIT
   ========================= */

computeProfit(quickStatus) {
  const buy = quickStatus.buyPrice;   // precio al que compras (buy order)
  const sell = quickStatus.sellPrice; // precio al que vendes (sell order)

  if (!buy || !sell) return 0;

  const tax = sell * 0.025; // 2.5% tax sobre la venta
  return sell - buy - tax;
}

  /* =========================
     PROFIT
     ========================= */

  computeProfit(item) {
    const buy = item.flip.buyPrice;
    const sell = item.flip.sellPrice;
    if (!buy || !sell) return 0;

    const fees = (buy + sell) * 0.025; // 2.5% tax
    return buy - sell - fees;
  }

  /* =========================
     PROCESADO DE FLIPS
     ========================= */

  process(items) {
    return items
      .map(item => {
        const buyPrice = item.flip.buyPrice;
        const sellPrice = item.flip.sellPrice;
        const demand = item.flip.volume ?? 0;
        const profit = this.computeProfit(item);
        const score = profit * demand;

        return {
          item: item.itemName,              // nombre humano
          itemTag: item.flip.itemTag,       // ✅ TAG REAL
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
        !this.blacklistContaining.some(str =>
          new RegExp(str, 'i').test(f.item)
        )
      )
      .sort((a, b) => b.score - a.score);
  }

  /* =========================
     API PÚBLICA
     ========================= */

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
