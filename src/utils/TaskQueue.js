class TaskQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      const job = async () => {
        try {
          await task();
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      this.queue.push(job);
      this.run();
    });
  }

  async run() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const job = this.queue.shift();
      await job();
    }
    this.running = false;
  }
}

module.exports = TaskQueue;
