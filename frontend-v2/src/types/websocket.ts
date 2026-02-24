import type { RoomParticipant, RoomRole, RoomSummary } from './room'
import type { SceneObject, UserPose, WhiteboardSnapshot } from './scene'

export interface MessageEnvelope<TType extends string, TPayload> {
  type: TType
  payload: TPayload
  requestId?: string
  timestamp?: number
}

export interface RoomJoinRequest {
  roomId: string
  username: string
  password?: string
}

export interface RoomJoinedPayload {
  room: RoomSummary
  role: RoomRole
  participants: RoomParticipant[]
  objects: SceneObject[]
  whiteboards: WhiteboardSnapshot[]
}

export interface RoomUsersPayload {
  participants: RoomParticipant[]
}

export interface ParticipantLeftPayload {
  participantId: string
}

export interface ObjectPatchPayload {
  objectId: string
  updates: Partial<Omit<SceneObject, 'id' | 'roomId' | 'createdAt'>>
}

export interface ObjectDeletePayload {
  objectId: string
}

export interface WhiteboardPatchPayload {
  whiteboardId: string
  snapshot: WhiteboardSnapshot
}

export interface ChatSendPayload {
  text: string
}

export interface ChatMessagePayload {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
}

export interface ErrorPayload {
  code: string
  message: string
  recoverable?: boolean
}

export interface PingPayload {
  sentAt: number
}

export interface PongPayload {
  sentAt: number
  receivedAt: number
}

export type ClientWebSocketMessage =
  | MessageEnvelope<'room:list', Record<string, never>>
  | MessageEnvelope<'room:join', RoomJoinRequest>
  | MessageEnvelope<'room:leave', { roomId: string }>
  | MessageEnvelope<'user:set-name', { username: string }>
  | MessageEnvelope<'user:pose', { roomId: string; userId: string; pose: UserPose }>
  | MessageEnvelope<'object:create', SceneObject>
  | MessageEnvelope<'object:update', ObjectPatchPayload>
  | MessageEnvelope<'object:delete', ObjectDeletePayload>
  | MessageEnvelope<'whiteboard:update', WhiteboardPatchPayload>
  | MessageEnvelope<'chat:send', ChatSendPayload>
  | MessageEnvelope<'ping', PingPayload>

export type ServerWebSocketMessage =
  | MessageEnvelope<'connection:ack', { connectionId: string }>
  | MessageEnvelope<'room:list', { rooms: RoomSummary[] }>
  | MessageEnvelope<'room:joined', RoomJoinedPayload>
  | MessageEnvelope<'room:users', RoomUsersPayload>
  | MessageEnvelope<'user:joined', RoomParticipant>
  | MessageEnvelope<'user:left', ParticipantLeftPayload>
  | MessageEnvelope<'user:moved', { userId: string; pose: UserPose }>
  | MessageEnvelope<'object:created', SceneObject>
  | MessageEnvelope<'object:updated', ObjectPatchPayload>
  | MessageEnvelope<'object:deleted', ObjectDeletePayload>
  | MessageEnvelope<'whiteboard:snapshot', WhiteboardSnapshot>
  | MessageEnvelope<'chat:history', { messages: ChatMessagePayload[] }>
  | MessageEnvelope<'chat:message', ChatMessagePayload>
  | MessageEnvelope<'error', ErrorPayload>
  | MessageEnvelope<'pong', PongPayload>

export type AnyWebSocketMessage = ClientWebSocketMessage | ServerWebSocketMessage

export type WebSocketMessageType = AnyWebSocketMessage['type']
