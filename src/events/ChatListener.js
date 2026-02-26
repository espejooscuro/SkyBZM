
/**
 * ChatListener - Class to listen, filter, and SEND messages in real time
 *
 * CONSTRUCTOR OPTIONS:
 *
 * new ChatListener(bot, options)
 *
 * @param {import('mineflayer').Bot} bot - The bot instance
 * @param {Object} options - Filter and behavior configuration
 *
 * Optional properties:
 *   - users           : string[] | null   → players to listen to
 *   - exactMessages   : string[] | null   → exact phrases to detect
 *   - keywords        : string[] | null   → words or fragments to include
 *   - excludeKeywords : string[] | null   → words or fragments to EXCLUDE
 *   - types           : string[] | ['chat', 'system'] → message types to register
 *   - callback        : function          → executed when a message passes filters
 */

class ChatListener {
  constructor(bot, options = {}) {
    this.bot = bot;
    this.messages = [];
    this.watchList = options.watchList || null;
    this.users = options.users || null;
    this.exactMessages = options.exactMessages || null;
    this.keywords = options.keywords || null;
    this.excludeKeywords = options.excludeKeywords || null;
    this.types = options.types || ['chat', 'system'];
    this.callback = options.callback || null;

    // Store listeners for removal
    this._listeners = [];

    this.startListening();
  }

  startListening() {
    // PLAYER CHAT
    const chatHandler = (username, message) => {
      if (!this.types.includes('chat')) return;
      if (this.users && !this.users.includes(username)) return;
      if (this.exactMessages && !this.exactMessages.includes(message)) return;

      const messageLower = message.toLowerCase();

      if (this.watchList) {
        const match = this.watchList.some(word => messageLower.includes(word.toLowerCase()));
        if (!match) return;
      }


      // Inclusion filter
      if (this.keywords) {
        const matches = this.keywords.some(p => messageLower.includes(p.toLowerCase()));
        if (!matches) return;
      }

      // Exclusion filter
      if (this.excludeKeywords) {
        const hasForbidden = this.excludeKeywords.some(p => messageLower.includes(p.toLowerCase()));
        if (hasForbidden) return;
      }

      const record = {
        type: 'chat',
        user: username,
        message,
        timestamp: new Date()
      };

      this.messages.push(record);
      //console.log(`[CHAT] <${username}>: ${message}`);
      if (this.callback) this.callback(record);
    };

    this.bot.on('chat', chatHandler);
    this._listeners.push({ event: 'chat', handler: chatHandler });

    // SERVER MESSAGES
    const serverHandler = (jsonMsg) => {
      if (!this.types.includes('system')) return;
      const plainText = jsonMsg.toString().trim();
      const lowerText = plainText.toLowerCase();

      if (this.watchList) {
        const match = this.watchList.some(word => lowerText.includes(word.toLowerCase()));
        if (!match) return;
      }


      if (this.exactMessages && !this.exactMessages.includes(plainText)) return;
      if (this.keywords) {
        const matches = this.keywords.some(p => lowerText.includes(p.toLowerCase()));
        if (!matches) return;
      }
      if (this.excludeKeywords) {
        const hasForbidden = this.excludeKeywords.some(p => lowerText.includes(p.toLowerCase()));
        if (hasForbidden) return;
      }

      const record = {
        type: 'system',
        message: plainText,
        timestamp: new Date()
      };

      this.messages.push(record);
      //console.log(`[SERVER] ${plainText}`);
      if (this.callback) this.callback(record);
    };

    this.bot.on('message', serverHandler);
    this._listeners.push({ event: 'message', handler: serverHandler });
  }

  /**
   * Remove ALL listeners created by this ChatListener
   * and clear messages to free memory
   */
  removeListeners() {
    if (!this.bot || !this._listeners) return;

    for (const { event, handler } of this._listeners) {
      this.bot.removeListener(event, handler);
    }

    this._listeners = [];
    this.messages = []; // Clear history to avoid memory accumulation
  }

  /**
   * Alias for removeListeners for compatibility
   */
  destroy() {
    this.removeListeners();
  }

  getLast(n = 10) {
    return this.messages.slice(-n);
  }

  send(text) {
    if (!text || typeof text !== 'string') return;
    this.bot.chat(text);
  }

  onMessageContains(text, callback) {
    if (!text || typeof callback !== 'function') return;

    const chatHandler = (username, message) => {
      const lowerMessage = message.toLowerCase();
      const pattern = typeof text === 'string' ? text.toLowerCase() : text;
      if ((typeof pattern === 'string' && lowerMessage.includes(pattern)) ||
          (pattern instanceof RegExp && pattern.test(message))) {
        callback({ type: 'chat', user: username, message });
      }
    };

    const serverHandler = (jsonMsg) => {
      const plainText = jsonMsg.toString().trim();
      const lowerText = plainText.toLowerCase();
      const pattern = typeof text === 'string' ? text.toLowerCase() : text;
      if ((typeof pattern === 'string' && lowerText.includes(pattern)) ||
          (pattern instanceof RegExp && pattern.test(plainText))) {
        callback({ type: 'system', message: plainText });
      }
    };

    this.bot.on('chat', chatHandler);
    this.bot.on('message', serverHandler);

    this._listeners.push({ event: 'chat', handler: chatHandler });
    this._listeners.push({ event: 'message', handler: serverHandler });
  }

  onceMessageContains(text, callback) {
    if (!text || typeof callback !== 'function') return;

    const chatHandler = (username, message) => {
      const lowerMessage = message.toLowerCase();
      const pattern = typeof text === 'string' ? text.toLowerCase() : text;
      if ((typeof pattern === 'string' && lowerMessage.includes(pattern)) ||
          (pattern instanceof RegExp && pattern.test(message))) {
        callback({ type: 'chat', user: username, message });
        this.bot.off('chat', chatHandler); // auto-remove
      }
    };

    const serverHandler = (jsonMsg) => {
      const plainText = jsonMsg.toString().trim();
      const pattern = typeof text === 'string' ? text.toLowerCase() : text;
      if ((typeof pattern === 'string' && plainText.toLowerCase().includes(pattern)) ||
          (pattern instanceof RegExp && pattern.test(plainText))) {
        callback({ type: 'system', message: plainText });
        this.bot.off('message', serverHandler); // auto-remove
      }
    };

    this.bot.on('chat', chatHandler);
    this.bot.on('message', serverHandler);
  }
}

module.exports = ChatListener;

