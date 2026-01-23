const Bot = require("./Bot");
const path = require("path");
const fs = require("fs");

class BotManager {
  constructor() {
    this.rootPath = process.cwd();
    this.configPath = path.join(this.rootPath, "config.json");
    this.bots = [];
    this.config = null;
}

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    loadConfig() {
        if (!fs.existsSync(this.configPath)) {
        throw new Error("config.json not found. Run the Launcher first.");
        }
        const rawData = fs.readFileSync(this.configPath, "utf-8");
        this.config = JSON.parse(rawData);
    }

    async createBots(delayMs = 2000) {
        if (!this.config || !this.config.usernames) {
            throw new Error("No usernames found in config.");
        }

        for (const username of this.config.usernames) {
            const bot = new Bot(username);
            this.bots.push(bot);
            bot.init("mc.hypixel.net", 25565);
            await this.sleep(delayMs);
        }
    }

    // Función sleep dentro de BotManager
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports = BotManager;
