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

    const runOnWorker = async (targetWorker) => {
      // v2 worker protocol: submit to /tasks then poll /tasks/:id
      try {
        const submitRes = await axios.post(
          `${targetWorker.url}/tasks`,
          { type: task, payload: data },
          { timeout: 10000 }
        );

        const taskId = submitRes.data?.id;
        if (!taskId) {
          // Some deployments may return direct result
          return submitRes.data?.result ?? submitRes.data;
        }

        const maxWaitMs = 30000;
        const pollIntervalMs = 500;
        const startedAt = Date.now();

        while (Date.now() - startedAt < maxWaitMs) {
          const pollRes = await axios.get(`${targetWorker.url}/tasks/${taskId}`, { timeout: 10000 });
          const status = pollRes.data?.status;

          if (status === 'completed') {
            return pollRes.data?.result ?? pollRes.data;
          }

          if (status === 'failed' || status === 'error') {
            throw new Error(pollRes.data?.error || 'Worker task failed');
          }

          await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error('Worker task timeout');
      } catch (e) {
        // Backward-compatible fallback for older worker protocol
        if (e.response?.status === 404) {
          const legacyRes = await axios.post(
            `${targetWorker.url}/execute`,
            { task, data },
            { timeout: 30000 }
          );
          return legacyRes.data;
        }
        throw e;
      }
    };

    try {
      return await runOnWorker(worker);
    } catch (e) {
      worker.healthy = false;
      const fallback = this.getHealthyWorker();
      if (!fallback) throw new Error('All workers failed');

      return await runOnWorker(fallback);
    }
  }

  getStatus() {
    return this.workers.map(w => ({ name: w.name, url: w.url, healthy: w.healthy }));
  }
}

module.exports = WorkerBridge;
