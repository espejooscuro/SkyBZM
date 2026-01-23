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

    const getCustomName = (item) => {
      if (!item) return '';
      const nbt = item.nbt || { value: {} };
      return nbt.value.display?.value?.Name?.value || item.name || '';
    };

    const processItem = (item, index, type) => ({
      slot: index,
      originalName: item?.name || '',
      customName: getCustomName(item),
      id: item?.type || 0,
      quantity: item?.count || 0,
      type,
      nbt: item?.nbt || { value: {} },
    });

    if (window) {
      const containerSlots = window.slots.length - 36;
      window.slots.forEach((item, index) => {
        if (!item) return;
        const type = index < containerSlots ? 'container' : 'inventory';
        items.push(processItem(item, index, type));
      });
    } else {
      this.bot.inventory.items().forEach((item) => {
        if (!item) return;
        items.push(processItem(item, item.slot, 'inventory'));
      });
    }

    return JSON.stringify(items, null, 2);
  }

  /**
   * Returns inventory with color codes removed
   * @returns {string}
   */
  getInventoryPlain() {
    const removeColorCodes = (text) => text ? text.replace(/§[0-9a-fk-or]/gi, '') : '';
    const inventory = JSON.parse(this.getInventory());
    return JSON.stringify(
      inventory.map(item => ({
        ...item,
        originalName: removeColorCodes(item.originalName),
        customName: removeColorCodes(item.customName),
      })),
      null,
      2
    );
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
    const window = this.bot.currentWindow;
    if (!window) return false;

    const containerSlots = window.slots.length - 36;

    const items = window.slots.map((item, index) => {
      if (!item) return null;
      const type = index < containerSlots ? 'container' : 'inventory';
      const nbt = item.nbt || { value: {} };
      const customName = nbt.value.display?.value?.Name?.value || item.name || '';
      return {
        slot: index,
        type,
        originalName: item.name || '',
        customName: customName.replace(/§[0-9a-fk-or]/gi, ''),
      };
    }).filter(Boolean);

    return items.some(item => this._matchesFilters(item, filters));
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

  /**
   * @private
   */
  _getValidItems(isContainer) {
    const window = this.bot.currentWindow;
    if (!window) return [];

    const startSlot = isContainer ? 0 : window.slots.length - 36;
    const endSlot = isContainer ? window.slots.length - 36 : window.slots.length;
    const result = [];

    for (let slot = startSlot; slot < endSlot; slot++) {
      const item = window.slots[slot];
      if (!item || item.name === "stained_glass_pane") continue;

      const nbt = item.nbt || { value: {} };
      const customName = nbt.value.display?.value?.Name?.value || item.displayName || item.name;
      const plainName = customName.replace(/§[0-9a-fk-or]/gi, '').trim().toLowerCase();
      if (["go back", "claim all coins"].includes(plainName)) continue;

      result.push({ slot, originalName: item.name, customName, plainName, quantity: item.count });
    }

    return result;
  }

  // -------------------- Container Interaction Methods --------------------

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
   * @returns {Promise<boolean>}
   */
  async click(filters = {}, mouseButton = 0, mode = 0) {
    const startTime = Date.now();
    await new Promise(res => setTimeout(res, 100 + Math.floor(Math.random() * 200)));

    const inventoryStart = Date.now();
    const items = this.cachedItems || JSON.parse(this.getInventoryPlain());
    const inventoryEnd = Date.now();

    const foundItem = items.find(item => this._matchesFilters(item, filters));
    if (!foundItem) {
      console.log('❌ Click aborted: item not found.');
      return false;
    }

    let realSlot = foundItem.slot;
    if (foundItem.type === 'inventory' && realSlot <= 8) realSlot += 36;

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
    if (filters.contains) {
      const needle = filters.contains.toLowerCase();
      if (!(item.originalName?.toLowerCase().includes(needle) ||
            item.customName?.toLowerCase().includes(needle))) return false;
    }
    for (const key in filters) {
      if (key === 'contains') continue;
      const itemValue = typeof item[key] === 'string' ? item[key].toLowerCase() : item[key];
      const filterValue = typeof filters[key] === 'string' ? filters[key].toLowerCase() : filters[key];
      if (itemValue !== filterValue) return false;
    }
    return true;
  }
}

module.exports = ContainerManager;
