export type EventPayload = unknown;
export type EventHandler<T = EventPayload> = (payload: T) => void;

export interface EventBridgeOptions {
  externalTarget?: EventTarget;
}

/**
 * 统一新旧事件模型：
 * - 新代码：通过 EventBridge.on/emit 订阅与派发
 * - 旧代码：仍可使用 window.addEventListener/custom events
 */
export class EventBridge {
  private readonly bus = new EventTarget();
  private readonly externalTarget: EventTarget;
  private readonly modernToLegacy = new Map<string, string[]>();
  private readonly legacyListeners = new Map<string, EventListener>();

  constructor(options: EventBridgeOptions = {}) {
    this.externalTarget = options.externalTarget ?? window;
  }

  on<T = EventPayload>(eventName: string, handler: EventHandler<T>): () => void {
    const listener = ((event: Event) => {
      handler((event as CustomEvent<T>).detail);
    }) as EventListener;

    this.bus.addEventListener(eventName, listener);
    return () => this.bus.removeEventListener(eventName, listener);
  }

  once<T = EventPayload>(eventName: string, handler: EventHandler<T>): () => void {
    const listener = ((event: Event) => {
      handler((event as CustomEvent<T>).detail);
      this.bus.removeEventListener(eventName, listener);
    }) as EventListener;

    this.bus.addEventListener(eventName, listener);
    return () => this.bus.removeEventListener(eventName, listener);
  }

  emit<T = EventPayload>(eventName: string, payload: T): void {
    this.bus.dispatchEvent(new CustomEvent<T>(eventName, { detail: payload }));

    const legacyNames = this.modernToLegacy.get(eventName) ?? [];
    legacyNames.forEach((legacyName) => {
      this.externalTarget.dispatchEvent(new CustomEvent<T>(legacyName, { detail: payload }));
    });
  }

  /**
   * 建立 legacy -> modern 的监听，同时保留 modern -> legacy 的反向广播。
   */
  bridgeEvent(legacyEventName: string, modernEventName: string): () => void {
    const listener = ((event: Event) => {
      const detail = (event as CustomEvent).detail;
      this.bus.dispatchEvent(new CustomEvent(modernEventName, { detail }));
    }) as EventListener;

    this.externalTarget.addEventListener(legacyEventName, listener);
    this.legacyListeners.set(legacyEventName, listener);

    const reverseList = this.modernToLegacy.get(modernEventName) ?? [];
    if (!reverseList.includes(legacyEventName)) {
      reverseList.push(legacyEventName);
      this.modernToLegacy.set(modernEventName, reverseList);
    }

    return () => this.unbridgeEvent(legacyEventName, modernEventName);
  }

  unbridgeEvent(legacyEventName: string, modernEventName: string): void {
    const listener = this.legacyListeners.get(legacyEventName);
    if (listener) {
      this.externalTarget.removeEventListener(legacyEventName, listener);
      this.legacyListeners.delete(legacyEventName);
    }

    const reverseList = this.modernToLegacy.get(modernEventName) ?? [];
    this.modernToLegacy.set(
      modernEventName,
      reverseList.filter((name) => name !== legacyEventName),
    );
  }

  destroy(): void {
    this.legacyListeners.forEach((listener, eventName) => {
      this.externalTarget.removeEventListener(eventName, listener);
    });

    this.legacyListeners.clear();
    this.modernToLegacy.clear();
  }
}
