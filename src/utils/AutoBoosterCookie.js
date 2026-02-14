const ContainerManager = require('./ContainerManager');
const delay = ms => new Promise(r => setTimeout(r, ms));

class AutoBoosterCookie {
  constructor(bot, ChatListener, queue) {
    this.queue = queue;
    this.bot = bot;
    this.finished = false;
    this.ContainerManager = new ContainerManager(bot);
    this.ChatListener = ChatListener;

    this.boosterCookieExpiresAt = null;
    this.boosterInterval = null;
  }

  async getBoostercookie() {
    return this.queue.enqueue(async () => {
      await delay(2000);
      this.ChatListener.send("/boostercookie");
      await delay(2000);

      // Debug de items
      const validItems = this.ContainerManager.getValidContainerItems();
      console.log("=== Items válidos en el contenedor ===");
      validItems.forEach(item => {
        console.log(`Slot: ${item.slot}, CustomName: "${item.customName}", Quantity: ${item.quantity}`);
      });

      this.ContainerManager.getInventory(this.bot);

      // Buscar Booster Cookie
      const lore = this.ContainerManager.getItemDescription({
        customName: "booster cookie"
      }, true);
      if (!lore.length) {
        console.log("❌ No se encontró Booster Cookie en el contenedor");
        this.queue = null;
        return;
      }

      //lore.forEach(line => console.log(line));

      // Extraer duración usando métodos propios de BoosterCookie
      const durationLine = this.ContainerManager._findLoreLine(lore, { contains: "duration" });
      if (!durationLine) {
        console.log("❌ No se pudo encontrar la duración en el lore. Boostercookie agotado.. Comprando nuevo boostercookie!");
        this.queue = null;
        return;
      }
      const remainingMs = this._parseDurationToMs(durationLine);
      if (!remainingMs || remainingMs <= 0) {
        console.log("❌ No se pudo parsear correctamente la duración");
        this.queue = null;
        return;
      }
      this.boosterCookieExpiresAt = Date.now() + remainingMs;
      console.log("🧠 Booster Cookie activo. Timer iniciado.");
      this._startBoosterCookieTimer();
      this.queue = null;
    });
  }

  // 🔎 Método genérico para buscar líneas en el lore
  _findLoreLine(loreLines, filters = {}) {
    if (!Array.isArray(loreLines)) return null;

    const clean = text =>
      text
        .replace(/§[0-9a-fk-or]/gi, '')
        .trim()
        .toLowerCase();

    for (const line of loreLines) {
      if (!line) continue;

      const plain = clean(line);

      if (filters.equals && plain !== filters.equals.toLowerCase()) continue;
      if (filters.startsWith && !plain.startsWith(filters.startsWith.toLowerCase())) continue;
      if (filters.contains && !plain.includes(filters.contains.toLowerCase())) continue;
      if (filters.regex && !filters.regex.test(plain)) continue;

      return line; // devolvemos la línea original
    }

    return null;
  }

  // ⏱️ Parsear duración a milisegundos
  _parseDurationToMs(durationLine) {
    if (!durationLine) return 0;

    const text = durationLine.toLowerCase();

    let days = 0, hours = 0, minutes = 0, seconds = 0;

    const dayMatch = text.match(/(\d+)\s*d/);
    const hourMatch = text.match(/(\d+)\s*h/);
    const minMatch = text.match(/(\d+)\s*m/);
    const secMatch = text.match(/(\d+)\s*s/);

    if (dayMatch) days = parseInt(dayMatch[1], 10);
    if (hourMatch) hours = parseInt(hourMatch[1], 10);
    if (minMatch) minutes = parseInt(minMatch[1], 10);
    if (secMatch) seconds = parseInt(secMatch[1], 10);

    return (
      days * 24 * 60 * 60 * 1000 +
      hours * 60 * 60 * 1000 +
      minutes * 60 * 1000 +
      seconds * 1000
    );
  }

  // ⏰ Timer del Booster Cookie
  _startBoosterCookieTimer() {
    if (!this.boosterCookieExpiresAt) return;

    if (this.boosterInterval) clearInterval(this.boosterInterval);

    this.boosterInterval = setInterval(() => {
      const remaining = this.boosterCookieExpiresAt - Date.now();

      if (remaining <= 0) {
        console.log("🍪❌ El Booster Cookie ha expirado.");
        clearInterval(this.boosterInterval);
        this.boosterInterval = null;
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      //console.log(`⏳ Booster Cookie restante: ${days}d ${hours}h ${minutes}m ${seconds}s`);

      if (remaining <= 24 * 60 * 60 * 1000) {
        console.log("⚠️ Queda menos de 1 día de Booster Cookie!");
      }
    }, 60 * 1000);
  }
}

module.exports = AutoBoosterCookie;
