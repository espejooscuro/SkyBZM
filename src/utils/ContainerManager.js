





const util = require('util');
const fs = require('fs');
const path = require('path');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class ContainerManager {
  /**
   * @param {Object} bot - Bot instance containing inventory and window data
   * @param {number} minDelay - Minimum human delay in ms for container actions
   * @param {number} maxDelay - Maximum human delay in ms for container actions
   */
  constructor(bot, minDelay = 300, maxDelay = 700) {
    this.bot = bot;
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
    this.lastClickTime = 0;
    this.minClickInterval = 300;
    this.cachedItems = null;
  }

  // -------------------- Inventory Methods --------------------

  /**
   * Returns full inventory (window or player) as JSON string
   * @returns {string}
   */
  getInventory() {
    const window = this.bot.currentWindow;
    const items = [];

    if (window) {
      const containerItems = this._getValidItems(true);
      const inventoryItems = this._getValidItems(false);

      containerItems.forEach((validItem) => {
        items.push({
          slot: validItem.slot,
          originalName: validItem.originalName,
          customName: validItem.customName,
          customNameClean: validItem.customNameClean,
          id: validItem.rawJSON?.type || 0,
          quantity: validItem.quantity,
          type: 'container',
          nbt: validItem.rawJSON?.nbt || { value: {} },
        });
      });

      inventoryItems.forEach((validItem) => {
        items.push({
          slot: validItem.slot,
          originalName: validItem.originalName,
          customName: validItem.customName,
          customNameClean: validItem.customNameClean,
          id: validItem.rawJSON?.type || 0,
          quantity: validItem.quantity,
          type: 'inventory',
          nbt: validItem.rawJSON?.nbt || { value: {} },
        });
      });
    } else {
      const inventoryItems = this._getValidItems(false);
      inventoryItems.forEach((validItem) => {
        items.push({
          slot: validItem.slot,
          originalName: validItem.originalName,
          customName: validItem.customName,
          customNameClean: validItem.customNameClean,
          id: validItem.rawJSON?.type || 0,
          quantity: validItem.quantity,
          type: 'inventory',
          nbt: validItem.rawJSON?.nbt || { value: {} },
        });
      });
    }

    return JSON.stringify(items, null, 2);
  }

  /**
   * Returns inventory with color codes removed
   * @returns {string}
   */
  getInventoryPlain() {
    // Ya _getValidItems devuelve todo limpio
    return this.getInventory();
  }

  /**
   * Returns the open container name (not player inventory)
   * @returns {string|null} lowercase, color-stripped name or null
   */
  getOpenContainerName() {
    const window = this.bot.currentWindow;
    if (!window) return null;

    let titleText = '';
    const title = window.title;
    const type = window.type || '';
    const isContainer = type !== 'minecraft:inventory' && !/inventory/i.test(title?.text || title || '');
    if (!isContainer) return null;

    if (typeof title === 'string') {
      titleText = title;
    } else if (typeof title === 'object') {
      if (Array.isArray(title.extra)) {
        titleText = title.extra.map(part => part.text || '').join('');
      } else if (title.text) {
        titleText = title.text;
      } else {
        titleText = JSON.stringify(title);
      }
    }

    return titleText.replace(/§[0-9a-fk-or]/gi, '').toLowerCase().trim();
  }

  /**
   * Checks if an item exists in the current container
   * @param {Object} filters - Optional keys: 'contains', 'originalName', 'customName', etc.
   * @returns {boolean}
   */
hasItemInContainer(filters = {}) {
  const isInventory = filters.type === "inventory";
  const slotsSource = isInventory
    ? this.bot.inventory?.slots
    : this.bot.currentWindow?.slots;

  if (!Array.isArray(slotsSource)) {
    return false;
  }


  const items = this._getValidItems(!isInventory);


  let found = false;

  for (const item of items) {
    const name = item.plainName;
    let matches = false;

    if (filters.equals) {
      matches = name === filters.equals.toLowerCase();
    }
    if (filters.contains) {
      matches = name.includes(filters.contains.toLowerCase());
    }
    if (filters.startsWith) {
      matches = name.startsWith(filters.startsWith.toLowerCase());
    }
    if (filters.regex) {
      matches = filters.regex.test(name);
    }

    if (matches) {
      found = true;
      break;
    }
  }

  return found;
}

  /**
   * Counts how many items match the filters in inventory or container
   * @param {Object} filters - Filters like { contains: 'plasma', type: 'inventory' }
   * @returns {number} Total quantity of matching items
   */
  countItemsInInventory(filters = {}) {
    const isInventory = filters.type !== "container";
    const items = this._getValidItems(!isInventory);
    
    let totalCount = 0;
    
    for (const item of items) {
      const name = item.plainName;
      let matches = false;
      
      if (filters.equals) {
        matches = name === filters.equals.toLowerCase();
      }
      if (filters.contains) {
        matches = name.includes(filters.contains.toLowerCase());
      }
      if (filters.startsWith) {
        matches = name.startsWith(filters.startsWith.toLowerCase());
      }
      if (filters.regex) {
        matches = filters.regex.test(name);
      }
      
      if (matches) {
        totalCount += item.quantity;
      }
    }
    
    return totalCount;
  }

  /**
   * Returns true if less than 1/3 of inventory slots are empty
   * @returns {boolean}
   */
  isInventoryMostlyFull() {
    const window = this.bot.currentWindow;
    if (!window) return false;
    const inventorySlots = window.slots.slice(-36);
    const emptySlots = inventorySlots.filter(slot => !slot).length;
    return emptySlots <= inventorySlots.length / 3;
  }

  /**
   * Returns valid items from container
   * @returns {Array}
   */
  getValidContainerItems() {
    return this._getValidItems(true);
  }

  /**
   * Returns valid items from player inventory
   * @returns {Array}
   */
  getValidInventoryItems() {
    return this._getValidItems(false);
  }

  /**
   * Returns valid items from player inventory reading directly from currentWindow
   * This bypasses bot.inventory cache and gets fresh data
   * @returns {Array}
   */
  getValidInventoryItemsFromWindow() {
    const window = this.bot.currentWindow;
    if (!window) {
      return [];
    }

    const totalSlots = window.slots.length;
    const inventorySize = 36;
    const containerSize = totalSlots - inventorySize;

    // Player inventory in currentWindow starts at containerSize
    // Slots: containerSize to (totalSlots - 1)
    const result = [];

    for (let windowSlot = containerSize; windowSlot < totalSlots; windowSlot++) {
      const item = window.slots[windowSlot];

      if (!item || item.name === "stained_glass_pane" || item.name === "black_stained_glass_pane") {
        continue;
      }

      // Calculate the bot.inventory slot number for consistency
      // Window slots: [containerSize ... containerSize+26] = inventory slots 9-35 (main)
      // Window slots: [containerSize+27 ... containerSize+35] = inventory slots 0-8 (hotbar)
      let inventorySlot;
      if (windowSlot < containerSize + 27) {
        // Main inventory
        inventorySlot = (windowSlot - containerSize) + 9;
      } else {
        // Hotbar
        inventorySlot = (windowSlot - containerSize - 27);
      }

      let customNameRaw = item.formattedDisplayName || item.customName || item.displayName || item.name;

      // Extract custom name from components
      if (item.components && Array.isArray(item.components)) {
        const customNameComponent = item.components.find(c => c.type === "custom_name");
        if (customNameComponent?.data) {
          const nameData = customNameComponent.data;
          if (nameData.type === "compound" && nameData.value) {
            const mainText = nameData.value.text?.value || "";
            let extraText = "";
            if (nameData.value.extra?.value?.value && Array.isArray(nameData.value.extra.value.value)) {
              extraText = nameData.value.extra.value.value
                .map(e => e.text?.value || "")
                .join("");
            }
            const extracted = (mainText + extraText).trim();
            if (extracted) customNameRaw = extracted;
          } else if (typeof nameData === "string") {
            customNameRaw = nameData;
          }
        }
      }

      const plainName = this._cleanText(customNameRaw);

      result.push({
        slot: inventorySlot, // Use inventory slot for consistency
        windowSlot: windowSlot, // Add window slot for reference
        originalName: item.name,
        customName: customNameRaw,
        customNameClean: plainName,
        plainName,
        quantity: item.count,
        rawJSON: item
      });
    }

    return result;
  }

  /**
   * Compare container items with inventory items by name
   * @param {Array} containerItems 
   * @param {Array} inventoryItems 
   * @returns {Array}
   */
  compareItemsByName(containerItems, inventoryItems) {
    const result = [];
    for (const itemInv of inventoryItems) {
      const plainName = itemInv.plainName;
      const baseName = plainName.startsWith("enchanted ") ? plainName.slice(9) : plainName;
      const matches = containerItems.some(itemCont =>
        itemCont.plainName.includes(plainName) || itemCont.plainName.includes(baseName)
      );
      if (matches) result.push(itemInv);
    }
    return result;
  }

  _cleanText(text = '') {
    return text
      .replace(/§[0-9a-fk-or]/gi, '')     // códigos Minecraft
      .replace(/[^a-zA-Z0-9 ]/g, '')      // SOLO letras, números y espacios
      .replace(/\s+/g, ' ')               // espacios múltiples → uno
      .trim()
      .toLowerCase();
  }



/**
 * Muestra el JSON completo de un slot específico para debug
 * @param {number} slot
 */
logSlotJson(slot) {
  const window = this.bot.currentWindow;
  if (!window) {
    console.log(`⚠️ No hay ventana abierta para leer slot ${slot}`);
    return;
  }

  const item = window.slots[slot];
  if (!item) {
    console.log(`⚠️ Slot ${slot} vacío`);
    return;
  }

  // Mostramos TODO el objeto tal cual, en formato JSON bonito
  console.log(`📦 Slot ${slot} crudo:`, JSON.stringify(item, null, 2));
}


 /**
   * Guarda toda la información del contenedor abierto en un archivo JSON
   * @param {string} filename - Nombre del archivo donde se guardará el JSON
   */
  saveContainerToJson(filename = 'container.json') {
    const window = this.bot.currentWindow;
    if (!window) {
      console.log('⚠️ No hay contenedor abierto para guardar.');
      return;
    }

    const containerData = {
      containerName: this.getOpenContainerName() || 'unknown',
      slots: window.slots.map((item, index) => {
        if (!item) return null; // slot vacío
        return item; // guardamos TODO el objeto crudo
      })
    };
 
    const filepath = path.resolve(filename);
    fs.writeFileSync(filepath, JSON.stringify(containerData, null, 2), 'utf8');
    console.log(`✅ Contenedor guardado en JSON: ${filepath}`);
  }


/**
 * @private
 * Obtiene todos los items válidos del contenedor o inventario, con customName y lore completos
 * @param {boolean} isContainer
 * @returns {Array}
 */

_getValidItems(isContainer) {
  const slotsSource = isContainer
    ? this.bot.currentWindow?.slots
    : this.bot.inventory?.slots;

  if (!Array.isArray(slotsSource)) {
    return [];
  }

  const result = [];

  // Rango de slots
  const startSlot = 0;
  const endSlot = slotsSource.length;

  for (let slot = startSlot; slot < endSlot; slot++) {
    const item = slotsSource[slot];

    if (!item || item.name === "stained_glass_pane" || item.name === "black_stained_glass_pane") continue;

    // 🔥 Intentar obtener el nombre de múltiples fuentes
    let customNameRaw = item.formattedDisplayName || item.customName || item.displayName || item.name;

    // 1. custom_name component
    if (item.components && Array.isArray(item.components)) {
      const customNameComponent = item.components.find(c => c.type === "custom_name");

      if (customNameComponent?.data) {
        const nameData = customNameComponent.data;

        if (nameData.type === "compound" && nameData.value) {
          const mainText = nameData.value.text?.value || "";
          let extraText = "";
          if (nameData.value.extra?.value?.value && Array.isArray(nameData.value.extra.value.value)) {
            extraText = nameData.value.extra.value.value
              .map(e => e.text?.value || "")
              .join("");
          }
          const extracted = (mainText + extraText).trim();
          if (extracted) customNameRaw = extracted;
        } else if (typeof nameData === "string") {
          customNameRaw = nameData;
        }
      }
    }

    // 2. Legacy NBT
    const nbt = item.nbt || { value: {} };
    const legacyName = nbt.value.display?.value?.Name?.value;
    if (legacyName && legacyName !== item.displayName) {
      customNameRaw = legacyName;
    }

    const plainName = this._cleanText(customNameRaw);

    result.push({
      slot,
      originalName: item.name,
      customName: customNameRaw,
      customNameClean: plainName,
      plainName,
      quantity: item.count,
      rawJSON: item
    });
  }

  return result;
}








  // -------------------- Container Interaction Methods --------------------

  /**
   * Returns the description/lore of an item in the current container or inventory
   * @param {Object} filters - Filters like { contains: 'diamond' }
   * @param {boolean} isContainer - true: look in open container, false: player inventory
   * @returns {Array<string>} array of lines, color codes removed
   */
 getItemDescription(filters = {}, isContainer = true) {
  const items = isContainer ? this._getValidItems(true) : this._getValidItems(false);

  for (const item of items) {
    if (filters.customName && item.plainName !== filters.customName.toLowerCase()) continue;
    if (filters.contains && !item.plainName.includes(filters.contains.toLowerCase())) continue;

    const loreComponent = item.rawJSON?.components?.find(c => c.type === "lore");

    if (!loreComponent || !Array.isArray(loreComponent.data)) {
      return [];
    }

    const loreArray = [];

    for (const line of loreComponent.data) {
      let text = "";

      const mainText = line?.value?.text?.value;
      if (typeof mainText === "string") {
        text += mainText;
      }

      const extra = line?.value?.extra?.value?.value;
      if (Array.isArray(extra)) {
        for (const part of extra) {
          const partText = part?.text?.value;
          if (typeof partText === "string") {
            text += partText;
          }
        }
      }

      const cleanLine = text.trim();
      loreArray.push(cleanLine);
    }

    return loreArray;
  }

  return [];
}



_findLoreLine(loreLines, filters = {}) {
  if (!Array.isArray(loreLines)) return null;

  const clean = text =>
    text
      .replace(/§[0-9a-fk-or]/gi, '')
      .trim()
      .toLowerCase();

  for (const line of loreLines) {
    if (!line) continue;

    const plain = clean(line);

    if (filters.equals && plain !== filters.equals.toLowerCase()) continue;
    if (filters.startsWith && !plain.startsWith(filters.startsWith.toLowerCase())) continue;
    if (filters.contains && !plain.includes(filters.contains.toLowerCase())) continue;
    if (filters.regex && !filters.regex.test(plain)) continue;

    return line;
  }

  return null;
}


_parseDurationToMs(durationLine) {
  // durationLine = "Duration: 3d 23h 53m 45s"
  const text = durationLine.replace("Duration:", "").trim();

  let days = 0, hours = 0, minutes = 0, seconds = 0;

  const dayMatch = text.match(/(\d+)\s*d/);
  const hourMatch = text.match(/(\d+)\s*h/);
  const minMatch = text.match(/(\d+)\s*m/);
  const secMatch = text.match(/(\d+)\s*s/);

  if (dayMatch) days = parseInt(dayMatch[1]);
  if (hourMatch) hours = parseInt(hourMatch[1]);
  if (minMatch) minutes = parseInt(minMatch[1]);
  if (secMatch) seconds = parseInt(secMatch[1]);

  const totalMs =
    days * 24 * 60 * 60 * 1000 +
    hours * 60 * 60 * 1000 +
    minutes * 60 * 1000 +
    seconds * 1000;

  return totalMs;
}






  /**
   * Returns a random delay to simulate human action
   * @returns {Promise<void>}
   */
  async humanDelay() {
    const ms = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set new delay range
   * @param {number} minDelay
   * @param {number} maxDelay
   */
  setDelay(minDelay, maxDelay) {
    if (minDelay !== undefined) this.minDelay = minDelay;
    if (maxDelay !== undefined) this.maxDelay = maxDelay;
  }

  /**
   * Clicks an item in container or inventory
   * @param {Object} filters
   * @param {number} mouseButton
   * @param {number} mode
   * @param {number} specificSlot - If provided, clicks this exact slot without searching
   * @returns {Promise<boolean>}
   */
  async click(filters = {}, mouseButton = 0, mode = 0, specificSlot = null) {
  await new Promise(res => setTimeout(res, 100 + Math.floor(Math.random() * 200)));

  const window = this.bot.currentWindow;
  if (!window) {
    console.error('❌ No window open to click in.');
    return false;
  }

  let realSlot;

  // If a specific window slot is provided, use it directly
  if (specificSlot !== null && specificSlot !== undefined) {
    realSlot = specificSlot;
  } else {
    // Original search logic
    const containerItems = this._getValidItems(true);
    const inventoryItems = this._getValidItems(false);
    const allItems = [
      ...containerItems.map(item => ({ ...item, type: 'container' })),
      ...inventoryItems.map(item => ({ ...item, type: 'inventory' }))
    ];

    const foundItem = allItems.find(item => this._matchesFilters(item, filters));

    if (!foundItem) {
      const containerName = this.getOpenContainerName() || 'unknown container';
      console.error(`❌ Click aborted: item not found in container ${containerName}`);
      console.error('🔍 Filters used:', filters);
      console.error('📦 Container items:');
      containerItems.forEach(item => {
        console.error(`  • Slot ${item.slot} → "${item.plainName}" x${item.quantity}`);
      });
      console.error('📦 Inventory items:');
      inventoryItems.forEach(item => {
        console.error(`  • Slot ${item.slot} → "${item.plainName}" x${item.quantity}`);
      });
      return false;
    }

    realSlot = foundItem.slot;

    if (foundItem.type === 'inventory') {
      const originalSlot = realSlot;
      
      // Calculate container size (slots before inventory)
      const totalSlots = window.slots.length;
      const inventorySize = 36; // Standard player inventory (27 main + 9 hotbar)
      const containerSize = totalSlots - inventorySize;
      
      // Inventory slots in bot.inventory are 0-35 (9-35 are main inventory, 0-8 are hotbar)
      // In currentWindow, they start after the container slots
      
      if (realSlot >= 9 && realSlot <= 35) {
        // Main inventory slots (9-35) → add container size
        realSlot = containerSize + realSlot - 9;
      } else if (realSlot >= 0 && realSlot <= 8) {
        // Hotbar slots (0-8) → they come after main inventory in currentWindow
        realSlot = containerSize + 27 + realSlot;
      }
    }
  }
  
  // Verify the slot actually contains what we expect
  const slotItem = window.slots[realSlot];
  if (!slotItem) {
    console.log(`⚠️ [DEBUG] Slot ${realSlot} is EMPTY!`);
  }

  try {
    this.bot.currentWindow.requiresConfirmation = false;
    this.bot.inventory.requiresConfirmation = false;
    await this.bot.clickWindow(realSlot, mouseButton, mode);
    return true;
  } catch (err) {
    console.error('⚠️ Error during clickWindow:', err.message);
    return false;
  }
}


  /**
   * Shift-click an item
   * @param {Object} filters
   */
  async shiftClick(filters) {
    return this.click(filters, 0, 1);
  }

  /**
   * Move item from source to destination
   * @param {Object} sourceFilters
   * @param {Object} destFilters
   */
  async moveItem(sourceFilters, destFilters) {
    await this.click(sourceFilters);
    await this.click(destFilters);
  }

  /**
   * Edit a sign with text
   * @param {string} text
   */
  interactWithSign(text) {
    if (!this.bot.editSign) {
      const botRef = this.bot;
      this.bot.editSign = function (line) {
        botRef._client.write('update_sign', {
          location: botRef.entity.position.offset(-1, 0, 0),
          text1: String(line),
          text2: '{"italic":false,"extra":["^^^^^^^^^^^^^^^"],"text":""}',
          text3: '{"italic":false,"extra":["    Auction    "],"text":""}',
          text4: '{"italic":false,"extra":["     hours     "],"text":""}'
        });
      };
    }
    this.bot.editSign(text);
    console.log(`✏️ Sign edited with text: "${text}"`);
    console.log(this.getOpenContainerName());
    delay(500);
  }

  /**
   * Closes the currently open container
   * @returns {Promise<boolean>}
   */
  async closeContainer() {
    if (!this.bot.currentWindow) {
      console.error('⚠️ No container is open to close.');
      return false;
    }
    await this.humanDelay();
    try {
      const windowId = this.bot.currentWindow.id;
      this.bot.closeWindow(this.bot.currentWindow);
      console.log(`📦 Container with ID ${windowId} closed successfully.`);
      return true;
    } catch (err) {
      console.error('❌ Error closing container:', err.message);
      return false;
    }
  }

  /**
   * @private
   */
  _matchesFilters(item, filters) {
    const clean = txt => this._cleanText(txt);

    if (filters.contains) {
      const needle = clean(filters.contains);

      const haystacks = [
        item.plainName,
        item.customNameClean,
        clean(item.originalName),
        clean(item.customName)
      ];

      if (!haystacks.some(text => text?.includes(needle))) {
        return false;
      }
    }

    for (const key in filters) {
      if (key === 'contains') continue;

      const filterValue =
        typeof filters[key] === 'string'
          ? clean(filters[key])
          : filters[key];

      let itemValue = item[key];
      
      if (typeof itemValue === 'string') {
        itemValue = clean(itemValue);
      }

      if (itemValue !== filterValue) return false;
    }

    return true;
  }

}

module.exports = ContainerManager;






