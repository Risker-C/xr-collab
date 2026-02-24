/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { DOMAdapter } from '../../../frontend/src/legacy/DOMAdapter';
import { EventBridge } from '../../../frontend/src/legacy/EventBridge';
import { LegacyBridge } from '../../../frontend/src/legacy/LegacyBridge';
import { StateSync, type Snapshot, type StateSource } from '../../../frontend/src/legacy/StateSync';

function createMutableSource(initial: Snapshot): {
  source: StateSource;
  push: (next: Snapshot) => void;
} {
  let snapshot = initial;
  const listeners = new Set<(next: Snapshot) => void>();

  return {
    source: {
      getSnapshot: () => snapshot,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    push: (next) => {
      snapshot = next;
      listeners.forEach((listener) => listener(next));
    },
  };
}

describe('DOMAdapter', () => {
  it('resolves legacy node by alias selector and creates placeholders for missing IDs', () => {
    document.body.innerHTML = `
      <div id="react-controls"></div>
      <div id="status"></div>
    `;

    const adapter = new DOMAdapter({
      aliases: {
        controls: '#react-controls',
      },
    });

    expect(adapter.getById('controls')?.id).toBe('react-controls');

    const nodes = adapter.ensureLegacyNodes(['controls', 'room-info']);
    expect(nodes.controls.id).toBe('react-controls');
    expect(nodes['room-info'].dataset.legacyPlaceholder).toBe('true');
    expect(document.getElementById('room-info')).not.toBeNull();
  });
});

describe('StateSync', () => {
  it('keeps global state values in sync via getter bindings', () => {
    const target: Record<string, unknown> = {};
    const stateSync = new StateSync({ target });
    const { source, push } = createMutableSource({ roomId: 'R001', userId: 'U001' });

    stateSync.connect(source, {
      roomId: 'currentRoom',
      userId: 'currentUserId',
    });

    expect(target.currentRoom).toBe('R001');
    expect(target.currentUserId).toBe('U001');

    push({ roomId: 'R009', userId: 'U999' });

    expect(target.currentRoom).toBe('R009');
    expect(target.currentUserId).toBe('U999');

    stateSync.disconnect();
    expect('currentRoom' in target).toBe(false);
    expect('currentUserId' in target).toBe(false);
  });
});

describe('EventBridge', () => {
  it('bridges legacy custom events and supports modern emit reverse broadcast', () => {
    const external = new EventTarget();
    const bridge = new EventBridge({ externalTarget: external });

    const modernHandler = vi.fn();
    const legacyHandler = vi.fn();

    bridge.on('room:joined', modernHandler);
    external.addEventListener('legacy-room-joined', legacyHandler);
    bridge.bridgeEvent('legacy-room-joined', 'room:joined');

    external.dispatchEvent(new CustomEvent('legacy-room-joined', { detail: { roomId: 'R123' } }));
    expect(modernHandler).toHaveBeenCalledWith({ roomId: 'R123' });

    bridge.emit('room:joined', { roomId: 'R888' });
    expect(legacyHandler).toHaveBeenCalledTimes(2);
    expect((legacyHandler.mock.calls[1][0] as CustomEvent).detail).toEqual({ roomId: 'R888' });

    bridge.destroy();
  });
});

describe('LegacyBridge', () => {
  it('installs API, state sync, DOM placeholders, and event aliases together', () => {
    document.body.innerHTML = '<main id="root"></main>';

    const fakeWindow = window as Window & typeof globalThis;
    const createCube = vi.fn(() => 'cube-created');
    const { source, push } = createMutableSource({ roomId: 'RM-01' });

    const legacyBridge = new LegacyBridge({ targetWindow: fakeWindow });

    legacyBridge.install({
      legacyApi: {
        createCube,
      },
      stateSource: source,
      stateBindings: {
        roomId: 'currentRoom',
      },
      requiredDomIds: ['controls', 'chat-toggle'],
      domAliases: {
        controls: '#root',
      },
      eventAliases: {
        'legacy-room-update': 'room:updated',
      },
    });

    expect(typeof fakeWindow.createCube).toBe('function');
    expect(fakeWindow.createCube?.()).toBe('cube-created');
    expect(createCube).toHaveBeenCalledTimes(1);

    expect(fakeWindow.currentRoom).toBe('RM-01');
    push({ roomId: 'RM-02' });
    expect(fakeWindow.currentRoom).toBe('RM-02');

    expect(document.getElementById('chat-toggle')).not.toBeNull();
    expect(legacyBridge.domAdapter.getById('controls')?.id).toBe('root');

    const handler = vi.fn();
    legacyBridge.eventBridge.on('room:updated', handler);
    window.dispatchEvent(new CustomEvent('legacy-room-update', { detail: { online: 3 } }));
    expect(handler).toHaveBeenCalledWith({ online: 3 });

    legacyBridge.uninstall();
  });
});
