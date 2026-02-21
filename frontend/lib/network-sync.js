// Optimized Network Sync Manager for XR Collab
// Implements incremental updates, compression, dynamic frequency adjustment

class NetworkSyncManager {
  constructor(socket, options = {}) {
    this.socket = socket;
    this.localState = new Map(); // entityId -> state
    this.lastSentState = new Map();
    this.syncInterval = 50; // ms, will be dynamic
    this.latency = 0;
    this.messageQueue = [];
    this.metrics = {
      packetsSent: 0,
      bytesSent: 0,
      packetsReceived: 0,
      latencyHistory: [],
      avgLatency: 0
    };
    this.debug = options.debug || false;
    
    this.setupListeners();
    this.startSyncLoop();
    this.startLatencyMonitor();
  }

  setupListeners() {
    this.socket.on('pong', (timestamp) => {
      const now = Date.now();
      this.latency = now - timestamp;
      this.metrics.latencyHistory.push(this.latency);
      if (this.metrics.latencyHistory.length > 10) {
        this.metrics.latencyHistory.shift();
      }
      this.metrics.avgLatency = this.metrics.latencyHistory.reduce((a,b) => a+b, 0) / this.metrics.latencyHistory.length;
      this.adjustFrequency();
    });

    this.socket.on('state-update', (data) => {
      this.metrics.packetsReceived++;
      this.applyDelta(data);
    });
  }

  // Incremental update: only send changed fields
  getDelta(entityId, currentState) {
    const lastState = this.lastSentState.get(entityId) || {};
    const delta = {};
    let hasChanges = false;

    for (const key in currentState) {
      if (JSON.stringify(currentState[key]) !== JSON.stringify(lastState[key])) {
        delta[key] = currentState[key];
        hasChanges = true;
      }
    }

    return hasChanges ? delta : null;
  }

  // Dynamic frequency adjustment based on latency
  adjustFrequency() {
    if (this.latency < 50) {
      this.syncInterval = 16; // ~60fps for good network
    } else if (this.latency < 100) {
      this.syncInterval = 33; // ~30fps for medium network
    } else {
      this.syncInterval = 100; // ~10fps for poor network
    }
  }

  // Update entity state
  updateEntity(entityId, state, priority = 'normal') {
    this.localState.set(entityId, state);
    
    const delta = this.getDelta(entityId, state);
    if (!delta) return; // No changes

    this.messageQueue.push({
      entityId,
      delta,
      priority,
      timestamp: Date.now()
    });

    this.lastSentState.set(entityId, {...state});
  }

  // Batch and compress messages
  flushQueue() {
    if (this.messageQueue.length === 0) return;

    // Sort by priority (high > normal > low)
    const priorityMap = { high: 3, normal: 2, low: 1 };
    this.messageQueue.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);

    // Batch up to 10 messages
    const batch = this.messageQueue.splice(0, 10);
    
    // Simple compression: use shorter keys
    const compressed = batch.map(msg => ({
      e: msg.entityId,
      d: msg.delta,
      t: msg.timestamp
    }));

    const message = JSON.stringify(compressed);
    this.socket.emit('state-update-batch', compressed);
    
    this.metrics.packetsSent++;
    this.metrics.bytesSent += message.length;

    if (this.debug) {
      console.log(`Sent batch: ${batch.length} updates, ${message.length} bytes`);
    }
  }

  // Apply received delta updates
  applyDelta(updates) {
    updates.forEach(update => {
      const entityId = update.e || update.entityId;
      const delta = update.d || update.delta;
      
      const current = this.localState.get(entityId) || {};
      const merged = { ...current, ...delta };
      this.localState.set(entityId, merged);
      
      // Trigger update callback if registered
      if (this.onEntityUpdate) {
        this.onEntityUpdate(entityId, merged);
      }
    });
  }

  startSyncLoop() {
    setInterval(() => {
      this.flushQueue();
    }, this.syncInterval);
  }

  startLatencyMonitor() {
    setInterval(() => {
      this.socket.emit('ping', Date.now());
    }, 1000);
  }

  getMetrics() {
    return {
      ...this.metrics,
      currentInterval: this.syncInterval,
      queueSize: this.messageQueue.length,
      entitiesTracked: this.localState.size
    };
  }

  logMetrics() {
    console.table(this.getMetrics());
  }

  // Remove entity from tracking
  removeEntity(entityId) {
    this.localState.delete(entityId);
    this.lastSentState.delete(entityId);
  }

  // Clear all state
  clear() {
    this.localState.clear();
    this.lastSentState.clear();
    this.messageQueue = [];
  }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkSyncManager;
}
