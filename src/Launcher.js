



const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");
const BotManager = require("./bots/BotManager");
const WebServer = require("./web/server");

class Launcher {
  constructor() {
    this.rootPath = process.cwd();
    this.configPath = path.join(this.rootPath, "config.json");
    this.config = null;
    this.webServer = null;
  }

  async start() {
    this.printBanner();

    if (this.configExists()) {
      this.loadConfig();
    } else {
      await this.createConfig();
    }

    // Generate web password if it doesn't exist
    if (!this.config.webPassword) {
      this.config.webPassword = crypto.randomBytes(8).toString('hex');
      this.saveConfig();
      console.log("🔐 Web password generated and saved to config.json");
    }

    console.log("\n✅ Configuration loaded successfully\n");

    // Start bot manager first
    console.log("🚀 Starting bot manager...\n");
    const botManager = new BotManager();
    botManager.loadConfig();
    
    const numBots = botManager.config?.accounts?.length || botManager.config?.usernames?.length || 0;
    console.log(`📊 Found ${numBots} bot(s) in configuration\n`);
    
    await botManager.createBots();
    
    console.log("\n✅ All bots initialized\n");

    // Start web server with BotManager reference for real-time updates
    this.startWebServer(botManager);
  }

  startWebServer(botManager) {
    try {
      this.webServer = new WebServer(this.configPath, 3000, botManager);
      this.webServer.start();
    } catch (error) {
      console.error('❌ Error starting web server:', error.message);
    }
  }

  configExists() {
    return fs.existsSync(this.configPath);
  }

  loadConfig() {
    const rawData = fs.readFileSync(this.configPath, "utf-8");
    this.config = JSON.parse(rawData);
  }

  saveConfig() {
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      "utf-8"
    );
  }

  async createConfig() {
    console.log("\n📝 Creating new configuration...\n");

    const discordWebhook = await this.ask(
      "Enter Discord webhook URL (optional, press Enter to skip): "
    );

    const accountsInput = await this.ask(
      "How many accounts do you want to configure? "
    );

    const numAccounts = parseInt(accountsInput);

    if (Number.isNaN(numAccounts) || numAccounts < 1) {
      console.error("❌ Invalid number of accounts.");
      process.exit(1);
    }

    const accounts = [];

    for (let i = 0; i < numAccounts; i++) {
      console.log(`\n--- Account ${i + 1} ---`);
      
      const username = await this.ask("Minecraft username: ");

      // Ask for proxy
      const useProxyAnswer = await this.ask("Use SOCKS5 proxy for this account? (y/n): ");
      let proxy = null;

      if (useProxyAnswer.toLowerCase() === "y") {
        const proxyHost = await this.ask("  Proxy host (e.g. 9.142.35.114): ");
        const proxyPortRaw = await this.ask("  Proxy port (e.g. 1080): ");
        const proxyUser = await this.ask("  Proxy username (leave empty if none): ");
        const proxyPass = await this.ask("  Proxy password (leave empty if none): ");

        const proxyPort = parseInt(proxyPortRaw);

        if (Number.isNaN(proxyPort)) {
          console.error("❌ Invalid proxy port. It must be a number.");
          process.exit(1);
        }

        proxy = {
          host: proxyHost,
          port: proxyPort,
          type: 5
        };

        if (proxyUser.length > 0) proxy.username = proxyUser;
        if (proxyPass.length > 0) proxy.password = proxyPass;
      }

      // Default flips configuration
      const flips = {
        maxBuyPrice: 5000000,
        minProfit: 10000,
        minVolume: 1000,
        maxFlips: 7,
        maxRelist: 3,
        blacklistContaining: [],
        whitelist: ["KISMET_FEATHER"]
      };

      accounts.push({
        username,
        proxy,
        flips,
        enabled: true
      });
    }

    this.config = {
      discordWebhook: discordWebhook || "",
      accounts
    };

    this.saveConfig();
    console.log("\n✅ configuracion.json created successfully.");
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




