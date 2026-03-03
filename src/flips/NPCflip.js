const ContainerManager = require('../utils/ContainerManager');
const Flip = require('./Flip');


const delay = (ms) => {
  const jitter = Math.floor(Math.random() * 201) - 100; // rango [-100, +100]
  const finalDelay = Math.max(0, ms + jitter); // evitar negativos

  return new Promise(resolve => setTimeout(resolve, finalDelay));
};

/**
 * NPC Flip - Buy items from NPC and resell on bazaar
 * Properly enqueues tasks to TaskQueue for visibility in Bot Brain
 */
class NPCFlip extends Flip {
  constructor(bot, chatListener, config, queue, api) {
    // Call parent with minimal data
    super(bot, chatListener, {
      itemTag: config.item || config.npcItem || 'UNKNOWN',
      item: config.item || config.npcItem || 'Unknown Item',
      buyPrice: 0,
      sellPrice: 0
    }, queue, api, 0, 0, 0, 0, 0);
    
    this.type = 'NPC';
    this.chatListener = chatListener;
    this.ContainerManager = new ContainerManager(bot);
    // NPC Flip specific config
    this.npcItem = config.item || config.npcItem || '';
    this.forceSellAfter = (config.forceSellAfter || 5) * 60 * 1000; // Convert minutes to ms
    this.enabled = config.enabled !== false;
    
    // State tracking
    this.purchasedItems = new Map(); // Track when items were purchased { timestamp, amount }
    this.isProcessing = false;
    this.lastBuyTime = 0;
    this.buyInterval = 60 * 1000; // Buy every 1 minute (configurable)
    
    this.log(`✅ NPCFlip initialized`);
    this.log(`  Item: ${this.npcItem}`);
    this.log(`  Force sell after: ${config.forceSellAfter || 5} minutes`);
  }
  
  log(...args) {
    console.log(`[${this.bot?.username || 'NPCFlip'}][NPC:${this.npcItem}]`, ...args);
  }
  
  /**
   * Start the NPC flip cycle (called once when initialized)
   */
  start() {
    this.log('🚀 Starting NPC flip cycle...');
    
    // Enqueue initial buy task
    this.enqueueBuy();
    
    // Start the check loop for force selling
    this.startCheckLoop();
  }
  
  /**
   * Enqueue a BUY task
   */
  enqueueBuy() {
    if (!this.enabled) {
      this.log('⏭️ Flip disabled, skipping buy');
      return;
    }
    
    this.log('📦 Enqueueing NPC BUY task...');
    
    this.queue.enqueue(
      async () => {
        this.log('🛒 [BUY NODE] Executing NPC buy task');
        this.log('  → TODO: Navigate to NPC');
        this.log('  → TODO: Open NPC shop');
        this.log('  → TODO: Purchase items');
        
        // ⏱️ Add delay so node is visible in Interactive Map
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Simulate purchase
        const purchaseId = `${this.npcItem}_${Date.now()}`;
        const amount = 710; 
        
        /*        Buy LOGIC          */

        if (!this.active) return; 
        this.ChatListener.send(`/bz ${this.npcItem}`);
        await delay(1500);
        if (!this.active) return;
        this.ContainerManager.click({customName: this.npcItem, type: "container" });
        await delay(1000);
        if (!this.active) return;
        this.ContainerManager.click({customName: "Create Buy Order", type: "container" });
        await delay(1000);
        if (!this.active) return;
        this.ContainerManager.click({customName: "Custom Amount", type: "container" });
        await delay(1000);
        if (!this.active) return;
        this.ContainerManager.interactWithSign(amount);
        await delay(1000);
        if (!this.active) return;
        this.ContainerManager.click({customName: "Top Order +0.1", type: "container" });
        await delay(1850);
        if (!this.active) return;
        const lore = this.ContainerManager.getItemDescription({customName: "Buy Order"}, true);
        const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
        this.instaBuyPrice = price;
        console.log(price);
        if (!this.active) return;
        this.ContainerManager.click({customName: "Buy Order", type: "container" });
        console.log(`Finished buying ${this.item}...`);
        await delay(1000);
        if (!this.active) return;








        this.purchasedItems.set(purchaseId, {
          timestamp: Date.now(),
          amount: amount
        });
        
        this.lastBuyTime = Date.now();
        
        this.log(`  ✅ Simulated purchase: ${amount}x ${this.npcItem}`);
        
        // Enqueue next buy task after interval
        setTimeout(() => {
          this.enqueueBuy();
        }, this.buyInterval);
        
        return true;
      },
      {
        type: 'npcbuy',
        item: this.npcItem,
        itemTag: this.itemTag,
        description: `Buy ${this.npcItem} from NPC`
      }
    );
  }
  
  /**
   * Enqueue a SELL task for a specific purchase
   */
  enqueueSell(purchaseId, purchaseData) {
    this.log(`💰 Enqueueing NPC SELL task for ${purchaseId}...`);
    
    this.queue.enqueue(
      async () => {
        this.log('💸 [SELL NODE] Executing NPC sell task');
        this.log(`  → Item: ${this.npcItem}`);
        this.log(`  → Amount: ${purchaseData.amount}`);
        this.log('  → TODO: Open bazaar');
        this.log('  → TODO: Create sell order');
        this.log('  → TODO: Monitor fill status');
        
        // ⏱️ Add delay so node is visible in Interactive Map
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Remove from tracking
        this.purchasedItems.delete(purchaseId);
        
        this.log(`  ✅ Simulated sell: ${purchaseData.amount}x ${this.npcItem}`);
        
        return true;
      },
      {
        type: 'npcsell',
        item: this.npcItem,
        itemTag: this.itemTag,
        description: `Sell ${this.npcItem} on Bazaar`
      }
    );
  }
  
  /**
   * Start the loop that checks for force-sell conditions
   */
  startCheckLoop() {
    const checkInterval = 10 * 1000; // Check every 10 seconds
    
    const checkFn = () => {
      if (!this.enabled) return;
      
      this.checkForceSell();
      
      setTimeout(checkFn, checkInterval);
    };
    
    setTimeout(checkFn, checkInterval);
  }
  
  /**
   * Check if any purchased items need to be force-sold
   */
  checkForceSell() {
    const now = Date.now();
    
    for (const [purchaseId, purchaseData] of this.purchasedItems.entries()) {
      const timeSincePurchase = now - purchaseData.timestamp;
      
      if (timeSincePurchase >= this.forceSellAfter) {
        this.log(`⏰ Force sell triggered for ${purchaseId}`);
        this.log(`  → Held for ${Math.round(timeSincePurchase / 60000)} minutes`);
        
        // Enqueue sell task
        this.enqueueSell(purchaseId, purchaseData);
      }
    }
  }
  
  /**
   * Get status information
   */
  getStatus() {
    return {
      type: this.type,
      enabled: this.enabled,
      npcItem: this.npcItem,
      forceSellAfter: this.forceSellAfter / 60000, // Convert back to minutes
      isProcessing: this.isProcessing,
      itemsHeld: this.purchasedItems.size,
      lastBuyTime: this.lastBuyTime
    };
  }
  
  /**
   * Update configuration (called from web panel)
   */
  updateConfig(newConfig) {
    if (newConfig.item !== undefined || newConfig.npcItem !== undefined) {
      this.npcItem = newConfig.item || newConfig.npcItem;
      this.itemTag = this.npcItem;
      this.log(`📝 Updated item to: ${this.npcItem}`);
    }
    
    if (newConfig.forceSellAfter !== undefined) {
      this.forceSellAfter = newConfig.forceSellAfter * 60 * 1000; // Convert minutes to ms
      this.log(`📝 Updated force sell time to: ${newConfig.forceSellAfter} minutes`);
    }
    
    if (newConfig.enabled !== undefined) {
      this.enabled = newConfig.enabled;
      this.log(`📝 Flip ${this.enabled ? 'enabled' : 'disabled'}`);
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.log('🧹 Destroying NPC flip...');
    this.enabled = false;
    this.purchasedItems.clear();
    this.isProcessing = false;
  }
}

module.exports = NPCFlip;


