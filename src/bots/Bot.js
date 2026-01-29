const mineflayer = require("mineflayer");
const TaskQueue = require("../utils/TaskQueue");
const AutoBoosterCookie = require("../utils/AutoBoosterCookie");
const FlipManager = require("../flips/FlipManager");
const ChatListener = require("../events/ChatListener");
const delay = ms => new Promise(r => setTimeout(r, ms));

class Bot {
  constructor(name) {
    this.name = name;
    this.bot = null;
    this.queue = new TaskQueue();
    this.chat = null;
    this.isLogged = false; // 🔑
  }

  init(server = "mc.hypixel.net", port = 25565) {
    this.bot = mineflayer.createBot({
      host: server,
      port,
      username: this.name,
      auth: "microsoft",
      version: "1.8.9"
    });

    this.chat = new ChatListener(this.bot, {
      watchList: ["sold", "bought", "coins", "flip", "skyblock", "joined", "Hypixel", "Sending to", "Bazaar"],
      callback: (msg) => {
        console.log(msg.message);
      }
    });

    this.bot.on("login", async () => {
      if (this.isLogged) return; // ⛔ evita repetir
      this.isLogged = true;

      console.log(`[${this.name}] Connected to the server!`);

      await this.queue.enqueue(async () => {
        console.log("Starting bot...");
        await delay(5000);
        this.chat.send("/skyblock");
        await delay(5000);
        this.chat.send("/is");
        await delay(5000);
        console.log("Bot ready!");
      });

      const booster = new AutoBoosterCookie(this.bot ,this.chat, this.queue);
      await booster.getBoostercookie();
      const manager = new FlipManager(this.bot, {
        maxBuyPrice: 10000000,
        minProfit: 1500,
        minVolume: 70000,
        blacklistContaining: ["enchant"],
        sellTimeout: 300000 // si quieres timer configurable
      });

      await manager.buildFlips(5);

      console.log("\n=== Starting all BUYS ===\n");
      for (const flip of manager.flips) await flip.buy();

      console.log("\nAll tasks finished!");
    });

    this.bot.on("end", () => {
      console.log(`[${this.name}] Disconnected.`);
      this.isLogged = false; // por si reconecta
    });

    this.bot.on("error", (err) => {
      console.error(`[${this.name}] Error:`, err.message);
    });
  }
}

module.exports = Bot;
