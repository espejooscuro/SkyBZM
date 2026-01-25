const delay = ms => new Promise(r => setTimeout(r, ms));
const ContainerManager = require('ContainerManager');

class AutoBoosterCookie {
  constructor(bot, ChatListener, queue) {
    this.queue = queue;
    this.bot = bot;
    this.finished = false;
    this.ContainerManager = new ContainerManager(bot);
    this.ChatListener = ChatListener;
  }

  getBoostercookie() {
    return this.queue.enqueue(async () => {
      delay(2000)
      this.ChatListener.send("/boostercookie");
      delay(2000)
      
      this.queue = null;  // automatically release reference
    });
  }
}

module.exports = AutoBoosterCookie;
