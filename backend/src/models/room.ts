import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  _id: string;
  name: string;
  description?: string;
  roomType: 'public' | 'private' | 'direct';
  participants: Array<{
    userId: string;
    username: string;
    email: string;
    joinedAt: Date;
    role: 'admin' | 'moderator' | 'member';
    isActive: boolean;
    lastSeen?: Date;
  }>;
  maxParticipants?: number;
  isActive: boolean;
  settings: {
    allowFileSharing: boolean;
    allowMentions: boolean;
    messageHistory: boolean;
  };
  lastActivity: Date;
  messageCount: number;
  createdBy: {
    userId: string;
    username: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: [50, 'Room name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Room description cannot exceed 200 characters']
  },
  roomType: {
    type: String,
    enum: ['public', 'private', 'direct'],
    default: 'public'
  },
  participants: [{
    userId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastSeen: Date
  }],
  maxParticipants: {
    type: Number,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    allowMentions: {
      type: Boolean,
      default: true
    },
    messageHistory: {
      type: Boolean,
      default: true
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  createdBy: {
    userId: String,
    username: String
  }
}, {
  timestamps: true
});

// Indexes
RoomSchema.index({ name: 1 });
RoomSchema.index({ roomType: 1, isActive: 1 });
RoomSchema.index({ 'participants.userId': 1 });
RoomSchema.index({ lastActivity: -1 });

export const Room = mongoose.model<IRoom>('Room', RoomSchema);