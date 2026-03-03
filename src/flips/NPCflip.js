const Flip = require('./Flip');

/**
 * NPC Flip - Buy items from NPC and resell on bazaar
 * This is a basic implementation that will be expanded
 */
class NPCFlip extends Flip {
  constructor(bot, config) {
    super(bot, config);
    this.type = 'NPC';
    
    // NPC Flip specific config
    this.npcItem = config.npcItem || '';
    this.forceSellAfter = config.forceSellAfter || 5; // minutes
    
    // State tracking
    this.purchasedItems = new Map(); // Track when items were purchased
    this.isProcessing = false;
    
    console.log(`[NPCFlip] Initialized for bot ${bot.username}`);
    console.log(`[NPCFlip] Item: ${this.npcItem}`);
    console.log(`[NPCFlip] Force sell after: ${this.forceSellAfter} minutes`);
  }
  
  /**
   * Check if this flip is ready to execute
   */
  async canExecute() {
    if (!this.enabled) {
      return false;
    }
    
    if (!this.npcItem) {
      console.log('[NPCFlip] No item configured');
      return false;
    }
    
    if (this.isProcessing) {
      console.log('[NPCFlip] Already processing');
      return false;
    }
    
    return true;
  }
  
  /**
   * Execute the NPC flip
   */
  async execute() {
    console.log('[NPCFlip] Execute called - Hello World from NPCFlip!');
    
    try {
      this.isProcessing = true;
      
      // TODO: Implement actual NPC flip logic
      // For now, just log
      console.log(`[NPCFlip] Would buy ${this.npcItem} from NPC`);
      console.log(`[NPCFlip] Would sell after ${this.forceSellAfter} minutes`);
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('[NPCFlip] Execution complete (placeholder)');
      
    } catch (error) {
      console.error('[NPCFlip] Error during execution:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * Check if any purchased items need to be force-sold
   */
  async checkForceSell() {
    const now = Date.now();
    const forceSellMs = this.forceSellAfter * 60 * 1000;
    
    for (const [itemId, purchaseTime] of this.purchasedItems.entries()) {
      if (now - purchaseTime >= forceSellMs) {
        console.log(`[NPCFlip] Force selling ${itemId} (held for ${this.forceSellAfter} minutes)`);
        // TODO: Implement force sell logic
        this.purchasedItems.delete(itemId);
      }
    }
  }
  
  /**
   * Track a purchased item
   */
  trackPurchase(itemId, amount) {
    this.purchasedItems.set(itemId, Date.now());
    console.log(`[NPCFlip] Tracked purchase: ${amount}x ${itemId}`);
  }
  
  /**
   * Get status information
   */
  getStatus() {
    return {
      type: this.type,
      enabled: this.enabled,
      npcItem: this.npcItem,
      forceSellAfter: this.forceSellAfter,
      isProcessing: this.isProcessing,
      itemsHeld: this.purchasedItems.size
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    super.updateConfig(newConfig);
    
    if (newConfig.npcItem !== undefined) {
      this.npcItem = newConfig.npcItem;
      console.log(`[NPCFlip] Updated item to: ${this.npcItem}`);
    }
    
    if (newConfig.forceSellAfter !== undefined) {
      this.forceSellAfter = newConfig.forceSellAfter;
      console.log(`[NPCFlip] Updated force sell time to: ${this.forceSellAfter} minutes`);
    }
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.purchasedItems.clear();
    this.isProcessing = false;
    console.log('[NPCFlip] Cleanup complete');
  }
}

module.exports = NPCFlip;
