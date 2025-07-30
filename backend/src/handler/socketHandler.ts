import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/socketAuth';
import { AuthService } from '../services/authService';
import { MessageService } from '../services/messageService';
import { RoomService } from '../services/roomService';
import { AuthenticatedSocket } from '../types/socket';
import { SOCKET_EVENTS } from '../events/socketEvents';
import { SocketService } from '../services/socketService';

// Store connected users (now synced with database)
const connectedUsers = new Map<string, { id: string; username: string; room?: string }>();

export function setupSocketHandlers(io: Server): void {
  // Initialize socket service
  SocketService.setIO(io);

  // Add authentication middleware to Socket.IO
  io.use(socketAuthMiddleware);

  // Socket.IO connection handling
  io.on(SOCKET_EVENTS.CONNECTION, async (socket: AuthenticatedSocket) => {
    console.log('Authenticated user connected:', socket.user?.username, socket.id);

    // Subscribe user to all their existing rooms for real-time messaging
    if (socket.user) {
      try {
        const userRooms = await RoomService.getUserRooms(socket.user._id);
        const roomNames = userRooms.map(room => room.name);
        
        // Subscribe to all user's rooms
        SocketService.subscribeUserToRooms(socket.user._id, roomNames);
        
        // Join socket to all rooms
        roomNames.forEach(roomName => {
          socket.join(roomName);
        });
        
        console.log(`${socket.user.username} subscribed to rooms:`, roomNames);
      } catch (error) {
        console.error('Error subscribing user to rooms:', error);
      }
    }

    // Handle user joining
    socket.on(SOCKET_EVENTS.JOIN, async (data: { room?: string }) => {
      if (!socket.user) return;
      
      try {
        const { room } = data;
        const username = socket.user.username;
        
        // Update user info in AuthService
        AuthService.updateUserRoom(socket.user._id, room);
        AuthService.updateUserStatus(socket.user._id, true);

        // Store user info
        connectedUsers.set(socket.id, { id: socket.user._id, username, room });

        if (room) {
          // Join or create room in database
          await RoomService.joinRoom(room, socket.user);
          socket.join(room);
          
          // Notify others in room
          socket.to(room).emit(SOCKET_EVENTS.USER_JOINED, {
            username,
            message: `${username} joined the room`,
            timestamp: new Date().toISOString()
          });

          // Load recent messages for the user
          const { messages } = await MessageService.getRoomMessages(room, 20);
          socket.emit('room_history', { room, messages });
        }
        
        // Send confirmation back to user
        socket.emit(SOCKET_EVENTS.JOINED, {
          id: socket.id,
          username,
          room,
          message: room ? `Joined room: ${room}` : 'Connected to chat'
        });
        
        console.log(`${username} joined ${room ? `room: ${room}` : 'the chat'}`);
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to join' 
        });
      }
    });

    // Handle sending messages
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (data: { 
      message: string; 
      room?: string; 
      replyTo?: string;
      mentions?: string[];
    }) => {
      if (!socket.user) return;

      try {
        // Save message to database
        const savedMessage = await MessageService.createMessage({
          content: data.message,
          sender: socket.user,
          room: data.room,
          replyTo: data.replyTo,
          mentions: data.mentions
        });

        const messageData = {
          id: savedMessage._id,
          username: socket.user.username,
          message: data.message,
          timestamp: savedMessage.timestamp.toISOString(),
          room: data.room,
          replyTo: data.replyTo,
          mentions: data.mentions,
          isEdited: false,
          sender: {
            id: socket.user._id,
            username: socket.user.username,
            email: socket.user.email
          }
        };

        if (data.room) {
          // Send to specific room - all users in that room will receive it
          SocketService.sendToRoom(data.room, SOCKET_EVENTS.RECEIVE_MESSAGE, messageData);
          
          // Update user's last seen in room
          RoomService.updateUserLastSeen(data.room, socket.user._id);
        } else {
          // Broadcast to all connected users
          SocketService.broadcast(SOCKET_EVENTS.RECEIVE_MESSAGE, messageData);
        }
        
        console.log(`Message from ${socket.user.username} saved to DB: ${data.message}`);
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to send message' 
        });
      }
    });

    // Handle joining a room
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (room: string) => {
      if (!socket.user) return;

      try {
        // Join new room in database
        await RoomService.joinRoom(room, socket.user);
        
        // Add to socket room
        socket.join(room);
        
        // Add to user's room membership tracking
        SocketService.addUserToRoom(socket.user._id, room);
        
        // Update AuthService
        AuthService.updateUserRoom(socket.user._id, room);
        
        // Update connected users map
        const user = connectedUsers.get(socket.id);
        if (user) user.room = room;
        
        // Notify others in room
        socket.to(room).emit(SOCKET_EVENTS.USER_JOINED, {
          username: socket.user.username,
          message: `${socket.user.username} joined the room`,
          timestamp: new Date().toISOString()
        });

        // Load recent messages for the user
        const { messages, room: roomInfo } = await MessageService.getRoomMessages(room, 20);
        
        socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
          room,
          message: `Joined room: ${room}`,
          roomInfo,
          recentMessages: messages
        });

        console.log(`${socket.user.username} joined room: ${room}`);
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to join room' 
        });
      }
    });

    // Handle leaving a room
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, async (roomToLeave?: string) => {
      if (!socket.user) return;
      
      try {
        const user = connectedUsers.get(socket.id);
        const currentRoom = roomToLeave || user?.room;
        if (!currentRoom) return;

        // Leave room
        socket.leave(currentRoom);
        await RoomService.leaveRoom(currentRoom, socket.user._id);
        
        // Remove from membership tracking
        SocketService.removeUserFromRoom(socket.user._id, currentRoom);
        
        // Notify others in room
        socket.to(currentRoom).emit(SOCKET_EVENTS.USER_LEFT, {
          username: socket.user.username,
          message: `${socket.user.username} left the room`,
          timestamp: new Date().toISOString()
        });

        // Update user info (only if leaving current active room)
        if (!roomToLeave && user) {
          AuthService.updateUserRoom(socket.user._id);
          user.room = undefined;
        }
        
        socket.emit(SOCKET_EVENTS.ROOM_LEFT, {
          room: currentRoom,
          message: `Left room: ${currentRoom}`
        });

        console.log(`${socket.user.username} left room: ${currentRoom}`);
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to leave room' 
        });
      }
    });

    // Handle message reactions
    socket.on('add_reaction', async (data: { messageId: string; emoji: string }) => {
      if (!socket.user) return;

      try {
        const message = await MessageService.addReaction(
          data.messageId,
          socket.user._id,
          socket.user.username,
          data.emoji
        );

        if (message) {
          const targetRoom = message.room;
          const eventData = {
            messageId: data.messageId,
            emoji: data.emoji,
            username: socket.user.username,
            userId: socket.user._id
          };

          if (targetRoom) {
            io.to(targetRoom).emit('message_reaction', eventData);
          } else {
            io.emit('message_reaction', eventData);
          }
        }
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to add reaction' 
        });
      }
    });

    // Handle message editing
    socket.on('edit_message', async (data: { messageId: string; newContent: string }) => {
      if (!socket.user) return;

      try {
        const message = await MessageService.editMessage(
          data.messageId,
          data.newContent,
          socket.user._id
        );

        if (message) {
          const eventData = {
            messageId: data.messageId,
            newContent: data.newContent,
            editedAt: message.editedAt,
            isEdited: true
          };

          if (message.room) {
            io.to(message.room).emit('message_edited', eventData);
          } else {
            io.emit('message_edited', eventData);
          }
        }
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to edit message' 
        });
      }
    });

    // Handle message deletion
    socket.on('delete_message', async (data: { messageId: string }) => {
      if (!socket.user) return;

      try {
        const success = await MessageService.deleteMessage(data.messageId, socket.user._id);

        if (success) {
          // Note: We need to get the message to know which room to emit to
          // In a real implementation, you might want to store this info differently
          socket.emit('message_deleted', { messageId: data.messageId });
        }
      } catch (error) {
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to delete message' 
        });
      }
    });

    // Handle typing indicators
    socket.on(SOCKET_EVENTS.TYPING, async (data: { room?: string; isTyping: boolean }) => {
      if (!socket.user) return;

      const typingData = {
        username: socket.user.username,
        isTyping: data.isTyping
      };

      if (data.room) {
        socket.to(data.room).emit(SOCKET_EVENTS.USER_TYPING, typingData);
        
        // Update last seen when user is typing
        if (data.isTyping) {
          RoomService.updateUserLastSeen(data.room, socket.user._id);
        }
      } else {
        socket.broadcast.emit(SOCKET_EVENTS.USER_TYPING, typingData);
      }
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      if (socket.user) {
        try {
          // Update user status to offline
          AuthService.updateUserStatus(socket.user._id, false);
          
          // Notify all rooms the user was in about their departure
          const userRooms = SocketService.getUserRooms(socket.user._id);
          userRooms.forEach(room => {
            socket.to(room).emit(SOCKET_EVENTS.USER_LEFT, {
              username: socket.user!.username,
              message: `${socket.user!.username} disconnected`,
              timestamp: new Date().toISOString()
            });
          });
          
          // Clean up all room memberships
          SocketService.cleanupUserMemberships(socket.user._id);
          
          // Update room last seen for current room if any
          const user = connectedUsers.get(socket.id);
          if (user?.room) {
            await RoomService.updateUserLastSeen(user.room, socket.user._id);
          }
          
          connectedUsers.delete(socket.id);
          console.log(`${socket.user.username} disconnected`);
        } catch (error) {
          console.error('Error handling disconnect:', error);
        }
      } else {
        console.log('User disconnected:', socket.id);
      }
    });
  });
}

// Export helper functions for room management
export class SocketRoomManager {
  static getConnectedUsers(): Map<string, { id: string; username: string; room?: string }> {
    return connectedUsers;
  }

  static getUserBySocketId(socketId: string): { id: string; username: string; room?: string } | undefined {
    return connectedUsers.get(socketId);
  }

  static getUsersInRoom(room: string): Array<{ id: string; username: string; room?: string }> {
    return Array.from(connectedUsers.values()).filter(user => user.room === room);
  }

  static removeUser(socketId: string): void {
    connectedUsers.delete(socketId);
  }

  static getUserCount(): number {
    return connectedUsers.size;
  }

  static getRoomCount(): number {
    const rooms = new Set(Array.from(connectedUsers.values()).map(user => user.room).filter(Boolean));
    return rooms.size;
  }
}