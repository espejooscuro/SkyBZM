const CoflAPI = require("../utils/CoflAPI");

async function testBazaarSnapshot() {
  const api = new CoflAPI();

  const itemTag = "CORRUPTED_BAIT";
  const snapshot = await api.getBazaarSnapshot(itemTag);

  console.log("Item:", itemTag);
  console.log("BuyPrice:", snapshot.buyPrice);
  console.log("SellPrice:", snapshot.sellPrice);
  console.log("BuyVolume:", snapshot.buyVolume);
  console.log("SellVolume:", snapshot.sellVolume);

  const profit = api.computeProfit(snapshot);
  console.log("Profit per item:", profit);
}

testBazaarSnapshot().catch(console.error);
