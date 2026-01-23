const CoflAPI = require('./CoflAPI.js');

// configuración de filtros
const MAX_BUY_PRICE = 10000000;  // máximo a gastar por flip
const MIN_PROFIT = 1500;       // mínimo profit por unidad
const MIN_VOLUME = 50000;       // mínimo volumen (demanda)
const BLACKLIST = ["enchant", "shard", "gem"]; // items que no queremos mostrar

(async () => {
  const api = new CoflAPI(undefined, MAX_BUY_PRICE, MIN_PROFIT, MIN_VOLUME, BLACKLIST);

  try {
    const bestFlips = await api.getSortedFlips();
    const random15 = api.getRandomSafeFlips(bestFlips, 20);

    console.table(
      random15.map(f => ({
        item: f.item,
        buyOrderPrice: Math.round(f.buyPrice),
        sellOrderPrice: Math.round(f.sellPrice),
        profitEach: Math.round(f.profitPerItem),
        demand: f.demand,
        score: Math.round(f.score),
        manipulated: f.manipulated
      }))
    );

  } catch (e) {
    console.error('Error:', e.message);
  }
})();
