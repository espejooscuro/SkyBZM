const mineflayer = require("mineflayer");

class Bot {
  constructor(name) {
    this.name = name;
    this.bot = null; 
  }

  init(server = "mc.hypixel.net", port = 25565) {
    this.bot = mineflayer.createBot({
      host: server,  
      port: port,     
      username: this.name,
      auth: 'microsoft',
      version: "1.8.9" 
    });

    this.bot.on("login", () => {
      console.log(`[${this.name}] Connected to the server!`);
    });

    this.bot.on("end", () => {
      console.log(`[${this.name}] Disconnected from the server.`);
    });

    this.bot.on("spawn", () => {
      console.log(`[${this.name}] Spawned in the world at`, this.bot.entity.position);
    });

    this.bot.on("error", (err) => {
      console.error(`[${this.name}] Error:`, err.message);
    });
  }
}

module.exports = Bot;
