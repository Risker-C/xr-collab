import Stats from 'three/addons/libs/stats.module.js';

export class PerformanceMonitor {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.sampleFrames = options.sampleFrames || 90;
        this.samples = [];
        this.lastFrameAt = performance.now();
        this.metrics = {
            fps: 0,
            avgFrameMs: 0,
            memoryMB: 0,
            drawCalls: 0,
            triangles: 0
        };

        if (this.enabled) {
            this.stats = new Stats();
            this.stats.showPanel(0);
            this.stats.dom.style.left = 'auto';
            this.stats.dom.style.right = '8px';
            this.stats.dom.style.top = '8px';
            document.body.appendChild(this.stats.dom);
        }
    }

    begin() {
        this.stats?.begin();
    }

    end(renderer) {
        this.stats?.end();

        const now = performance.now();
        const frameMs = now - this.lastFrameAt;
        this.lastFrameAt = now;

        this.samples.push(frameMs);
        if (this.samples.length > this.sampleFrames) {
            this.samples.shift();
        }

        const total = this.samples.reduce((acc, value) => acc + value, 0);
        const avgFrameMs = total / this.samples.length;

        this.metrics.avgFrameMs = Number(avgFrameMs.toFixed(2));
        this.metrics.fps = Number((1000 / avgFrameMs).toFixed(1));
        this.metrics.drawCalls = renderer?.info?.render?.calls || 0;
        this.metrics.triangles = renderer?.info?.render?.triangles || 0;

        if (performance.memory) {
            this.metrics.memoryMB = Number((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1));
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }
}
