const ContainerManager = require('./ContainerManager');
const delay = ms => new Promise(r => setTimeout(r, ms));

class AutoBoosterCookie {
  constructor(bot, ChatListener, queue) {
    this.queue = queue;
    this.bot = bot;
    this.finished = false;
    this.ContainerManager = new ContainerManager(bot);
    this.ChatListener = ChatListener;
  }

  getBoostercookie() {
    return this.queue.enqueue(async () => {
      // Esperamos un poquito antes de enviar el comando
      await delay(2000);
      this.ChatListener.send("/boostercookie");
      await delay(2000);

      // 1️⃣ Listamos todos los items válidos del contenedor para debug
      const validItems = this.ContainerManager.getValidContainerItems();
      console.log("=== Items válidos en el contenedor ===");
      validItems.forEach(item => {
        console.log(`Slot: ${item.slot}, CustomName: "${item.customName}", Quantity: ${item.quantity}`);
      });

      // 2️⃣ Buscamos el Booster Cookie por nombre exacto
      const lore = this.ContainerManager.getItemDescription({
        customName: "Booster Cookie" // exacto, sin contains
      }, true); // true = buscar en contenedor

      if (lore.length) {
        console.log("✅ Lore de Booster Cookie encontrado:");
        lore.forEach(line => console.log(line));
      } else {
        console.log("❌ No se encontró Booster Cookie en el contenedor");
      }

      // Liberamos la referencia de la cola
      this.queue = null;
    });
  }
}

module.exports = AutoBoosterCookie;
