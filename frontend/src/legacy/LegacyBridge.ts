import { DOMAdapter, DEFAULT_LEGACY_DOM_IDS, type SelectorMap } from './DOMAdapter';
import { EventBridge } from './EventBridge';
import { StateSync, type StateBindings, type StateSource } from './StateSync';

export type LegacyApiMap = Record<string, (...args: unknown[]) => unknown>;

export interface LegacyBridgeConfig {
  legacyApi?: LegacyApiMap;
  stateSource?: StateSource;
  stateBindings?: StateBindings;
  requiredDomIds?: string[];
  domAliases?: SelectorMap;
  eventAliases?: Record<string, string>; // legacyEvent -> modernEvent
}

export interface LegacyBridgeOptions {
  targetWindow?: Window & typeof globalThis;
}

/**
 * LegacyBridge 负责统一接入兼容层：
 * 1) 旧 window API 暴露
 * 2) 旧 DOM ID 兜底
 * 3) 全局状态同步
 * 4) 新旧事件总线桥接
 */
export class LegacyBridge {
  readonly domAdapter: DOMAdapter;
  readonly stateSync: StateSync;
  readonly eventBridge: EventBridge;

  private readonly targetWindow: Window & typeof globalThis;
  private readonly apiBackup = new Map<string, PropertyDescriptor | undefined>();
  private installed = false;

  constructor(options: LegacyBridgeOptions = {}) {
    this.targetWindow = options.targetWindow ?? window;

    this.domAdapter = new DOMAdapter({ root: document });
    this.stateSync = new StateSync({ target: this.targetWindow as unknown as Record<string, unknown> });
    this.eventBridge = new EventBridge({ externalTarget: this.targetWindow });
  }

  install(config: LegacyBridgeConfig = {}): void {
    if (this.installed) return;

    if (config.domAliases) {
      Object.entries(config.domAliases).forEach(([legacyId, selectors]) => {
        this.domAdapter.registerAlias(legacyId, selectors);
      });
    }

    this.installLegacyApi(config.legacyApi ?? {});

    const requiredDomIds = config.requiredDomIds ?? DEFAULT_LEGACY_DOM_IDS;
    this.domAdapter.ensureLegacyNodes(requiredDomIds);

    if (config.stateSource && config.stateBindings) {
      this.stateSync.connect(config.stateSource, config.stateBindings);
    }

    if (config.eventAliases) {
      Object.entries(config.eventAliases).forEach(([legacyEventName, modernEventName]) => {
        this.eventBridge.bridgeEvent(legacyEventName, modernEventName);
      });
    }

    this.installed = true;
  }

  uninstall(): void {
    if (!this.installed) return;

    this.restoreLegacyApi();
    this.stateSync.disconnect();
    this.eventBridge.destroy();
    this.installed = false;
  }

  private installLegacyApi(legacyApi: LegacyApiMap): void {
    Object.entries(legacyApi).forEach(([name, fn]) => {
      if (!this.apiBackup.has(name)) {
        this.apiBackup.set(name, Object.getOwnPropertyDescriptor(this.targetWindow, name));
      }

      Object.defineProperty(this.targetWindow, name, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: fn,
      });
    });
  }

  private restoreLegacyApi(): void {
    this.apiBackup.forEach((descriptor, name) => {
      if (descriptor) {
        Object.defineProperty(this.targetWindow, name, descriptor);
      } else {
        delete (this.targetWindow as unknown as Record<string, unknown>)[name];
      }
    });

    this.apiBackup.clear();
  }
}

export function installLegacyBridge(config: LegacyBridgeConfig): LegacyBridge {
  const bridge = new LegacyBridge();
  bridge.install(config);
  return bridge;
}
