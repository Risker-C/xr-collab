import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useConnectionStore } from '../stores/connectionStore'
import type { WebSocketLike } from './WebSocketService'
import { WebSocketService } from './WebSocketService'

type SocketEventName = 'open' | 'message' | 'error' | 'close'

type SocketListener = (event: Event | MessageEvent | CloseEvent) => void

class FakeSocket implements WebSocketLike {
  readyState = 0
  sent: string[] = []

  private listeners: Record<SocketEventName, Set<SocketListener>> = {
    open: new Set(),
    message: new Set(),
    error: new Set(),
    close: new Set(),
  }

  addEventListener(type: SocketEventName, listener: SocketListener): void {
    this.listeners[type].add(listener)
  }

  removeEventListener(type: SocketEventName, listener: SocketListener): void {
    this.listeners[type].delete(listener)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.readyState = 3
    this.emit('close', { type: 'close' } as CloseEvent)
  }

  emit(type: SocketEventName, event: Event | MessageEvent | CloseEvent): void {
    this.listeners[type].forEach((listener) => {
      listener(event)
    })
  }

  open(): void {
    this.readyState = 1
    this.emit('open', { type: 'open' } as Event)
  }

  message(data: unknown): void {
    this.emit('message', { type: 'message', data } as MessageEvent)
  }

  terminate(): void {
    this.readyState = 3
    this.emit('close', { type: 'close' } as CloseEvent)
  }
}

describe('WebSocketService', () => {
  beforeEach(() => {
    useConnectionStore.getState().reset()
  })

  it('queues messages before open and flushes on open', () => {
    const socket = new FakeSocket()
    const service = new WebSocketService({
      url: 'ws://localhost:3001',
      createWebSocket: () => socket,
    })

    const queued = service.send({
      type: 'room:list',
      payload: {},
    })

    expect(queued).toBe(false)

    service.connect()
    socket.open()

    expect(socket.sent).toHaveLength(1)
    const message = JSON.parse(socket.sent[0]) as { type: string; payload: unknown }
    expect(message.type).toBe('room:list')
    expect(message.payload).toEqual({})
  })

  it('emits parsed server messages', () => {
    const socket = new FakeSocket()
    const service = new WebSocketService({
      url: 'ws://localhost:3001',
      createWebSocket: () => socket,
    })

    const onMessage = vi.fn()
    service.on('message', onMessage)

    service.connect()
    socket.open()
    socket.message(
      JSON.stringify({
        type: 'chat:message',
        payload: {
          id: 'msg-1',
          roomId: 'room-1',
          senderId: 'u1',
          senderName: 'Alice',
          text: 'hello',
          timestamp: 123,
        },
      }),
    )

    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0]).toMatchObject({ type: 'chat:message' })
  })

  it('schedules reconnect after unexpected close', () => {
    vi.useFakeTimers()

    const sockets: FakeSocket[] = []
    const service = new WebSocketService({
      url: 'ws://localhost:3001',
      reconnect: {
        initialDelayMs: 200,
        maxAttempts: 2,
      },
      createWebSocket: () => {
        const socket = new FakeSocket()
        sockets.push(socket)
        return socket
      },
    })

    const onReconnect = vi.fn()
    service.on('reconnectScheduled', onReconnect)

    service.connect()
    sockets[0].open()
    sockets[0].terminate()

    expect(onReconnect).toHaveBeenCalledWith({ attempt: 1, delayMs: 200 })

    vi.advanceTimersByTime(200)

    expect(sockets).toHaveLength(2)

    vi.useRealTimers()
  })
})
