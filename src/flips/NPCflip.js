



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
      item: 'Loading...', // Will be updated after fetching
      buyPrice: 0,
      sellPrice: 0
    }, queue, api, 0, 0, 0, 0, 0);
    
    this.type = 'NPC';
    this.chatListener = chatListener;
    
    // Store both the class and instance for ContainerManager
    const ContainerManagerClass = require('../utils/ContainerManager');
    this.ContainerManager = new ContainerManagerClass(bot);
    this._ContainerManagerClass = ContainerManagerClass;
    
    // NPC Flip specific config
    this.npcItemTag = config.item || config.npcItem || ''; // Store the item tag
    this.npcItem = 'Loading...'; // Will be populated with the actual item name
    this.forceSellAfter = (config.forceSellAfter || 5) * 60 * 1000; // Convert minutes to ms
    this.enabled = config.enabled !== false;
    
    // State tracking
    this.purchasedItems = new Map(); // Track when items were purchased { timestamp, amount, timer }
    this.isProcessing = false;
    this.lastBuyTime = 0;
    this.buyInterval = 60 * 1000; // Buy every 1 minute (configurable)
    this.activePurchases = new Set(); // Track which purchases are already being sold
    
    // Fetch the actual item name from the API
    this.fetchItemName();
    
    // Setup chat listener for buy order filled messages
    this.setupBuyOrderListener();
  }
  
  /**
   * Setup listener for "buy order was filled" messages
   */
  setupBuyOrderListener() {
    this.chatListener.onMessageContains('buy order', (msg) => {
      const text = msg.message.toLowerCase();
      
      // Check if message contains item name and "buy order" and "was filled"
      if (text.includes(this.npcItem.toLowerCase()) && 
          text.includes('buy order') && 
          text.includes('was filled')) {
        
        // Find the most recent purchase and trigger sell
        if (this.purchasedItems.size > 0) {
          // Get the most recent purchase that hasn't been processed yet
          const entries = Array.from(this.purchasedItems.entries())
            .filter(([id]) => !this.activePurchases.has(id));
          
          if (entries.length === 0) {
            return;
          }
          
          const [purchaseId, purchaseData] = entries[entries.length - 1];
          
          // Cancel the force-sell timer
          if (purchaseData.timer) {
            clearTimeout(purchaseData.timer);
          }
          
          // Mark as being processed
          this.activePurchases.add(purchaseId);
          this.enqueueSell(purchaseId, purchaseData);
        }
      }
    });
  }
  
  /**
   * Fetch the actual item name using getBazaarSnapshot
   */
  async fetchItemName() {
    try {
      if (!this.npcItemTag) {
        this.npcItem = 'Unknown Item';
        this.log('⚠️ No item tag provided');
        return;
      }
      
      const snapshot = await this.api.getBazaarSnapshot(this.npcItemTag);
      this.npcItem = snapshot.item;
      this.item = snapshot.item;
      this.itemTag = snapshot.itemTag;
    } catch (error) {
      this.npcItem = this.npcItemTag;
      this.item = this.npcItemTag;
    }
  }
  
  log(...args) {
    console.log(`[${this.bot?.username || 'NPCFlip'}][NPC:${this.npcItem}]`, ...args);
  }
  
  /**
   * Start the NPC flip cycle (called once when initialized)
   */
  async start() {
    
    // Wait for item name to be fetched before starting
    if (this.npcItem === 'Loading...') {
      await this.fetchItemName();
    }
    
    // Enqueue initial buy task
    this.enqueueBuy();
  }
  
  /**
   * Enqueue a BUY task
   */
  enqueueBuy() {
    if (!this.enabled) {
      this.log('⏭️ Flip disabled, skipping buy');
      return;
    }
    
    
    this.queue.enqueue(
      async () => {
        
        // ⏱️ Add delay so node is visible in Interactive Map
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // First, check if buy order already exists
        this.ContainerManager.closeContainer();
        await delay(1300);
        this.chatListener.send('/managebazaarorders');
        await delay(1300);
        const containerName = this.ContainerManager.getOpenContainerName();
        
        // Check if buy order exists in current window
        const hasBuyOrder = this.ContainerManager.hasItemInContainer({ 
          contains: `buy ${this.npcItem.toLowerCase()}`, 
          type: "container" 
        });
        
        if (hasBuyOrder) {
          this.log(`   Found existing buy order for ${this.npcItem}, skipping to SELL`);
          this.ContainerManager.closeContainer();
          await delay(500);
          
          // Create a purchase ID and enqueue sell immediately
          const purchaseId = `${this.npcItem}_${Date.now()}`;
          const amount = 71000; // Default amount
          
          this.purchasedItems.set(purchaseId, {
            timestamp: Date.now(),
            amount: amount,
            timer: null
          });
          
          this.activePurchases.add(purchaseId);
          const data = this.purchasedItems.get(purchaseId);
          this.enqueueSell(purchaseId, data);
          return true;
        }

        this.ContainerManager.closeContainer();
        await delay(1000);
        
        // Simulate purchase
        const purchaseId = `${this.npcItem}_${Date.now()}`;
        const amount = 71000; 

        /*        Buy LOGIC          */

        if (!this.enabled) {
          return;
        }
        
        this.chatListener.send(`/bz ${this.npcItem}`);
        await delay(1500);
        
        if (!this.enabled) {
          return;
        }
        this.ContainerManager.click({customName: this.npcItem, type: "container" });
        await delay(1000);
        
        if (!this.enabled) {
          return;
        }

        this.ContainerManager.click({customName: "Create Buy Order", type: "container" });
        await delay(1000);
        
        if (!this.enabled) {
          return;
        }

        this.ContainerManager.click({customName: "Custom Amount", type: "container" });
        await delay(1000);
        
        if (!this.enabled) {

          return;
        }

        this.ContainerManager.interactWithSign(amount);
        await delay(1000);
        
        if (!this.enabled) {
          return;
        }

        this.ContainerManager.click({customName: "Top Order +0.1", type: "container" });
        await delay(1850);
        
        if (!this.enabled) {
          return;
        }

        const lore = this.ContainerManager.getItemDescription({customName: "Buy Order"}, true);
        const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
        this.instaBuyPrice = price;
        
        if (!this.enabled) {
          return;
        }
        this.ContainerManager.click({customName: "Buy Order", type: "container" });
        await delay(1000);
        
        if (!this.enabled) {
          return;
        }

        this.purchasedItems.set(purchaseId, {
          timestamp: Date.now(),
          amount: amount,
          timer: null // Will be set below
        });
        
        console.log(`💰 [${this.bot?.username}][NPC:${this.npcItem}] BUY ORDER PLACED - ${amount}x @ ${price.toLocaleString()} coins`);
        
        // 📊 Registrar acción para estadísticas
        if (this.bot && typeof this.bot.recordFlipAction === 'function') {
          this.bot.recordFlipAction('npcbuy', this.npcItem);
        }
        
        const forceSellTimer = setTimeout(() => {
          if (!this.activePurchases.has(purchaseId) && this.purchasedItems.has(purchaseId)) {
            
            // Mark as being processed
            this.activePurchases.add(purchaseId);
            
            // Enqueue sell task
            const data = this.purchasedItems.get(purchaseId);
            this.enqueueSell(purchaseId, data);
          }
        }, this.forceSellAfter);
        
        // Store the timer ID
        this.purchasedItems.get(purchaseId).timer = forceSellTimer;
        
        this.lastBuyTime = Date.now();
        

        
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
    
    this.queue.enqueue(
      async () => {
        // ⏱️ Add delay so node is visible in Interactive Map
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const buyOrderName = `BUY ${this.npcItem}`;
        let finishedCollecting = false;
        
        this.ContainerManager.closeContainer();
        await delay(1300);
        this.chatListener.send('/managebazaarorders');
        await delay(1300);
        
        const containerName = this.ContainerManager.getOpenContainerName();
        
        // Main collection loop - stay in same GUI and claim all available orders
        let claimedCount = 0;
        while (!finishedCollecting) {
          if (!this.enabled) {
            this.log('   ⚠️ Flip disabled during claiming, aborting...');
            break;
          }
          
          // Check if buy order exists in current window
          const hasBuyOrder = this.ContainerManager.hasItemInContainer({ 
            contains: `buy ${this.npcItem.toLowerCase()}`, 
            type: "container" 
          });
          
          if (!hasBuyOrder) {
            this.log(`  ✅ Claimed ${claimedCount} buy orders`);
            finishedCollecting = true;
            break;
          }
          
          // Check if inventory is mostly full
          if (this.ContainerManager.isInventoryMostlyFull()) {
            this.log(`   ⚠️ Inventory is mostly full, waiting...`);
            const startTime = Date.now();
            while (this.ContainerManager.isInventoryMostlyFull()) {
              if (Date.now() - startTime >= 3000) {
                this.log('  ⚠️ Inventory full, stopping collection');
                finishedCollecting = true;
                break;
              }
              await delay(50);
            }
            if (finishedCollecting) break;
          }
          
          await this.ContainerManager.click({ contains: this.npcItem, type: 'container' });
          await delay(800); // Wait for claim to process
          claimedCount++;
          
          const currentContainer = this.ContainerManager.getOpenContainerName();
          
          if (this.ContainerManager.getOpenContainerName() == "order options" || this.ContainerManager.hasItemInContainer( {contains: "cancel order", type: "container"} )) {
            await this.ContainerManager.click({ customName: "Cancel Order", type: 'container' });
          }
          // Check again if more orders exist (without closing/reopening)
          await delay(200);
        }
        
        this.ContainerManager.closeContainer();
        await delay(500);
        
        // Now sell items via booster cookie
        if (this.enabled) {
          
          this.ContainerManager.closeContainer();
          await delay(1000);
          this.chatListener.send('/boostercookie');
          
          let containerOpened = false;
          let attempts = 0;
          const maxWaitAttempts = 10;
          
          while (!containerOpened && attempts < maxWaitAttempts) {
            await delay(500);
            const containerName = this.ContainerManager.getOpenContainerName() || '';            
            if (containerName.includes('cookie') || containerName.includes('booster')) {
              containerOpened = true;
            }
            attempts++;
          }
          
          if (!containerOpened) {
            this.purchasedItems.delete(purchaseId);
            this.activePurchases.delete(purchaseId);
            return false;
          }
        
          const allInventoryItems = this.ContainerManager.getValidInventoryItems();
          
          const itemsToClick = allInventoryItems.filter(item => {
            if (!item || !item.customName) return false;
            const cleanName = this.cleanItemName(item.customName);
            return cleanName.toLowerCase().includes(this.npcItem.toLowerCase());
          });
          
          for (const item of itemsToClick) {
            if (!this.enabled) break;
            
            const itemName = this.cleanItemName(item.customName);
            
            let clickAttempts = 0;
            const maxAttempts = 20;
            
            let lastClickedSlot = null;
            
            while (this.ContainerManager.hasItemInContainer({ contains: itemName, type: 'inventory' }) && 
                   clickAttempts < maxAttempts) {
              if (!this.enabled) break;
              
              const currentInventoryItems = this.ContainerManager.getValidInventoryItemsFromWindow();
              const matchingItem = currentInventoryItems.find(i => {
                if (!i || !i.customName) return false;
                const cleanName = this.cleanItemName(i.customName);
                return cleanName.toLowerCase().includes(itemName.toLowerCase());
              });
              
              if (!matchingItem) {
                break;
              }
              
              const targetSlot = matchingItem.slot;
              const targetWindowSlot = matchingItem.windowSlot;
              
              
              if (lastClickedSlot === targetSlot) {
                await delay(800);
                
                const recheckItems = this.ContainerManager.getValidInventoryItemsFromWindow();
                const recheck = recheckItems.find(i => 
                  i.slot === targetSlot && 
                  this.cleanItemName(i.customName).toLowerCase().includes(itemName.toLowerCase())
                );
                
                if (!recheck) {
                  lastClickedSlot = null;
                  continue;
                }
              }
              
              await this.ContainerManager.click({}, 0, 0, targetWindowSlot);
              
              lastClickedSlot = targetSlot;
              await delay(500);
              clickAttempts++;
            }
            
            this.log(`  ✅ Sold ${itemName} (${clickAttempts} clicks)`);
          }

          this.ContainerManager.closeContainer();
          await delay(500);
        }
        
        console.log(`💵 [${this.bot?.username}][NPC:${this.npcItem}] SELL COMPLETED - Sold all items to Bazaar`);
        
        // 📊 Registrar acción para estadísticas
        if (this.bot && typeof this.bot.recordFlipAction === 'function') {
          this.bot.recordFlipAction('npcsell', this.npcItem);
        }
        
        // Remove from tracking
        this.purchasedItems.delete(purchaseId);
        this.activePurchases.delete(purchaseId);
        
        this.log(`✅ Sell complete for ${this.npcItem}`);
        
        // Enqueue next buy task to continue the cycle
        if (this.enabled) {
          this.log('🔄 Enqueueing next buy task...');
          this.enqueueBuy();
        }
        
        this.log('═══════════════════════════════════════════════════');
        
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
   * Clean item name (remove color codes, etc.)
   */
  cleanItemName(name) {
    if (!name) return '';
    // Remove Minecraft color codes (§x)
    return name.replace(/§[0-9a-fk-or]/gi, '').trim();
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
      const newItemTag = newConfig.item || newConfig.npcItem;
      if (newItemTag !== this.npcItemTag) {
        this.npcItemTag = newItemTag;
        this.itemTag = newItemTag;
        this.log(`📝 Updated item to: ${newItemTag}`);
        this.fetchItemName(); // Refetch the item name
      }
    }
    
    if (newConfig.forceSellAfter !== undefined) {
      this.forceSellAfter = newConfig.forceSellAfter * 60 * 1000; // Convert minutes to ms
      this.log(`📝 Updated force sell time to: ${newConfig.forceSellAfter} minutes`);
    }
    
    if (newConfig.enabled !== undefined) {
      const wasEnabled = this.enabled;
      this.enabled = newConfig.enabled;
      this.log(`📝 Flip ${this.enabled ? 'enabled' : 'disabled'}`);
      
      // If enabling after being disabled, start the cycle
      if (!wasEnabled && this.enabled) {
        this.log('🔄 Restarting NPC flip cycle...');
        this.enqueueBuy();
      }
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.log('🧹 Destroying NPC flip...');
    this.enabled = false;
    
    // Cancel all pending force-sell timers
    for (const [purchaseId, purchaseData] of this.purchasedItems.entries()) {
      if (purchaseData.timer) {
        clearTimeout(purchaseData.timer);
        this.log(`  ⏰ Cancelled timer for ${purchaseId}`);
      }
    }
    
    this.purchasedItems.clear();
    this.activePurchases.clear();
    this.isProcessing = false;
    
    this.log('  ✅ Cleanup complete');
  }
}

module.exports = NPCFlip;




