


const ContainerManager = require('../utils/ContainerManager');
const ChatListener = require('../events/ChatListener');

const delay = (ms) => {
  const jitter = Math.floor(Math.random() * 201) - 100; // rango [-100, +100]
  const finalDelay = Math.max(0, ms + jitter); // evitar negativos

  return new Promise(resolve => setTimeout(resolve, finalDelay));
};


function formatPrice(num) {
  return num.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}


function stripColors(str) {
  return str.replace(/§./g, '');
}


function formatNumber(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

class Flip {
  constructor(bot, ChatListener, data, queue, api, sellTimeout = 300_000, maxSpend = Infinity, defaultSpread = 0.05, maxRelist = 5, maxBuyRelist = 3) {
    this.item = stripColors(String(data.item || "unknown")).toLowerCase();
    this.itemTag = stripColors(String(data.itemTag || data.item || "unknown"));


    this.instaBuyPrice = Number(data.sellPrice) || 1;
    this.instaSellPrice = Number(data.buyPrice) || this.instaBuyPrice * 1.05;

    this.queue = queue;
    this.api = api;

    this.relistCounter = 0;
    this.buyRelistCounter = 0;
    this.maxRelist = maxRelist || 5;
    this.maxBuyRelist = maxBuyRelist || 3;
    this.sellTimeout = sellTimeout;
    this.maxSpend = Number(maxSpend) || Infinity;
    this.defaultSpread = defaultSpread;
    this.finishTimer = null;
    this.bought = false;
    this.sellExecuted = false;
    this.isSelling = false;  //Bloquea el relist mientras está vendiendo..
    this.isBuyRellisting = false; 
    this.active = true;          // estado general del flip
    this.sellTimer = null;
    this.priceWatcher = null;
    this.buyFilled = false;
    this.orderFilled = false;
    this.flipFinished = false;
    this.amountToBuy = Math.max(1, Math.floor(this.calculateAmount(data) || 1));
    this.bot = bot;
    this.ContainerManager = new ContainerManager(this.bot);
    this.ChatListener = ChatListener;
    this.onFinish = null; // callback externo
    this.startTime = Date.now(); // Timestamp de inicio
    
    // Callback para guardar estado después de cada operación
    this.onStateChange = null;
  }

  // 🔥 Serializar el estado del flip para guardarlo
  serialize() {
    return {
      itemTag: this.itemTag,
      item: this.item,
      active: this.active,
      bought: this.bought,
      buyFilled: this.buyFilled,
      sellExecuted: this.sellExecuted,
      isSelling: this.isSelling,
      isBuyRellisting: this.isBuyRellisting,
      orderFilled: this.orderFilled,
      flipFinished: this.flipFinished,
      instaBuyPrice: this.instaBuyPrice,
      instaSellPrice: this.instaSellPrice,
      sellReferencePrice: this.sellReferencePrice,
      amountToBuy: this.amountToBuy,
      buyRelistCounter: this.buyRelistCounter,
      relistCounter: this.relistCounter,
      moneyPerFlip: this.maxSpend,
      startTime: this.startTime || Date.now()
    };
  }

  // Notificar cambio de estado
  notifyStateChange() {
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.serialize());
    }
  }

  calculateAmount(data) {
    const volumeFactor = Math.min(Number(data.volume || 1) / 100_000, 1);
    const spreadFactor = 1 + (1 - volumeFactor) * this.defaultSpread;
    return (this.maxSpend / this.instaBuyPrice) / spreadFactor;
  }

  async buy() {
    // 🔥 Guardar metadata del nodo en la cola
    return this.queue.enqueue(async () => {
      if (!this.active || this.bought) return;
      this.bought = true;
      
      // 🔥 Notificar cambio de estado
      if (typeof this.onStateChange === 'function') {
        this.onStateChange();
      }

      const totalSpent = this.amountToBuy * this.instaBuyPrice;
      console.log(`Buying ${this.amountToBuy}x ${this.item} [${this.itemTag}] for ${formatPrice(this.instaBuyPrice)} each → Total spent: ${formatNumber(totalSpent)}`);
      await delay(1100);

      if (!this.active) return; // 🔥 Check antes de cada operación
      this.ChatListener.send(`/bz ${this.item}`);
      await delay(1500);
      if (!this.active) return;
      this.ContainerManager.click({customName: this.item, type: "container" });
      await delay(1000);
      if (!this.active) return;
      this.ContainerManager.click({customName: "Create Buy Order", type: "container" });
      await delay(1000);
      if (!this.active) return;
      this.ContainerManager.click({customName: "Custom Amount", type: "container" });
      await delay(1000);
      if (!this.active) return;
      this.ContainerManager.interactWithSign(this.amountToBuy);
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
      
      this.notifyStateChange();
      this.startSellTimer();
      this.startPriceWatcher();
    }, { 
      type: 'buy', 
      item: this.item, 
      itemTag: this.itemTag,
      flipState: this.serialize()
    });
  }

  async sell(endedByTimeout = false, buyRelistSell = false) {
    this.isSelling = true;
    return this.queue.enqueue(async () => {
      await this.sellInline(endedByTimeout, buyRelistSell);
    }, {
      type: 'sell',
      item: this.item,
      itemTag: this.itemTag,
      endedByTimeout,
      buyRelistSell,
      flipState: this.serialize()
    });
  }

  // 🔥 Método inline para ejecutar venta SIN encolar (para usar dentro de otros nodos)
  async sellInline(endedByTimeout = false, buyRelistSell = false) {
    if (!this.active || !this.bought || this.sellExecuted) {
      this.isSelling = false;
      return;
    }

    this.sellExecuted = true;           // marcar venta inmediatamente
    this.clearSellTimer();
    this.notifyStateChange();

    let currentSellPrice = this.instaSellPrice;
    try {
      const snapshot = await this.api.getBazaarSnapshot(this.itemTag);
      currentSellPrice = Number(snapshot.buyPrice);
    } catch (err) {
      console.warn(`Error fetching sell price for ${this.itemTag}, using fallback: ${err}`);
    }

    // Actualizar referencia antes del delay
    this.sellReferencePrice = currentSellPrice;

    const totalEarned = this.amountToBuy * currentSellPrice;
    console.log(`Selling ${this.amountToBuy}x ${this.item} [${this.itemTag}] for ${formatPrice(currentSellPrice)} each → Total earned: ${formatNumber(totalEarned)}`);

    await delay(1000);
    
    if (!this.active) {
      this.isSelling = false;
      return;
    }
    
    if (buyRelistSell) {
      this.ChatListener.send("/managebazaarorders");
      await delay(1000);
      if (!this.active) { this.isSelling = false; return; }
      if (!this.ContainerManager.hasItemInContainer({contains: this.item, type: "container"})) {
        console.log("Después de borar el BuyOrder no se encuentra ningun item en el inventario. Cerrando flip..");
        await this.finishFlipInline(endedByTimeout, true);
      } else {
        await delay(1400);
        if (!this.active) { this.isSelling = false; return; }
        this.ChatListener.send(`/bz ${this.item}`); 
        await delay(1500);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({customName: this.item, type: "container" });
        await delay(1400);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({ contains: "Create Sell Offer"});
        await delay(1300);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({ contains: "Best Offer -0.1" });
        await delay(1200);
        if (!this.active) { this.isSelling = false; return; }
        const lore = this.ContainerManager.getItemDescription({customName: "Sell Offer"}, true);
        const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
        this.instaSellPrice = price;
        console.log(price);
        console.log(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({ contains: "Sell Offer"});
          await delay(1000);
      }
    } else {
      await delay(1000);
      if (!this.active) { this.isSelling = false; return; }
      this.ChatListener.send("/managebazaarorders");
      await delay(1000);
      if (!this.active) { this.isSelling = false; return; }
      while (this.active && this.ContainerManager.hasItemInContainer({contains: `BUY ${this.item}`})) {
        await delay(2000);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({contains: `BUY ${this.item}`});
        await delay(1000);
        if (!this.active) { this.isSelling = false; return; }
        if (this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
          await delay(1000);
          if (!this.active) { this.isSelling = false; return; }
          this.ContainerManager.click({contains: `Cancel Order`});
          await delay(1000);
          }
        }
        if (!this.active) { this.isSelling = false; return; }
        if (!this.ContainerManager.hasItemInContainer({contains: this.item, type: "container"})) {
        console.log("Después de borar el BuyOrder no se encuentra ningun item en el inventario. Cerrando flip..");
        await this.finishFlipInline(endedByTimeout, true);
      } else {
        await delay(1000);
        if (!this.active) { this.isSelling = false; return; }
        this.ChatListener.send(`/bz ${this.item}`); 
        await delay(1500);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({customName: this.item, type: "container" });
        await delay(1000);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({ contains: "Create Sell Offer"});
        await delay(1300);
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({ contains: "Best Offer -0.1" });
        await delay(1200);
        if (!this.active) { this.isSelling = false; return; }
        const lore = this.ContainerManager.getItemDescription({customName: "Sell Offer"}, true);
        const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
        this.instaSellPrice = price;
        console.log(price);
        console.log(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
        if (!this.active) { this.isSelling = false; return; }
        this.ContainerManager.click({ contains: "Sell Offer"});
        await delay(1000);
        }
      }

    this.isSelling = false;
    this.notifyStateChange();
    
    if (!this.active) return;
    this.finishTimer = setTimeout(() => {
      if (!this.active || this.flipFinished) return;
      this.finishFlip(endedByTimeout);
    }, 300_000);
  }

  startSellTimer() {
    this.sellTimer = setTimeout(() => {
      if (!this.active || this.flipFinished || this.sellExecuted) return;
      console.log("Sell timer fired");
      this.sell(true);
    }, this.sellTimeout);
  }


  clearSellTimer() {
  if (this.sellTimer) {
    clearTimeout(this.sellTimer);
    this.sellTimer = null;
  }
}


  startPriceWatcher() {
    this.priceWatcher = setInterval(async () => {
      if (!this.active) return;

      try {
        const snapshot = await this.api.getBazaarSnapshot(this.itemTag);
        const apiBuyPrice = Math.round(Number(snapshot.sellPrice) * 10) / 10;
        const apiSellPrice = Math.round(Number(snapshot.buyPrice) * 10) / 10;


        // Relist de compra solo antes de vender
        if (this.bought && !this.sellExecuted && apiBuyPrice > this.instaBuyPrice && !this.flipFinished && !this.isBuyRellisting) {
          console.log(`BUY price increased for ${this.item} [${this.itemTag}]: ${formatPrice(this.instaBuyPrice)} → ${formatPrice(apiBuyPrice)}`);
          this.buyRelist();
        }

        // Relist de venta solo después de vender
        if (this.sellExecuted && apiSellPrice < this.instaSellPrice && this.flipFinished == false && !this.isSelling) {
          console.log(`SELL price decreased for ${this.item} [${this.itemTag}]: ${formatPrice(this.instaSellPrice)} → ${formatPrice(apiSellPrice)}`);
          this.instaSellPrice = apiSellPrice;
          this.sellRelist();
        } 

      } catch (err) {
        console.warn(`Error checking prices for ${this.itemTag}: ${err}`);
      }
    }, 5000);
  }

    /**
   * Extrae el número de un lore tipo "Price per unit: 287,902.4 coins"
   * @param {string} line - La línea del lore
   * @returns {number} - El valor numérico con decimales
   */
  _parsePriceFromLoreLine(line) {
    if (!line || typeof line !== "string") return 0;

    const cleanLine = line.replace(/§[0-9a-fk-or]/gi, '').trim();

    const match = cleanLine.match(/([\d,]+(?:\.\d+)?)/);

    if (!match) return 0;

    const numericString = match[1].replace(/,/g, '');
    const value = parseFloat(numericString);

    return isNaN(value) ? 0 : value;
  }


  async buyRelist() {
    console.log(`🔄 [BUY RELIST] Starting for ${this.item} [${this.itemTag}] - Attempt ${this.buyRelistCounter + 1}/${this.maxBuyRelist}`);
    this.isBuyRellisting = true;
    
    return this.queue.enqueue(async () => {
      if (!this.active) { 
        this.isBuyRellisting = false; 
        return; 
      }
      
      // ============================================
      // CASO 1: VERIFICAR SI SE PASÓ EL LÍMITE DE RELIST
      // ============================================
      if (this.buyRelistCounter >= this.maxBuyRelist) {
        console.log(`❌ [BUY RELIST] Max buy relist reached (${this.buyRelistCounter}/${this.maxBuyRelist}) - Finishing flip`);
        this.isBuyRellisting = false;
        await this.finishFlip(true, true);
        return;
      }
      
      // Incrementar contador DESPUÉS de verificar el límite
      this.buyRelistCounter++;
      this.notifyStateChange();
      
      // ============================================
      // PASO 1: CANCELAR BUY ORDER EXISTENTE
      // ============================================
      console.log(`📋 [BUY RELIST] Step 1: Canceling existing buy orders...`);
      await delay(1000);
      if (!this.active) { this.isBuyRellisting = false; return; }
      
      this.ChatListener.send("/managebazaarorders");
      await delay(1000);
      if (!this.active) { this.isBuyRellisting = false; return; }
      
      // Cancelar todas las órdenes de compra existentes
      while (this.active && this.ContainerManager.hasItemInContainer({contains: `BUY ${this.item}`})) {
        await delay(1000);
        if (!this.active) { this.isBuyRellisting = false; return; }
        
        this.ContainerManager.click({contains: `BUY ${this.item}`});
        await delay(1000);
        if (!this.active) { this.isBuyRellisting = false; return; }
        
        if (this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
          await delay(1000);
          if (!this.active) { this.isBuyRellisting = false; return; }
          
          this.ContainerManager.click({contains: `Cancel Order`});
          await delay(1000);
        }
      }
      
      await this.ContainerManager.closeContainer();
      await delay(500);
      if (!this.active) { this.isBuyRellisting = false; return; }
      
      // ============================================
      // PASO 2: VERIFICAR ITEMS EN INVENTARIO
      // ============================================
      console.log(`🔍 [BUY RELIST] Step 2: Checking inventory for claimed items...`);
      const hasItemsInInventory = this.ContainerManager.hasItemInContainer({contains: this.item, type: "inventory"});
      
      if (hasItemsInInventory) {
        // ============================================
        // CASO 2: SE ENCONTRARON ITEMS - VENDER Y RECOMPRAR RESTO
        // ============================================
        console.log(`✅ [BUY RELIST] Found items in inventory!`);
        
        // Contar cuántos items se reclamaron
        const claimedAmount = this.ContainerManager.countItemsInInventory({contains: this.item});
        const remainingAmount = this.amountToBuy - claimedAmount;
        
        console.log(`📦 [BUY RELIST] Claimed: ${claimedAmount}/${this.amountToBuy} items`);
        console.log(`🔄 [BUY RELIST] Remaining to buy: ${remainingAmount} items`);
        
        if (claimedAmount > 0) {
          // 🔥 LIMPIAR TODOS LOS TIMERS ANTES DE VENDER
          console.log(`🧹 [BUY RELIST] Cleaning timers before selling partial items...`);
          this.clearSellTimer();
          if (this.finishTimer) {
            clearTimeout(this.finishTimer);
            this.finishTimer = null;
          }
          if (this.priceWatcher) {
            clearInterval(this.priceWatcher);
            this.priceWatcher = null;
          }
          
          // Actualizar cantidad para vender solo los items reclamados
          const originalAmount = this.amountToBuy;
          this.amountToBuy = claimedAmount;
          
          console.log(`💰 [BUY RELIST] Creating sell order for ${claimedAmount} items...`);
          this.isBuyRellisting = false;
          
          // 🔥 EJECUTAR VENTA INLINE (sin encolar)
          await this.sellInline(false, true);
          
          // Restaurar y actualizar cantidad para el nuevo buy
          this.amountToBuy = remainingAmount;
          
          if (remainingAmount > 0 && this.active) {
            console.log(`🛒 [BUY RELIST] Creating new buy order for remaining ${remainingAmount} items...`);
            
            // 🔥 RESETEAR COMPLETAMENTE EL ESTADO DEL FLIP
            console.log(`🔄 [BUY RELIST] Resetting flip state for new buy order...`);
            this.bought = false;
            this.sellExecuted = false;
            this.buyFilled = false;
            this.isSelling = false;
            this.orderFilled = false;
            this.flipFinished = false;
            
            // 🔥 ESPERAR a que termine el nuevo buy order completamente
            await this.executeBuyOrderInline();
            
            // 🔥 REINICIAR TIMERS Y WATCHERS DESPUÉS DEL NUEVO BUY
            console.log(`⏱️ [BUY RELIST] Restarting timers and watchers...`);
            this.bought = true; // Marcar que ya compró
            this.notifyStateChange();
            this.startSellTimer();
            this.startPriceWatcher();
            console.log(`✅ [BUY RELIST] Flip state reset complete, monitoring new buy order`);
          } else {
            console.log(`✅ [BUY RELIST] All items claimed, no need for new buy order`);
          }
        } else {
          console.log(`⚠️ [BUY RELIST] No items found after all, creating new buy order...`);
          await this.executeBuyOrderInline();
        }
        
      } else {
        // ============================================
        // CASO 3: NO SE ENCONTRARON ITEMS - RECOMPRAR TODO
        // ============================================
        console.log(`❌ [BUY RELIST] No items found in inventory - Creating new buy order for ${this.amountToBuy} items...`);
        await this.executeBuyOrderInline();
      }
      
      this.isBuyRellisting = false;
      this.notifyStateChange();
    }, {
      type: 'buyrelist',
      item: this.item,
      itemTag: this.itemTag,
      relistCount: this.buyRelistCounter,
      flipState: this.serialize()
    });
  }

  // ============================================
  // HELPER: EJECUTAR UNA ORDEN DE COMPRA (para llamar desde dentro de un nodo)
  // ============================================
  async executeBuyOrderInline() {
    console.log(`🛒 [EXECUTE BUY INLINE] Creating buy order for ${this.amountToBuy}x ${this.item}...`);
    
    await delay(1100);
    if (!this.active) return;
    
    this.ChatListener.send(`/bz ${this.item}`);
    await delay(1500);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: this.item, type: "container" });
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: "Create Buy Order", type: "container" });
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: "Custom Amount", type: "container" });
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.interactWithSign(this.amountToBuy);
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: "Top Order +0.1", type: "container" });
    await delay(1850);
    if (!this.active) return;
    
    const lore = this.ContainerManager.getItemDescription({customName: "Buy Order"}, true);
    const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
    this.instaBuyPrice = price;
    console.log(`💵 [EXECUTE BUY INLINE] Buy price: ${price}`);
    
    if (!this.active) return;
    this.ContainerManager.click({customName: "Buy Order", type: "container" });
    
    console.log(`✅ [EXECUTE BUY INLINE] Buy order created for ${this.amountToBuy}x ${this.item}`);
    await delay(1000);
  }

  // ============================================
  // HELPER: EJECUTAR UNA ORDEN DE COMPRA
  // ============================================
  async executeBuyOrder() {
    console.log(`🛒 [EXECUTE BUY] Creating buy order for ${this.amountToBuy}x ${this.item}...`);
    
    await delay(1100);
    if (!this.active) return;
    
    this.ChatListener.send(`/bz ${this.item}`);
    await delay(1500);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: this.item, type: "container" });
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: "Create Buy Order", type: "container" });
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: "Custom Amount", type: "container" });
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.interactWithSign(this.amountToBuy);
    await delay(1000);
    if (!this.active) return;
    
    this.ContainerManager.click({customName: "Top Order +0.1", type: "container" });
    await delay(1850);
    if (!this.active) return;
    
    const lore = this.ContainerManager.getItemDescription({customName: "Buy Order"}, true);
    const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
    this.instaBuyPrice = price;
    console.log(`💵 [EXECUTE BUY] Buy price: ${price}`);
    
    if (!this.active) return;
    this.ContainerManager.click({customName: "Buy Order", type: "container" });
    
    console.log(`✅ [EXECUTE BUY] Buy order created for ${this.amountToBuy}x ${this.item}`);
    await delay(1000);
  }

  async sellRelist() {
    console.log(`🔄 [SELL RELIST] Starting for ${this.item} [${this.itemTag}] - Attempt ${this.relistCounter + 1}/${this.maxRelist}`);
    
    // Incrementar contador
    this.relistCounter++;
    this.notifyStateChange();
    
    // ============================================
    // VERIFICAR SI SE PASÓ EL LÍMITE DE RELIST
    // ============================================
    if (this.relistCounter >= this.maxRelist) {
      console.log(`❌ [SELL RELIST] Max sell relist reached (${this.relistCounter}/${this.maxRelist}) - Selling instantly`);
      
      return this.queue.enqueue(async () => {
        await delay(1000);
        if (!this.active) return;
        
        // Cancelar orden de venta existente
        this.ChatListener.send("/managebazaarorders");
        await delay(1000);
        if (!this.active) return;
        
        while (this.active && this.ContainerManager.hasItemInContainer({contains: `SELL ${this.item}`})) {
          await delay(1000);
          if (!this.active) return;
          
          this.ContainerManager.click({contains: `SELL ${this.item}`});
          await delay(1000);
          if (!this.active) return;
          
          // Verificar si ya está filled
          if (!this.ContainerManager.hasItemInContainer({contains: `SELL ${this.item}`}) && 
              !this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
            console.log("✅ [SELL RELIST] Order already filled!");
            this.orderFilled = true;
            this.finishFlip(false, true);
            return;
          }
          
          if (this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
            await delay(1000);
            if (!this.active) return;
            
            this.ContainerManager.click({contains: `Cancel Order`});
            console.log(`🗑️ [SELL RELIST] Cancelled sell order`);
            await delay(600);
          }
          
          if (!this.active) return;
          this.ChatListener.send("/managebazaarorders");
          await delay(1000);
        }
        
        // Vender instantáneamente
        if (!this.active) return;
        this.ChatListener.send("/bz");
        await delay(1000);
        if (!this.active) return;
        
        this.ContainerManager.click({contains: `Sell Inventory Now`});
        console.log(`💸 [SELL RELIST] Selling inventory instantly...`);
        
        this.finishFlip(false, true);
      }, {
        type: 'sellrelist-finish',
        item: this.item,
        itemTag: this.itemTag,
        relistCount: this.relistCounter,
        flipState: this.serialize()
      });
    }
    
    // ============================================
    // EJECUTAR RELIST NORMAL
    // ============================================
    return this.queue.enqueue(async () => {
      if (!this.active) return;
      
      console.log(`📋 [SELL RELIST] Canceling existing sell order...`);
      await delay(1000);
      if (!this.active) return;
      
      this.ChatListener.send("/managebazaarorders");
      await delay(1000);
      if (!this.active) return;
      
      // Cancelar orden de venta existente
      while (this.active && this.ContainerManager.hasItemInContainer({contains: `SELL ${this.item}`})) {
        await delay(1000);
        if (!this.active) return;
        
        this.ContainerManager.click({contains: `SELL ${this.item}`});
        await delay(1000);
        if (!this.active) return;
        
        // Verificar si ya está filled
        if (!this.ContainerManager.hasItemInContainer({contains: `SELL ${this.item}`}) && 
            !this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
          console.log("✅ [SELL RELIST] Order already filled!");
          this.orderFilled = true;
          this.finishFlip(false, true);
          return;
        }
        
        if (this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
          await delay(1000);
          if (!this.active) return;
          
          this.ContainerManager.click({contains: `Cancel Order`});
          console.log(`🗑️ [SELL RELIST] Cancelled sell order`);
          await delay(1000);
        }
      }
      
      // Crear nueva orden de venta
      if (!this.active) return;
      console.log(`💰 [SELL RELIST] Creating new sell offer...`);
      
      await delay(1000);
      this.ChatListener.send(`/bz ${this.item}`); 
      await delay(1500);
      if (!this.active) return;
      
      this.ContainerManager.click({customName: this.item, type: "container" });
      await delay(2000);
      if (!this.active) return;
      
      await delay(1200);
      this.ContainerManager.click({ contains: "Create Sell Offer"});
      await delay(1300);
      if (!this.active) return;
      
      this.ContainerManager.click({ contains: "Best Offer -0.1" });
      await delay(1200);
      if (!this.active) return;
      
      const lore = this.ContainerManager.getItemDescription({customName: "Sell Offer"}, true);
      const price = this._parsePriceFromLoreLine(this.ContainerManager._findLoreLine(lore, { contains: "Price per unit" }));
      this.instaSellPrice = price;
      console.log(`💵 [SELL RELIST] New sell price: ${price}`);
      
      if (!this.active) return;
      this.ContainerManager.click({ contains: "Sell Offer"});
      await delay(1000);
      
      console.log(`✅ [SELL RELIST] New sell order created`);
      this.notifyStateChange();
    }, {
      type: 'sellrelist',
      item: this.item,
      itemTag: this.itemTag,
      relistCount: this.relistCounter,
      flipState: this.serialize()
    });
  }

  async finishFlip(endedByTimeout = false, noItemsFlip = false) {
    // 🔥 NO marcar como inactivo todavía, solo marcar que el flip está terminado
    this.flipFinished = true;
    this.notifyStateChange();
    
    this.clearSellTimer();
    if (this.finishTimer) clearTimeout(this.finishTimer);
    if (this.priceWatcher) clearInterval(this.priceWatcher);

    return this.queue.enqueue(async () => {
      await this.finishFlipInline(endedByTimeout, noItemsFlip);
    }, {
      type: 'finish',
      item: this.item,
      itemTag: this.itemTag,
      endedByTimeout,
      noItemsFlip,
      flipState: this.serialize()
    });
  }

  // 🔥 Método inline para terminar flip SIN encolar (para usar dentro de otros nodos)
  async finishFlipInline(endedByTimeout = false, noItemsFlip = false) {
    console.log(`Executed Flip finish for ${this.item} [${this.itemTag}]`);
    
    this.clearSellTimer();
    if (this.priceWatcher) clearInterval(this.priceWatcher);

    this.bought = false;
    this.sellExecuted = false;
    this.sellTimer = null;
    this.priceWatcher = null;

    if (typeof this.onFinish === 'function') {
      if (!noItemsFlip) {
        console.log(`Flip for ${this.item} ended ${endedByTimeout ? 'by timeout' : 'normally'}`);
        await delay(1000);
        this.ChatListener.send("/managebazaarorders");
        await delay(900);
        while (this.ContainerManager.hasItemInContainer({contains: `SELL ${this.item}`})) {
          await delay(1000);
          this.ContainerManager.click({contains: `SELL ${this.item}`});
          await delay(1300);
          if (this.ContainerManager.hasItemInContainer({contains: "Cancel Order"})) {
            await delay(1000);
            this.ContainerManager.click({contains: `Cancel Order`});
            await delay(1000);
            this.ChatListener.send("/managebazaarorders");
            await delay(900);
          }
        }
        await delay(500);
        if (!this.active) return;
        this.ChatListener.send(`/bz ${this.item}`);
        await delay(1500);
        if (!this.active) return;
        this.ContainerManager.click({customName: this.item, type: "container" });
        await delay(1000);
        this.ContainerManager.click({customName: "Sell Instantly", type: "container" });
        await delay(1000);
        if (!this.active) return;
      } else { 
        console.log("No había items al terminar el flip..."); 
      }
      await delay(1000);
      
      // 🔥 Marcar como inactivo DESPUÉS de completar todas las operaciones
      this.active = false;
      this.notifyStateChange();
      
      this.onFinish(endedByTimeout);
    } else {
      // Si no hay callback, marcar como inactivo de todos modos
      this.active = false;
      this.notifyStateChange();
    }
  }
  
  /**
   * Destruye el flip y limpia todos los timers/intervalos
   */
  destroy() {
    console.log(`🧹 [${this.itemTag}] Destroying flip...`);
    
    // Marcar como inactivo inmediatamente para que todas las tareas pendientes se cancelen
    this.active = false;
    this.flipFinished = true;
    
    // Limpiar todos los timers
    if (this.sellTimer) {
      clearTimeout(this.sellTimer);
      this.sellTimer = null;
    }
    
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
    
    if (this.priceWatcher) {
      clearInterval(this.priceWatcher);
      this.priceWatcher = null;
    }
    
    console.log(`✅ [${this.itemTag}] Flip destroyed (marked inactive)`);
  }
}

module.exports = Flip;









