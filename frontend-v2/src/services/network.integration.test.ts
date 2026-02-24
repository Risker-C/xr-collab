import { beforeEach, describe, expect, it } from 'vitest'

import { useConnectionStore } from '../stores/connectionStore'
import { useRoomStore } from '../stores/roomStore'
import { useSceneStore } from '../stores/sceneStore'
import { MessageHandler } from './MessageHandler'
import type { WebSocketLike } from './WebSocketService'
import { WebSocketService } from './WebSocketService'

class IntegrationSocket implements WebSocketLike {
  readyState = 0

  private listeners = {
    open: new Set<(event: Event) => void>(),
    message: new Set<(event: MessageEvent) => void>(),
    error: new Set<(event: Event) => void>(),
    close: new Set<(event: CloseEvent) => void>(),
  }

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void,
  ): void {
    if (type === 'open') {
      this.listeners.open.add(listener as (event: Event) => void)
    }
    if (type === 'message') {
      this.listeners.message.add(listener as (event: MessageEvent) => void)
    }
    if (type === 'error') {
      this.listeners.error.add(listener as (event: Event) => void)
    }
    if (type === 'close') {
      this.listeners.close.add(listener as (event: CloseEvent) => void)
    }
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void,
  ): void {
    if (type === 'open') {
      this.listeners.open.delete(listener as (event: Event) => void)
    }
    if (type === 'message') {
      this.listeners.message.delete(listener as (event: MessageEvent) => void)
    }
    if (type === 'error') {
      this.listeners.error.delete(listener as (event: Event) => void)
    }
    if (type === 'close') {
      this.listeners.close.delete(listener as (event: CloseEvent) => void)
    }
  }

  send(): void {
    // no-op in this integration scenario
  }

  close(): void {
    this.readyState = 3
  }

  open(): void {
    this.readyState = 1
    this.listeners.open.forEach((listener) => listener({ type: 'open' } as Event))
  }

  serverMessage(payload: unknown): void {
    this.listeners.message.forEach((listener) =>
      listener({ type: 'message', data: JSON.stringify(payload) } as MessageEvent),
    )
  }
}

describe('network integration', () => {
  beforeEach(() => {
    useConnectionStore.getState().reset()
    useRoomStore.getState().reset()
    useSceneStore.getState().reset()
  })

  it('updates stores through WebSocketService + MessageHandler', () => {
    const socket = new IntegrationSocket()
    const service = new WebSocketService({
      url: 'ws://localhost:3001',
      createWebSocket: () => socket,
      reconnect: { enabled: false },
    })
    const handler = new MessageHandler()

    service.setMessageHandler((message) => handler.handle(message))

    service.connect()
    socket.open()

    socket.serverMessage({
      type: 'room:joined',
      payload: {
        room: { id: 'room-1', name: 'Alpha' },
        role: 'owner',
        participants: [{ id: 'u1', username: 'Alice', role: 'owner', isOnline: true }],
        objects: [
          {
            id: 'obj-1',
            roomId: 'room-1',
            ownerId: 'u1',
            kind: 'cube',
            transform: {
              position: { x: 0, y: 1, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
            },
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        whiteboards: [],
      },
    })

    expect(useRoomStore.getState().currentRoom?.id).toBe('room-1')
    expect(useRoomStore.getState().participants.u1.username).toBe('Alice')
    expect(useSceneStore.getState().objects['obj-1']).toBeDefined()
  })
})
