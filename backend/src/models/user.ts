import mongoose ,{ Schema,Document } from "mongoose";
export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  password: string;
  room?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt?: Date;
}

export interface UserWithoutPassword {
  id: string;
  username: string;
  email: string;
  room?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt?: Date;
}

export interface AuthUser {
  _id: string;  
  username: string;
  email: string;
  room?: string;
}


const UserSchema = new Schema<IUser>( {
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long']
  },
  room: {
    type: String,
    default: null
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

UserSchema.index({ username: 1, email: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ room: 1 });

export const UserModel = mongoose.model<IUser>('User', UserSchema);