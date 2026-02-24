export type SelectorMap = Record<string, string | string[]>;

export interface DOMAdapterOptions {
  root?: Document | HTMLElement;
  aliases?: SelectorMap;
  placeholderClassName?: string;
}

/**
 * DOMAdapter 为过渡期提供“旧 DOM ID -> 新 DOM 结构”的查询兼容能力。
 */
export class DOMAdapter {
  private readonly root: Document | HTMLElement;
  private readonly aliases = new Map<string, string[]>();
  private readonly placeholderClassName: string;

  constructor(options: DOMAdapterOptions = {}) {
    this.root = options.root ?? document;
    this.placeholderClassName = options.placeholderClassName ?? 'legacy-dom-placeholder';

    if (options.aliases) {
      Object.entries(options.aliases).forEach(([legacyId, selectors]) => {
        this.registerAlias(legacyId, selectors);
      });
    }
  }

  registerAlias(legacyId: string, selectors: string | string[]): void {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    this.aliases.set(legacyId, list);
  }

  getById(legacyId: string): HTMLElement | null {
    const direct = this.findById(legacyId);
    if (direct) return direct;

    const candidates = this.aliases.get(legacyId) ?? [];
    for (const selector of candidates) {
      const node = this.query(selector);
      if (node) return node;
    }

    return null;
  }

  query(selector: string): HTMLElement | null {
    return this.root.querySelector(selector) as HTMLElement | null;
  }

  getRequired(legacyId: string): HTMLElement {
    const found = this.getById(legacyId);
    if (found) return found;

    throw new Error(`[DOMAdapter] Missing legacy node: ${legacyId}`);
  }

  /**
   * 确保过渡期旧代码依赖的节点存在。若缺失，自动注入隐藏占位节点。
   */
  ensureLegacyNodes(ids: string[], mountPoint?: HTMLElement): Record<string, HTMLElement> {
    const container = mountPoint ?? this.resolveDefaultMountPoint();
    const result: Record<string, HTMLElement> = {};

    ids.forEach((id) => {
      const existing = this.getById(id);
      if (existing) {
        result[id] = existing;
        return;
      }

      const placeholder = this.createPlaceholder(id);
      container.appendChild(placeholder);
      result[id] = placeholder;
    });

    return result;
  }

  private findById(id: string): HTMLElement | null {
    if (this.root instanceof Document) {
      return this.root.getElementById(id);
    }

    return this.root.querySelector(`[id="${this.escapeAttribute(id)}"]`) as HTMLElement | null;
  }

  private resolveDefaultMountPoint(): HTMLElement {
    if (this.root instanceof Document) {
      return this.root.body;
    }

    if (this.root instanceof HTMLElement) {
      return this.root;
    }

    throw new Error('[DOMAdapter] Unable to resolve mount point for legacy placeholders.');
  }

  private createPlaceholder(id: string): HTMLElement {
    const node = document.createElement('div');
    node.id = id;
    node.className = this.placeholderClassName;
    node.hidden = true;
    node.dataset.legacyPlaceholder = 'true';
    return node;
  }

  private escapeAttribute(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}

export const DEFAULT_LEGACY_DOM_IDS = [
  'controls',
  'status',
  'room-info',
  'room-info-text',
  'undo-btn',
  'redo-btn',
  'history-count',
  'chat-open-btn',
  'chat-toggle',
  'worker-result',
];
