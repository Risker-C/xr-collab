import { useConnectionStore } from '../stores/connectionStore'
import { useRoomStore } from '../stores/roomStore'
import { useSceneStore } from '../stores/sceneStore'
import { useUiStore } from '../stores/uiStore'
import type { RoomParticipant, RoomRole, RoomSummary } from '../types/room'
import type { SceneObject, SceneTransform, WhiteboardSnapshot } from '../types/scene'
import type { ServerWebSocketMessage } from '../types/websocket'

export interface MessageHandlerDependencies {
  room: {
    getParticipant: (participantId: string) => RoomParticipant | undefined
    setCurrentRoom: (room: RoomSummary | null) => void
    setRole: (role: RoomRole) => void
    setParticipants: (participants: RoomParticipant[]) => void
    upsertParticipant: (participant: RoomParticipant) => void
    removeParticipant: (participantId: string) => void
  }
  scene: {
    setObjects: (objects: SceneObject[]) => void
    upsertObject: (object: SceneObject) => void
    patchObjectTransform: (objectId: string, transform: Partial<SceneTransform>) => void
    removeObject: (objectId: string) => void
    setWhiteboard: (whiteboard: WhiteboardSnapshot) => void
  }
  connection: {
    markError: (message: string) => void
    setLatency: (latencyMs: number | null) => void
  }
  ui: {
    pushToast: (toast: { level: 'info' | 'success' | 'warning' | 'error'; message: string }) => string
  }
}

type ServerMessageType = ServerWebSocketMessage['type']

type TypedMessage<T extends ServerMessageType> = Extract<ServerWebSocketMessage, { type: T }>

type TypedHandler<T extends ServerMessageType> = (message: TypedMessage<T>) => void

const createDefaultDependencies = (): MessageHandlerDependencies => ({
  room: {
    getParticipant: (participantId) => useRoomStore.getState().participants[participantId],
    setCurrentRoom: (room) => useRoomStore.getState().setCurrentRoom(room),
    setRole: (role) => useRoomStore.getState().setRole(role),
    setParticipants: (participants) => useRoomStore.getState().setParticipants(participants),
    upsertParticipant: (participant) => useRoomStore.getState().upsertParticipant(participant),
    removeParticipant: (participantId) => useRoomStore.getState().removeParticipant(participantId),
  },
  scene: {
    setObjects: (objects) => useSceneStore.getState().setObjects(objects),
    upsertObject: (object) => useSceneStore.getState().upsertObject(object),
    patchObjectTransform: (objectId, transform) =>
      useSceneStore.getState().patchObjectTransform(objectId, transform),
    removeObject: (objectId) => useSceneStore.getState().removeObject(objectId),
    setWhiteboard: (whiteboard) => useSceneStore.getState().setWhiteboard(whiteboard),
  },
  connection: {
    markError: (message) => useConnectionStore.getState().markError(message),
    setLatency: (latencyMs) => useConnectionStore.getState().setLatency(latencyMs),
  },
  ui: {
    pushToast: (toast) => useUiStore.getState().pushToast(toast),
  },
})

export class MessageHandler {
  private readonly routes = new Map<ServerMessageType, (message: ServerWebSocketMessage) => void>()
  private readonly deps: MessageHandlerDependencies

  constructor(deps: MessageHandlerDependencies = createDefaultDependencies()) {
    this.deps = deps
    this.registerBuiltInRoutes()
  }

  handle(message: ServerWebSocketMessage): void {
    const route = this.routes.get(message.type)
    if (!route) {
      return
    }

    route(message)
  }

  register<T extends ServerMessageType>(type: T, handler: TypedHandler<T>): void {
    this.routes.set(type, handler as (message: ServerWebSocketMessage) => void)
  }

  private registerBuiltInRoutes(): void {
    this.register('room:joined', (message) => {
      this.deps.room.setCurrentRoom(message.payload.room)
      this.deps.room.setRole(message.payload.role)
      this.deps.room.setParticipants(message.payload.participants)
      this.deps.scene.setObjects(message.payload.objects)

      message.payload.whiteboards.forEach((whiteboard) => {
        this.deps.scene.setWhiteboard(whiteboard)
      })
    })

    this.register('room:users', (message) => {
      this.deps.room.setParticipants(message.payload.participants)
    })

    this.register('user:joined', (message) => {
      this.deps.room.upsertParticipant(message.payload)
    })

    this.register('user:left', (message) => {
      this.deps.room.removeParticipant(message.payload.participantId)
    })

    this.register('user:moved', (message) => {
      const existing = this.deps.room.getParticipant(message.payload.userId)
      if (!existing) {
        return
      }

      this.deps.room.upsertParticipant({
        ...existing,
        pose: message.payload.pose,
        updatedAt: Date.now(),
      })
    })

    this.register('object:created', (message) => {
      this.deps.scene.upsertObject(message.payload)
    })

    this.register('object:updated', (message) => {
      if (message.payload.updates.transform) {
        this.deps.scene.patchObjectTransform(message.payload.objectId, message.payload.updates.transform)
      }
    })

    this.register('object:deleted', (message) => {
      this.deps.scene.removeObject(message.payload.objectId)
    })

    this.register('whiteboard:snapshot', (message) => {
      this.deps.scene.setWhiteboard(message.payload)
    })

    this.register('chat:message', (message) => {
      this.deps.ui.pushToast({
        level: 'info',
        message: `${message.payload.senderName}: ${message.payload.text}`,
      })
    })

    this.register('error', (message) => {
      this.deps.connection.markError(message.payload.message)
      this.deps.ui.pushToast({
        level: 'error',
        message: message.payload.message,
      })
    })

    this.register('pong', (message) => {
      this.deps.connection.setLatency(Math.max(0, message.payload.receivedAt - message.payload.sentAt))
    })
  }
}
