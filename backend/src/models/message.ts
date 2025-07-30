import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    email: string;
  };
  room?: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  reactions?: Array<{
    userId: string;
    username: string;
    emoji: string;
    timestamp: Date;
  }>;
  mentions?: string[]; // Array of user IDs
  replyTo?: string; // Message ID this is replying to
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message content cannot exceed 2000 characters']
  },
  sender: {
    id: {
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
    }
  },
  room: {
    type: String,
    default: null,
    index: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  reactions: [{
    userId: String,
    username: String,
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  mentions: [{
    type: String
  }],
  replyTo: {
    type: String,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Indexes for better performance
MessageSchema.index({ room: 1, timestamp: -1 });
MessageSchema.index({ 'sender.id': 1, timestamp: -1 });
MessageSchema.index({ timestamp: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);