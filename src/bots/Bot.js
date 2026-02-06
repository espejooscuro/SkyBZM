const mineflayer = require("mineflayer");
const TaskQueue = require("../utils/TaskQueue");
const AutoBoosterCookie = require("../utils/AutoBoosterCookie");
const FlipManager = require("../flips/FlipManager");
const ChatListener = require("../events/ChatListener");
const delay = ms => new Promise(r => setTimeout(r, ms));
const nbt = require('prismarine-nbt');

const originalWrite = process.stdout.write;
process.stdout.write = function(chunk, encoding, callback) {
  if (chunk.toString().includes('Chunk size is' || "Ignoring large array size error")) return true; // ignora
  return originalWrite.call(this, chunk, encoding, callback);
};

class Bot {
  constructor(name) {
    this.name = name;
    this.bot = null;
    this.queue = new TaskQueue();
    this.chat = null;
    this.isLogged = false;
  }

  init(server = "mc.hypixel.net", port = 25565) {
    this.bot = mineflayer.createBot({
      host: server,
      port,
      username: this.name,
      auth: "microsoft",
      version: "1.8.9"
    });



    // 🔹 Desactivar logs de paquetes
    // client.on('packet', (data, meta) => { console.log('[PACKET]', meta.name); });

    // Cuando el servidor entra en CONFIGURATION


    // Reactivar físicas cuando spawnea
    this.bot.once("spawn", () => {
      setTimeout(() => {
        this.bot.physicsEnabled = true;
        console.log("Physics re-enabled");
      }, 2000);
    });

    this.chat = new ChatListener(this.bot, {
      watchList: ["sold", "bought", "coins", "flip", "skyblock", "joined", "Hypixel", "Sending to", "Bazaar"],
      callback: (msg) => {
        console.log(msg.message);
      }
    });

    this.bot.once("spawn", async () => {
      console.log("Bot spawned, waiting for chunks...");
      await this.bot.waitForChunksToLoad();
      console.log("Chunks loaded, bot ready!");
      this.bot.physicsEnabled = true;
    });

    this.bot.on("login", async () => {
      if (this.isLogged) return;
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

      const booster = new AutoBoosterCookie(this.bot, this.chat, this.queue);
      await booster.getBoostercookie() 

      const manager = new FlipManager(this.bot, {
        maxBuyPrice: 10000000,
        minProfit: 2500,
        minVolume: 40000,
        blacklistContaining: ["name"],
        sellTimeout: 150000
      });

      await manager.buildFlips(4);
      
      console.log("\n=== Starting all BUYS ===\n");
      for (const flip of manager.flips) await flip.buy();

      console.log("\nAll tasks finished!");
    });

    
    this.bot.on("end", () => {
      console.log(`[${this.name}] Disconnected.`);
      this.isLogged = false;
    });
    
    this.bot.on('kicked', (reason) => {
      console.log("KICKED:", reason);
    });

    // 🔹 Filtrar PartialReadError de Protodef para no llenar consola
    this.bot.on("error", (err) => {
      if (err.name === "PartialReadError") return;
      console.error(`[${this.name}] Error:`, err.message);
    });
  }
}

module.exports = Bot;
