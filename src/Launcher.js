const fs = require("fs");
const path = require("path");
const readline = require("readline");
const BotManager = require("./bots/BotManager");

class Launcher {
  constructor() {
    this.rootPath = process.cwd();
    this.configPath = path.join(this.rootPath, "config.json");
    this.config = null;
  }

  async start() {
    this.printBanner();

    if (this.configExists()) {
      this.loadConfig();
    } else {
      await this.createConfig();
    }

    console.log("\nConfiguration loaded successfully:");
    console.log(this.config);

    const botManager = new BotManager();
    botManager.loadConfig();
    botManager.createBots();
  }

  configExists() {
    return fs.existsSync(this.configPath);
  }

  loadConfig() {
    const rawData = fs.readFileSync(this.configPath, "utf-8");
    this.config = JSON.parse(rawData);
  }

  async createConfig() {
    const usernamesInput = await this.ask(
      "Enter usernames separated by a single space: "
    );

    const usernames = usernamesInput
      .split(" ")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const discordWebhook = await this.ask(
      "Enter Discord webhook URL: "
    );

    const flips = {
      maxBuyPrice: 5000000,
      minProfit: 10000,
      minVolume: 1000,

      maxFlips: 7,      // máximo número de flips simultáneos
      maxRelist: 3,     // máximo de relist por flip

      blacklistContaining: ["name1", "name2"],

      whitelist: [
        "KISMET_FEATHER"
      ]
    };


    this.config = {
      usernames,
      discordWebhook,
      flips
    };

    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      "utf-8"
    );

    console.log("\nconfig.json created successfully.");
  }

  ask(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  printBanner() {
    const title = "SkyBZM Launcher";
    const padding = 4;
    const contentWidth = title.length + padding * 2;
    const topBottom = "─".repeat(contentWidth);

    console.log(`\n┌${topBottom}┐`);
    console.log(`│${" ".repeat(padding)}${title}${" ".repeat(padding)}│`);
    console.log(`└${topBottom}┘\n`);
  }
}

if (require.main === module) {
  const launcher = new Launcher();
  launcher.start();
}

module.exports = Launcher;
