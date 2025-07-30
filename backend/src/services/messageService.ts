import { Message, IMessage } from '../models/message';
import { Room, IRoom } from '../models/room';
import { AuthUser } from '../models/user';
import { SocketService } from './socketService';

export interface CreateMessageData {
  content: string;
  sender: AuthUser;
  room?: string;
  messageType?: 'text' | 'image' | 'file' | 'system';
  replyTo?: string;
  mentions?: string[];
}

export interface MessageFilter {
  room?: string;
  senderId?: string;
  messageType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  skip?: number;
}

export class MessageService {
  // Create a new message
  static async createMessage(data: CreateMessageData): Promise<IMessage> {
    try {
      const message = new Message({
        content: data.content,
        sender: {
          id: data.sender._id,
          username: data.sender.username,
          email: data.sender.email
        },
        room: data.room,
        messageType: data.messageType || 'text',
        replyTo: data.replyTo,
        mentions: data.mentions || [],
        timestamp: new Date()
      });

      const savedMessage = await message.save();

      // Update room's last activity and message count if it's a room message
      if (data.room) {
        await Room.findOneAndUpdate(
          { name: data.room },
          { 
            $inc: { messageCount: 1 },
            $set: { lastActivity: new Date() }
          }
        );

        // Notify all users in the room about the new message
        SocketService.sendToRoom(data.room, 'newMessage', {
          messageId: savedMessage._id,
          content: savedMessage.content,
          sender: savedMessage.sender,
          room: savedMessage.room,
          messageType: savedMessage.messageType,
          timestamp: savedMessage.timestamp,
          replyTo: savedMessage.replyTo,
          mentions: savedMessage.mentions
        });
      }

      return savedMessage;
    } catch (error) {
      throw new Error(`Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get messages with filtering and pagination
  static async getMessages(filter: MessageFilter = {}): Promise<{
    messages: IMessage[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const query: any = { isDeleted: false };

      if (filter.room) query.room = filter.room;
      if (filter.senderId) query['sender.id'] = filter.senderId;
      if (filter.messageType) query.messageType = filter.messageType;
      if (filter.startDate || filter.endDate) {
        query.timestamp = {};
        if (filter.startDate) query.timestamp.$gte = filter.startDate;
        if (filter.endDate) query.timestamp.$lte = filter.endDate;
      }

      const limit = filter.limit || 50;
      const skip = filter.skip || 0;

      const [messages, total] = await Promise.all([
        Message.find(query)
          .sort({ timestamp: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        Message.countDocuments(query)
      ]);

      return {
        messages: messages.reverse(), // Return in chronological order
        total,
        hasMore: total > skip + limit
      };
    } catch (error) {
      throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get room messages with participants info
  static async getRoomMessages(roomName: string, limit: number = 50, skip: number = 0): Promise<{
    messages: IMessage[];
    room: IRoom | null;
    total: number;
    hasMore: boolean;
  }> {
    try {
      const [room, messageResult] = await Promise.all([
        Room.findOne({ name: roomName, isActive: true }),
        this.getMessages({ room: roomName, limit, skip })
      ]);

      return {
        room,
        ...messageResult
      };
    } catch (error) {
      throw new Error(`Failed to get room messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Edit a message
  static async editMessage(messageId: string, newContent: string, userId: string): Promise<IMessage | null> {
    try {
      const message = await Message.findOneAndUpdate(
        { 
          _id: messageId, 
          'sender.id': userId,
          isDeleted: false 
        },
        { 
          content: newContent,
          isEdited: true,
          editedAt: new Date()
        },
        { new: true }
      );

      return message;
    } catch (error) {
      throw new Error(`Failed to edit message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete a message (soft delete)
  static async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const result = await Message.findOneAndUpdate(
        { 
          _id: messageId, 
          'sender.id': userId,
          isDeleted: false 
        },
        { 
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]'
        }
      );

      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Add reaction to message
  static async addReaction(messageId: string, userId: string, username: string, emoji: string): Promise<IMessage | null> {
    try {
      // Remove existing reaction from this user first
      await Message.findByIdAndUpdate(messageId, {
        $pull: { reactions: { userId } }
      });

      // Add new reaction
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $push: {
            reactions: {
              userId,
              username,
              emoji,
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );

      return message;
    } catch (error) {
      throw new Error(`Failed to add reaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get message statistics
  static async getMessageStats(roomName?: string): Promise<{
    totalMessages: number;
    messagesLast24h: number;
    activeUsers: number;
    topSenders: Array<{ username: string; count: number }>;
  }> {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const query = roomName ? { room: roomName, isDeleted: false } : { isDeleted: false };

      const [totalMessages, messagesLast24h, topSenders] = await Promise.all([
        Message.countDocuments(query),
        Message.countDocuments({ ...query, timestamp: { $gte: last24h } }),
        Message.aggregate([
          { $match: query },
          { $group: { _id: '$sender.username', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
          { $project: { username: '$_id', count: 1, _id: 0 } }
        ])
      ]);

      const activeUsers = await Message.distinct('sender.id', {
        ...query,
        timestamp: { $gte: last24h }
      });

      return {
        totalMessages,
        messagesLast24h,
        activeUsers: activeUsers.length,
        topSenders
      };
    } catch (error) {
      throw new Error(`Failed to get message stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}