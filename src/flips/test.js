const FlipManager = require('./FlipManager');

function formatNumber(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000)     return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000)         return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

(async () => {
  const MAX_BUY_PRICE = 10_000_000;   // 10M
  const MIN_PROFIT = 4_000;
  const MIN_VOLUME = 40_000;
  const BLACKLIST = ["enchant"];

  const PURSE = 7_000_000; // 10M para repartir entre flips

  // Creamos el manager (sin bot)
  const manager = new FlipManager(null, {
    maxBuyPrice: MAX_BUY_PRICE,
    minProfit: MIN_PROFIT,
    minVolume: MIN_VOLUME,
    blacklistContaining: BLACKLIST,
    sellTimeout: 50_000, // 20s para test rápido
    purse: PURSE
  });

  // Generamos 5 flips
  await manager.buildFlips(5);

  console.log("\n=== STARTING BUYS ===\n");
  for (const flip of manager.flips) {
    await flip.buy(); // solo se compra una vez por flip
  }

  // Resumen de gasto
  console.log("\n💰 SUMMARY 💰");
  let totalSpent = 0;
  for (const flip of manager.flips) {
    const spent = Math.round(flip.amountToBuy * flip.instaBuyPrice);
    totalSpent += spent;
    console.log(`${flip.amountToBuy}x ${flip.item} → Spent: ${formatNumber(spent)}`);
  }

  const purseLeft = PURSE - totalSpent;
  console.log(`💰 Total estimated spend for all flips: ${formatNumber(totalSpent)}`);
  console.log(`💰 Purse left: ${formatNumber(purseLeft)}`);
})();
