export const SOCKET_EVENTS = {
  // Client to Server events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN: 'join',
  SEND_MESSAGE: 'send_message',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  TYPING: 'typing',

  // Server to Client events
  JOINED: 'joined',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  RECEIVE_MESSAGE: 'receive_message',
  ROOM_JOINED: 'room_joined',
  ROOM_LEFT: 'room_left',
  USER_TYPING: 'user_typing',
  
  // System events
  ERROR: 'error',
  CONNECT_ERROR: 'connect_error'
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];