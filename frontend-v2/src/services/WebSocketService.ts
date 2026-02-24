import { useConnectionStore } from '../stores/connectionStore'
import type { ClientWebSocketMessage, ServerWebSocketMessage } from '../types/websocket'

const READY_STATE_CONNECTING = 0
const READY_STATE_OPEN = 1

interface ReconnectOptions {
  enabled: boolean
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffFactor: number
}

export interface WebSocketLike {
  readonly readyState: number
  send: (data: string) => void
  close: (code?: number, reason?: string) => void
  addEventListener: <K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void,
  ) => void
  removeEventListener: <K extends keyof WebSocketEventMap>(
    type: K,
    listener: (event: WebSocketEventMap[K]) => void,
  ) => void
}

export type WebSocketFactory = (
  url: string,
  protocols?: string | string[],
) => WebSocketLike

export interface WebSocketServiceOptions {
  url: string
  protocols?: string | string[]
  reconnect?: Partial<ReconnectOptions>
  createWebSocket?: WebSocketFactory
}

interface WebSocketServiceEvents {
  open: Event
  close: CloseEvent
  error: Event
  rawMessage: MessageEvent
  message: ServerWebSocketMessage
  messageError: { raw: string; reason: string }
  reconnectScheduled: { attempt: number; delayMs: number }
}

type WebSocketEventName = keyof WebSocketServiceEvents

type EventListener<K extends WebSocketEventName> = (event: WebSocketServiceEvents[K]) => void

const serverMessageTypes = new Set<ServerWebSocketMessage['type']>([
  'connection:ack',
  'room:list',
  'room:joined',
  'room:users',
  'user:joined',
  'user:left',
  'user:moved',
  'object:created',
  'object:updated',
  'object:deleted',
  'whiteboard:snapshot',
  'chat:history',
  'chat:message',
  'error',
  'pong',
])

const normalizeReconnectOptions = (input?: Partial<ReconnectOptions>): ReconnectOptions => ({
  enabled: input?.enabled ?? true,
  maxAttempts: input?.maxAttempts ?? 8,
  initialDelayMs: input?.initialDelayMs ?? 500,
  maxDelayMs: input?.maxDelayMs ?? 5_000,
  backoffFactor: input?.backoffFactor ?? 1.8,
})

const defaultSocketFactory: WebSocketFactory = (url, protocols) => {
  if (typeof WebSocket === 'undefined') {
    throw new Error('WebSocket is not available. Provide createWebSocket in this runtime.')
  }

  return new WebSocket(url, protocols)
}

export const parseServerMessage = (
  raw: unknown,
): { ok: true; message: ServerWebSocketMessage } | { ok: false; reason: string; raw: string } => {
  const rawString = typeof raw === 'string' ? raw : JSON.stringify(raw)

  let parsed: unknown
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return { ok: false, reason: 'JSON parse failed', raw: rawString }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'Message must be an object', raw: rawString }
  }

  const maybeEnvelope = parsed as { type?: unknown; payload?: unknown }

  if (typeof maybeEnvelope.type !== 'string') {
    return { ok: false, reason: 'Message.type must be a string', raw: rawString }
  }

  if (!serverMessageTypes.has(maybeEnvelope.type as ServerWebSocketMessage['type'])) {
    return { ok: false, reason: `Unknown message type: ${String(maybeEnvelope.type)}`, raw: rawString }
  }

  if (typeof maybeEnvelope.payload === 'undefined') {
    return { ok: false, reason: 'Message.payload is required', raw: rawString }
  }

  return { ok: true, message: maybeEnvelope as ServerWebSocketMessage }
}

export class WebSocketService {
  private readonly url: string
  private readonly protocols?: string | string[]
  private readonly reconnect: ReconnectOptions
  private readonly createWebSocket: WebSocketFactory

  private socket: WebSocketLike | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private manuallyClosed = false
  private outboundQueue: ClientWebSocketMessage[] = []
  private messageHandler: ((message: ServerWebSocketMessage) => void) | null = null

  private listeners: {
    [K in WebSocketEventName]: Set<EventListener<K>>
  } = {
    open: new Set(),
    close: new Set(),
    error: new Set(),
    rawMessage: new Set(),
    message: new Set(),
    messageError: new Set(),
    reconnectScheduled: new Set(),
  }

  constructor(options: WebSocketServiceOptions) {
    this.url = options.url
    this.protocols = options.protocols
    this.reconnect = normalizeReconnectOptions(options.reconnect)
    this.createWebSocket = options.createWebSocket ?? defaultSocketFactory

    useConnectionStore.getState().setEndpoint(this.url)
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === READY_STATE_CONNECTING || this.socket.readyState === READY_STATE_OPEN)) {
      return
    }

    this.manuallyClosed = false
    this.clearReconnectTimer()
    useConnectionStore.getState().setStatus('connecting')

    const ws = this.createWebSocket(this.url, this.protocols)
    this.socket = ws

    ws.addEventListener('open', this.onOpen)
    ws.addEventListener('message', this.onMessage)
    ws.addEventListener('error', this.onError)
    ws.addEventListener('close', this.onClose)
  }

  disconnect(code = 1000, reason = 'Client disconnect'): void {
    this.manuallyClosed = true
    this.clearReconnectTimer()

    if (!this.socket) {
      useConnectionStore.getState().markDisconnected()
      return
    }

    const current = this.socket
    this.detachSocketListeners(current)
    this.socket = null

    if (current.readyState === READY_STATE_OPEN || current.readyState === READY_STATE_CONNECTING) {
      current.close(code, reason)
    }

    useConnectionStore.getState().markDisconnected()
  }

  dispose(): void {
    this.disconnect()
    this.clearListeners()
  }

  send(message: ClientWebSocketMessage): boolean {
    const wireMessage = JSON.stringify({
      ...message,
      timestamp: message.timestamp ?? Date.now(),
    })

    if (this.socket && this.socket.readyState === READY_STATE_OPEN) {
      this.socket.send(wireMessage)
      return true
    }

    this.outboundQueue.push(message)
    return false
  }

  isConnected(): boolean {
    return Boolean(this.socket && this.socket.readyState === READY_STATE_OPEN)
  }

  setMessageHandler(handler: ((message: ServerWebSocketMessage) => void) | null): void {
    this.messageHandler = handler
  }

  on<K extends WebSocketEventName>(eventName: K, listener: EventListener<K>): () => void {
    this.listeners[eventName].add(listener as never)

    return () => {
      this.listeners[eventName].delete(listener as never)
    }
  }

  private emit<K extends WebSocketEventName>(eventName: K, event: WebSocketServiceEvents[K]): void {
    this.listeners[eventName].forEach((listener) => {
      listener(event)
    })
  }

  private clearListeners(): void {
    this.listeners.open.clear()
    this.listeners.close.clear()
    this.listeners.error.clear()
    this.listeners.rawMessage.clear()
    this.listeners.message.clear()
    this.listeners.messageError.clear()
    this.listeners.reconnectScheduled.clear()
  }

  private flushQueue(): void {
    if (!this.socket || this.socket.readyState !== READY_STATE_OPEN || this.outboundQueue.length === 0) {
      return
    }

    const pending = [...this.outboundQueue]
    this.outboundQueue = []

    pending.forEach((message) => {
      this.send(message)
    })
  }

  private detachSocketListeners(ws: WebSocketLike): void {
    ws.removeEventListener('open', this.onOpen)
    ws.removeEventListener('message', this.onMessage)
    ws.removeEventListener('error', this.onError)
    ws.removeEventListener('close', this.onClose)
  }

  private scheduleReconnect(): void {
    if (!this.reconnect.enabled) {
      useConnectionStore.getState().markDisconnected()
      return
    }

    if (this.reconnectAttempt >= this.reconnect.maxAttempts) {
      useConnectionStore.getState().markError('Maximum reconnect attempts reached')
      return
    }

    this.reconnectAttempt += 1
    useConnectionStore.getState().incrementRetry()

    const delayMs = Math.min(
      this.reconnect.maxDelayMs,
      this.reconnect.initialDelayMs * this.reconnect.backoffFactor ** (this.reconnectAttempt - 1),
    )

    this.emit('reconnectScheduled', { attempt: this.reconnectAttempt, delayMs })

    this.clearReconnectTimer()
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delayMs)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private readonly onOpen = (event: Event): void => {
    this.reconnectAttempt = 0
    useConnectionStore.getState().markConnected()
    this.flushQueue()
    this.emit('open', event)
  }

  private readonly onMessage = (event: MessageEvent): void => {
    this.emit('rawMessage', event)

    const parsed = parseServerMessage(event.data)
    if (!parsed.ok) {
      this.emit('messageError', { raw: parsed.raw, reason: parsed.reason })
      return
    }

    this.emit('message', parsed.message)
    this.messageHandler?.(parsed.message)
  }

  private readonly onError = (event: Event): void => {
    useConnectionStore.getState().markError('WebSocket runtime error')
    this.emit('error', event)
  }

  private readonly onClose = (event: CloseEvent): void => {
    const current = this.socket
    if (current) {
      this.detachSocketListeners(current)
    }
    this.socket = null
    this.emit('close', event)

    if (this.manuallyClosed) {
      useConnectionStore.getState().markDisconnected()
      return
    }

    this.scheduleReconnect()
  }
}
