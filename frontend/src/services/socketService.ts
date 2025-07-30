// socketService.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;

  constructor() {
    // Fix the environment variable name for Vite
    this.serverUrl =  'http://localhost:3001';
  }

  connect(token: string): Promise<void> {
    console.log('Connecting to socket server with token:', token);
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.serverUrl, {
        auth: {
          token: token // Remove 'Bearer' prefix - backend middleware adds it
        },
        transports: ['websocket', 'polling'],
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to socket server, ID:', this.socket?.id);
        this.isConnected = true;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from socket server:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('🔴 Socket connection error:', error.message);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error('🔴 Socket error:', error);
      });

      // Set connection timeout
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Join a room
  joinRoom(roomName: string): void {
    if (this.socket && this.isConnected) {
      console.log('🏠 Joining room:', roomName);
      this.socket.emit('join_room', roomName);
    } else {
      console.warn('❌ Cannot join room - socket not connected');
    }
  }

  // Leave current room
  leaveRoom(): void {
    if (this.socket && this.isConnected) {
      console.log('🚪 Leaving room...');
      this.socket.emit('leave_room');
    }
  }

  // Send message to room
  sendMessage(message: string, room: string): void {
    if (this.socket && this.isConnected) {
      console.log('📤 Sending message to room:', room, message);
      this.socket.emit('send_message', { 
        message, 
        room 
      });
    } else {
      console.warn('❌ Cannot send message - socket not connected');
    }
  }

  // Listen for incoming messages - Fix the event name!
  onMessage(callback: (data: any) => void): void {
    if (this.socket) {
      // Listen for the correct event name from backend
      this.socket.on('receive_message', (data) => {
        console.log('📥 Received message:', data);
        callback(data);
      });
    }
  }

  // Listen for user joined events
  onUserJoined(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user_joined', (data) => {
        console.log('👋 User joined:', data);
        callback(data);
      });
    }
  }

  // Listen for user left events
  onUserLeft(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user_left', (data) => {
        console.log('👋 User left:', data);
        callback(data);
      });
    }
  }

  // Listen for room joined confirmation
  onRoomJoined(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('room_joined', (data) => {
        console.log('🏠 Room joined confirmed:', data);
        callback(data);
      });
    }
  }

  // Listen for notifications
  onNotification(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('notification', callback);
    }
  }

  // Listen for typing indicators
  onTyping(callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  // Send typing indicator
  sendTyping(room: string, isTyping: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { room, isTyping });
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event?: string): void {
    if (this.socket) {
      if (event) {
        this.socket.removeAllListeners(event);
      } else {
        this.socket.removeAllListeners();
      }
    }
  }

  // Remove specific listener
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Generic event listener
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Generic event emitter
  emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();