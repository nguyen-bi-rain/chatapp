import { Socket } from 'socket.io';
import { AuthUser } from '../models/user';

export interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

export interface SocketEventData {
  join: { room?: string };
  send_message: { message: string; room?: string };
  join_room: string;
  leave_room: void;
  typing: { room?: string; isTyping: boolean };
}

export interface SocketEmitData {
  joined: {
    id: string;
    username: string;
    room?: string;
    message: string;
  };
  user_joined: {
    username: string;
    message: string;
    timestamp: string;
  };
  user_left: {
    username: string;
    message: string;
    timestamp: string;
  };
  receive_message: {
    id: string;
    username: string;
    message: string;
    timestamp: string;
    room?: string;
  };
  room_joined: {
    room: string;
    message: string;
  };
  room_left: {
    room: string;
    message: string;
  };
  user_typing: {
    username: string;
    isTyping: boolean;
  };
}