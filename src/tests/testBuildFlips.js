// testBuildFlipsReal.js
const FlipManager = require('../flips/FlipManager');

(async () => {
  const manager = new FlipManager(null, {
    maxFlips: 3,
    purse: 10000000,
    whitelist: [
      "KISMET_FEATHER",
      "ENCHANTED_RED_MUSHROOM"
    ]
  });

  // Si quieres usar la API real, no hacemos mock, FlipManager ya la usa
  await manager.buildFlips();

  console.log("Flips generados:");
  manager.flips.forEach((f, i) => {
    console.log(`${i + 1}:`, {
      item: f.item,
      itemTag: f.itemTag,
      buyPrice: f.instaBuyPrice,
      sellPrice: f.instaSellPrice,
      amount: f.amountToBuy
    });
  });
})();
