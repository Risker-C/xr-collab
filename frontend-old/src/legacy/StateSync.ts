export type Snapshot = Record<string, unknown>;
export type Unsubscribe = () => void;

export interface StateSource {
  getSnapshot: () => Snapshot;
  subscribe?: (listener: (snapshot: Snapshot) => void) => Unsubscribe;
}

export type StateBindings = Record<string, string>;

export interface StateSyncOptions {
  target?: Record<string, unknown>;
}

/**
 * 将新架构状态（store）同步为旧代码可读的 window 全局字段。
 * 默认通过 getter 保持实时值，避免 window.currentRoom 初始化后失真。
 */
export class StateSync {
  private readonly target: Record<string, unknown>;
  private readonly descriptorBackup = new Map<string, PropertyDescriptor | undefined>();
  private unsubscribe: Unsubscribe | null = null;
  private snapshot: Snapshot = {};
  private activeBindings: StateBindings = {};

  constructor(options: StateSyncOptions = {}) {
    this.target = options.target ?? (globalThis as Record<string, unknown>);
  }

  connect(source: StateSource, bindings: StateBindings): void {
    this.disconnect();

    this.activeBindings = { ...bindings };
    this.snapshot = source.getSnapshot();

    Object.entries(this.activeBindings).forEach(([sourceKey, globalKey]) => {
      void sourceKey;
      this.installGetter(globalKey);
    });

    if (source.subscribe) {
      this.unsubscribe = source.subscribe((nextSnapshot) => {
        this.snapshot = nextSnapshot;
      });
    }
  }

  update(snapshot: Snapshot): void {
    this.snapshot = snapshot;
  }

  disconnect(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    for (const [globalKey, descriptor] of this.descriptorBackup.entries()) {
      if (descriptor) {
        Object.defineProperty(this.target, globalKey, descriptor);
      } else {
        delete this.target[globalKey];
      }
    }

    this.descriptorBackup.clear();
    this.activeBindings = {};
    this.snapshot = {};
  }

  private installGetter(globalKey: string): void {
    if (!this.descriptorBackup.has(globalKey)) {
      this.descriptorBackup.set(globalKey, Object.getOwnPropertyDescriptor(this.target, globalKey));
    }

    Object.defineProperty(this.target, globalKey, {
      configurable: true,
      enumerable: true,
      get: () => {
        const sourceKey = this.findSourceKey(globalKey);
        return sourceKey ? this.snapshot[sourceKey] : undefined;
      },
    });
  }

  private findSourceKey(globalKey: string): string | undefined {
    return Object.keys(this.activeBindings).find((key) => this.activeBindings[key] === globalKey);
  }

}
