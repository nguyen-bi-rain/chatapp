import { Room, IRoom } from '../models/room';
import { AuthUser } from '../models/user';

export interface CreateRoomData {
  name: string;
  description?: string;
  roomType?: 'public' | 'private' | 'direct';
  maxParticipants?: number;
  creator: AuthUser;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  email: string;
  joinedAt: Date;
  role: 'admin' | 'moderator' | 'member';
  isActive: boolean;
  lastSeen?: Date;
}

export class RoomService {
  // Create a new room
  static async createRoom(data: CreateRoomData): Promise<IRoom> {
    try {
      const existingRoom = await Room.findOne({ name: data.name });
      if (existingRoom) {
        throw new Error('Room with this name already exists');
      }

      const room = new Room({
        name: data.name,
        description: data.description,
        roomType: data.roomType || 'public',
        maxParticipants: data.maxParticipants || 100,
        participants: [{
          userId: data.creator._id,
          username: data.creator.username,
          email: data.creator.email,
          joinedAt: new Date(),
          role: 'admin',
          isActive: true
        }],
        createdBy: {
          userId: data.creator._id,
          username: data.creator.username
        },
        lastActivity: new Date()
      });

      return await room.save();
    } catch (error) {
      throw new Error(`Failed to create room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Join a room (creates room if it doesn't exist for socket connections)
  static async joinRoom(roomName: string, user: AuthUser): Promise<IRoom> {
    try {
      let room = await Room.findOne({ name: roomName });
      
      // Create room if it doesn't exist (for dynamic room creation)
      if (!room) {
        room = await this.createRoom({
          name: roomName,
          roomType: 'public',
          creator: user
        }) as any;
        if (!room) {
          throw new Error('Failed to create room');
        }
        return room;
      }

      // Check if room is active
      if (!room.isActive) {
        throw new Error('Room is not active');
      }

      // Check if user is already in the room
      const existingParticipantIndex = room.participants.findIndex(p => p.userId === user._id);
      
      if (existingParticipantIndex !== -1) {
        // Update existing participant as active
        const participant = room.participants[existingParticipantIndex];
        if (participant) {
          participant.isActive = true;
          participant.lastSeen = new Date();
        }
      } else {
        // Check room capacity
        const activeParticipants = room.participants.filter(p => p.isActive).length;
        if (activeParticipants >= (room.maxParticipants || 100)) {
          throw new Error('Room is full');
        }

        // Add new participant
        room.participants.push({
          userId: user._id,
          username: user.username,
          email: user.email,
          joinedAt: new Date(),
          role: 'member',
          isActive: true,
          lastSeen: new Date()
        });
      }

      room.lastActivity = new Date();
      return await room.save();
    } catch (error) {
      throw new Error(`Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Leave a room
  static async leaveRoom(roomName: string, userId: string): Promise<IRoom | null> {
    try {
      const room = await Room.findOne({ name: roomName });
      if (!room) return null;

      const participantIndex = room.participants.findIndex(p => p.userId === userId);
      if (participantIndex !== -1) {
        const participant = room.participants[participantIndex];
        if (participant) {
          participant.isActive = false;
          participant.lastSeen = new Date();
        }
      }

      room.lastActivity = new Date();
      return await room.save();
    } catch (error) {
      throw new Error(`Failed to leave room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get room by name
  static async getRoomByName(roomName: string): Promise<IRoom | null> {
    try {
      return await Room.findOne({ name: roomName, isActive: true });
    } catch (error) {
      throw new Error(`Failed to get room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get all public rooms
  static async getPublicRooms(limit: number = 50, skip: number = 0): Promise<{
    rooms: IRoom[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const [rooms, total] = await Promise.all([
        Room.find({ 
          roomType: 'public', 
          isActive: true 
        })
        .sort({ lastActivity: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
        Room.countDocuments({ roomType: 'public', isActive: true })
      ]);

      return {
        rooms,
        total,
        hasMore: total > skip + limit
      };
    } catch (error) {
      throw new Error(`Failed to get public rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get user's rooms
  static async getUserRooms(userId: string): Promise<IRoom[]> {
    try {
      return await Room.find({
        'participants.userId': userId,
        'participants.isActive': true,
        isActive: true
      }).sort({ lastActivity: -1 });
    } catch (error) {
      throw new Error(`Failed to get user rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update user's last seen in room
  static async updateUserLastSeen(roomName: string, userId: string): Promise<void> {
    try {
      await Room.findOneAndUpdate(
        { 
          name: roomName,
          'participants.userId': userId,
          isActive: true
        },
        { 
          $set: { 
            'participants.$.lastSeen': new Date(),
            lastActivity: new Date()
          }
        }
      );
    } catch (error) {
      // Silent fail for last seen updates to avoid disrupting chat flow
      console.error('Failed to update last seen:', error);
    }
  }

  // Get room participants
  static async getRoomParticipants(roomName: string): Promise<RoomParticipant[] | null> {
    try {
      const room = await Room.findOne({ name: roomName, isActive: true });
      return room ? room.participants : null;
    } catch (error) {
      throw new Error(`Failed to get room participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get active participants in room
  static async getActiveParticipants(roomName: string): Promise<RoomParticipant[]> {
    try {
      const room = await Room.findOne({ name: roomName, isActive: true });
      if (!room) return [];
      
      return room.participants.filter(p => p.isActive);
    } catch (error) {
      throw new Error(`Failed to get active participants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update room settings
  static async updateRoomSettings(
    roomName: string, 
    userId: string, 
    settings: Partial<{
      allowFileSharing: boolean;
      allowMentions: boolean;
      messageHistory: boolean;
    }>
  ): Promise<IRoom | null> {
    try {
      // Check if user is admin or moderator
      const room = await Room.findOne({ name: roomName, isActive: true });
      if (!room) return null;

      const participant = room.participants.find(p => p.userId === userId);
      if (!participant || !['admin', 'moderator'].includes(participant.role)) {
        throw new Error('Insufficient permissions to update room settings');
      }

      return await Room.findOneAndUpdate(
        { name: roomName, isActive: true },
        { 
          $set: { 
            settings: { ...room.settings, ...settings },
            lastActivity: new Date()
          }
        },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to update room settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Change user role in room
  static async changeUserRole(
    roomName: string, 
    adminUserId: string, 
    targetUserId: string, 
    newRole: 'admin' | 'moderator' | 'member'
  ): Promise<IRoom | null> {
    try {
      const room = await Room.findOne({ name: roomName, isActive: true });
      if (!room) return null;

      // Check if requesting user is admin
      const adminParticipant = room.participants.find(p => p.userId === adminUserId);
      if (!adminParticipant || adminParticipant.role !== 'admin') {
        throw new Error('Only admins can change user roles');
      }

      // Find target user
      const targetParticipantIndex = room.participants.findIndex(p => p.userId === targetUserId);
      if (targetParticipantIndex === -1) {
        throw new Error('User not found in room');
      }

      // Update role
      const targetParticipant = room.participants[targetParticipantIndex];
      if (!targetParticipant) {
        throw new Error('User not found in room');
      }
      targetParticipant.role = newRole;
      room.lastActivity = new Date();

      return await room.save();
    } catch (error) {
      throw new Error(`Failed to change user role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Remove user from room (kick)
  static async removeUserFromRoom(
    roomName: string, 
    adminUserId: string, 
    targetUserId: string
  ): Promise<IRoom | null> {
    try {
      const room = await Room.findOne({ name: roomName, isActive: true });
      if (!room) return null;

      // Check if requesting user is admin or moderator
      const adminParticipant = room.participants.find(p => p.userId === adminUserId);
      if (!adminParticipant || !['admin', 'moderator'].includes(adminParticipant.role)) {
        throw new Error('Insufficient permissions to remove users');
      }

      // Find and remove target user
      const targetParticipantIndex = room.participants.findIndex(p => p.userId === targetUserId);
      if (targetParticipantIndex === -1) {
        throw new Error('User not found in room');
      }

      // Don't allow removing other admins unless you're the creator
      const targetParticipant = room.participants[targetParticipantIndex];
      if (!targetParticipant) {
        throw new Error('User not found in room');
      }
      if (targetParticipant.role === 'admin' && room.createdBy.userId !== adminUserId) {
        throw new Error('Cannot remove other admins');
      }

      // Remove user
      room.participants.splice(targetParticipantIndex, 1);
      room.lastActivity = new Date();

      return await room.save();
    } catch (error) {
      throw new Error(`Failed to remove user from room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete room (admin only)
  static async deleteRoom(roomName: string, userId: string): Promise<boolean> {
    try {
      const room = await Room.findOne({ name: roomName });
      if (!room) return false;

      // Check if user is the creator or admin
      if (room.createdBy.userId !== userId) {
        const participant = room.participants.find(p => p.userId === userId);
        if (!participant || participant.role !== 'admin') {
          throw new Error('Only room creator or admins can delete the room');
        }
      }

      // Soft delete - mark as inactive
      room.isActive = false;
      room.lastActivity = new Date();
      await room.save();

      return true;
    } catch (error) {
      throw new Error(`Failed to delete room: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get room statistics
  static async getRoomStats(roomName: string): Promise<{
    totalParticipants: number;
    activeParticipants: number;
    messageCount: number;
    createdAt: Date;
    lastActivity: Date;
    topActiveUsers: Array<{ username: string; lastSeen: Date }>;
  } | null> {
    try {
      const room = await Room.findOne({ name: roomName, isActive: true });
      if (!room) return null;

      const activeParticipants = room.participants.filter(p => p.isActive);
      const topActiveUsers = room.participants
        .filter(p => p.lastSeen)
        .sort((a, b) => (b.lastSeen?.getTime() || 0) - (a.lastSeen?.getTime() || 0))
        .slice(0, 10)
        .map(p => ({ username: p.username, lastSeen: p.lastSeen! }));

      return {
        totalParticipants: room.participants.length,
        activeParticipants: activeParticipants.length,
        messageCount: room.messageCount,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        topActiveUsers
      };
    } catch (error) {
      throw new Error(`Failed to get room stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Search rooms
  static async searchRooms(query: string, limit: number = 20): Promise<IRoom[]> {
    try {
      return await Room.find({
        $and: [
          { isActive: true },
          { roomType: 'public' },
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } }
            ]
          }
        ]
      })
      .limit(limit)
      .sort({ lastActivity: -1 });
    } catch (error) {
      throw new Error(`Failed to search rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Check if user is in room
  static async isUserInRoom(roomName: string, userId: string): Promise<boolean> {
    try {
      const room = await Room.findOne({ 
        name: roomName, 
        isActive: true,
        'participants.userId': userId,
        'participants.isActive': true
      });
      return !!room;
    } catch (error) {
      return false;
    }
  }

  // Get user's role in room
  static async getUserRoleInRoom(roomName: string, userId: string): Promise<string | null> {
    try {
      const room = await Room.findOne({ 
        name: roomName, 
        isActive: true 
      });
      
      if (!room) return null;
      
      const participant = room.participants.find(p => p.userId === userId && p.isActive);
      return participant ? participant.role : null;
    } catch (error) {
      return null;
    }
  }

  // Clean up inactive rooms (utility function)
  static async cleanupInactiveRooms(daysInactive: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000);
      
      const result = await Room.updateMany(
        {
          lastActivity: { $lt: cutoffDate },
          isActive: true,
          roomType: { $ne: 'direct' } // Don't cleanup direct messages
        },
        {
          $set: { isActive: false }
        }
      );

      return result.modifiedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup inactive rooms: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}