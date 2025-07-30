import { Server } from 'socket.io';
import { SocketRoomManager } from '../handler/socketHandler';

export class SocketService {
  private static io: Server;
  // Track user's room memberships for real-time messaging
  private static readonly userRoomMemberships = new Map<string, Set<string>>(); // userId -> Set of rooms

  static setIO(io: Server): void {
    this.io = io;
  }

  static getIO(): Server {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }
    return this.io;
  }

  // Send message to specific user
  static sendToUser(userId: string, event: string, data: any): void {
    const users = SocketRoomManager.getConnectedUsers();
    for (const [socketId, user] of users) {
      if (user.id === userId) {
        this.io.to(socketId).emit(event, data);
        break;
      }
    }
  }

  // Send message to all users in a room
  static sendToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  // Send message to user in all their joined rooms
  static sendToUserInAllRooms(userId: string, event: string, data: any): void {
    const userRooms = this.userRoomMemberships.get(userId);
    if (userRooms) {
      userRooms.forEach(room => {
        this.io.to(room).emit(event, data);
      });
    }
  }

  // Add user to room membership tracking
  static addUserToRoom(userId: string, room: string): void {
    if (!this.userRoomMemberships.has(userId)) {
      this.userRoomMemberships.set(userId, new Set());
    }
    this.userRoomMemberships.get(userId)!.add(room);
  }

  // Remove user from room membership tracking
  static removeUserFromRoom(userId: string, room: string): void {
    const userRooms = this.userRoomMemberships.get(userId);
    if (userRooms) {
      userRooms.delete(room);
      if (userRooms.size === 0) {
        this.userRoomMemberships.delete(userId);
      }
    }
  }

  // Get all rooms user is subscribed to
  static getUserRooms(userId: string): string[] {
    const userRooms = this.userRoomMemberships.get(userId);
    return userRooms ? Array.from(userRooms) : [];
  }

  // Subscribe user to multiple rooms for real-time updates
  static subscribeUserToRooms(userId: string, rooms: string[]): void {
    const users = SocketRoomManager.getConnectedUsers();
    
    for (const [socketId, user] of users) {
      if (user.id === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          rooms.forEach(room => {
            socket.join(room);
            this.addUserToRoom(userId, room);
          });
        }
        break;
      }
    }
  }

  // Unsubscribe user from room
  static unsubscribeUserFromRoom(userId: string, room: string): void {
    const users = SocketRoomManager.getConnectedUsers();
    
    for (const [socketId, user] of users) {
      if (user.id === userId) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.leave(room);
          this.removeUserFromRoom(userId, room);
        }
        break;
      }
    }
  }

  // Broadcast message to all rooms a user is part of
  static broadcastToUserRooms(userId: string, event: string, data: any, excludeRoom?: string): void {
    const userRooms = this.getUserRooms(userId);
    
    userRooms.forEach(room => {
      if (room !== excludeRoom) {
        this.io.to(room).emit(event, data);
      }
    });
  }

  // Broadcast to all connected users
  static broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Get room statistics
  static getRoomStats(room: string): {
    userCount: number;
    users: Array<{ id: string; username: string }>;
  } {
    const roomUsers = SocketRoomManager.getUsersInRoom(room);
    return {
      userCount: roomUsers.length,
      users: roomUsers.map(user => ({ id: user.id, username: user.username }))
    };
  }

  // Get all rooms from one user (updated to use membership tracking)
  static getAllRoomsFromOneUser(userId: string): string[] {
    return this.getUserRooms(userId);
  }

  // Get users in multiple rooms
  static getUsersInMultipleRooms(rooms: string[]): Map<string, Array<{ id: string; username: string }>> {
    const roomUsersMap = new Map<string, Array<{ id: string; username: string }>>();
    
    rooms.forEach(room => {
      const roomUsers = SocketRoomManager.getUsersInRoom(room);
      roomUsersMap.set(room, roomUsers.map(user => ({ id: user.id, username: user.username })));
    });
    
    return roomUsersMap;
  }

  // Notify all rooms about user status change
  static notifyUserStatusChange(userId: string, status: 'online' | 'offline', excludeUserId?: string): void {
    const userRooms = this.getUserRooms(userId);
    const users = SocketRoomManager.getConnectedUsers();
    
    // Find username
    let username = '';
    for (const [, user] of users) {
      if (user.id === userId) {
        username = user.username;
        break;
      }
    }
    
    userRooms.forEach(room => {
      this.io.to(room).emit('user_status_change', {
        userId,
        username,
        status,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Clean up user memberships when user disconnects
  static cleanupUserMemberships(userId: string): void {
    this.userRoomMemberships.delete(userId);
  }

  // Force disconnect user
  static disconnectUser(userId: string): void {
    const users = SocketRoomManager.getConnectedUsers();
    for (const [socketId, user] of users) {
      if (user.id === userId) {
        this.io.sockets.sockets.get(socketId)?.disconnect();
        this.cleanupUserMemberships(userId);
        break;
      }
    }
  }

  // Get all active rooms with user counts
  static getAllActiveRooms(): Array<{ room: string; userCount: number; users: string[] }> {
    const allUsers = SocketRoomManager.getConnectedUsers();
    const roomStats = new Map<string, Set<string>>();
    
    // Collect room statistics from membership tracking
    this.userRoomMemberships.forEach((rooms, userId) => {
      rooms.forEach(room => {
        if (!roomStats.has(room)) {
          roomStats.set(room, new Set());
        }
        roomStats.get(room)!.add(userId);
      });
    });
    
    // Convert to array format
    return Array.from(roomStats.entries()).map(([room, userIds]) => {
      const usernames = Array.from(userIds).map(userId => {
        for (const [, user] of allUsers) {
          if (user.id === userId) {
            return user.username;
          }
        }
        return 'Unknown';
      });
      
      return {
        room,
        userCount: userIds.size,
        users: usernames
      };
    });
  }

  // Send real-time notification to all user's rooms
  static sendNotificationToUserRooms(
    userId: string, 
    notification: {
      type: 'message' | 'user_action' | 'system';
      content: string;
      timestamp?: string;
      metadata?: any;
    }
  ): void {
    const userRooms = this.getUserRooms(userId);
    
    userRooms.forEach(room => {
      this.io.to(room).emit('notification', {
        ...notification,
        userId,
        room,
        timestamp: notification.timestamp || new Date().toISOString()
      });
    });
  }
}
