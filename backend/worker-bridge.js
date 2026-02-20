const axios = require('axios');

class WorkerBridge {
  constructor() {
    this.workers = [
      { name: 'railway', url: 'https://lightweight-distributed-ai-production.up.railway.app', healthy: true },
      { name: 'koyeb', url: 'https://naughty-carina-risker666-8ce36d54.koyeb.app', healthy: true }
    ];
    this.currentIndex = 0;
    this.healthCheckInterval = null;
  }

  start() {
    this.healthCheck();
    this.healthCheckInterval = setInterval(() => this.healthCheck(), 30000);
  }

  stop() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
  }

  async healthCheck() {
    for (const worker of this.workers) {
      try {
        const res = await axios.get(`${worker.url}/health`, { timeout: 5000 });
        worker.healthy = res.status === 200;
      } catch (e) {
        worker.healthy = false;
      }
    }
  }

  getHealthyWorker() {
    const healthy = this.workers.filter(w => w.healthy);
    if (healthy.length === 0) return null;
    
    const worker = healthy[this.currentIndex % healthy.length];
    this.currentIndex++;
    return worker;
  }

  async execute(task, data) {
    const worker = this.getHealthyWorker();
    if (!worker) throw new Error('No healthy workers available');

    try {
      const res = await axios.post(`${worker.url}/execute`, { task, data }, { timeout: 30000 });
      return res.data;
    } catch (e) {
      worker.healthy = false;
      const fallback = this.getHealthyWorker();
      if (!fallback) throw new Error('All workers failed');
      
      const res = await axios.post(`${fallback.url}/execute`, { task, data }, { timeout: 30000 });
      return res.data;
    }
  }

  getStatus() {
    return this.workers.map(w => ({ name: w.name, url: w.url, healthy: w.healthy }));
  }
}

module.exports = WorkerBridge;
