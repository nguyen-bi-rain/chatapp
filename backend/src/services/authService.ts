import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, AuthUser, UserWithoutPassword } from '../models/user';

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly SALT_ROUNDS = 12;

  /**
   * Register a new user
   */
  static async register(username: string, email: string, password: string): Promise<{ user: UserWithoutPassword; token: string }> {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      });

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

      // Create new user
      const newUser = new UserModel({
        username: username.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        isOnline: false,
        lastSeen: null,
        room: null
      });

      const savedUser = await newUser.save();

      // Generate JWT token
      const token = this.generateToken({
        _id: savedUser._id.toString(),
        username: savedUser.username,
        email: savedUser.email
      });

      // Return user without password
      const userWithoutPassword: UserWithoutPassword = {
        id: savedUser._id.toString(),
        username: savedUser.username,
        email: savedUser.email,
        room: savedUser.room,
        isOnline: savedUser.isOnline,
        lastSeen: savedUser.lastSeen,
        createdAt: savedUser.createdAt
      };

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed');
    }
  }

  /**
   * Login user
   */
  static async login(email: string, password: string): Promise<{ user: UserWithoutPassword; token: string }> {
    try {
      // Find user by email
      const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update user status
      user.isOnline = true;
      user.lastSeen = new Date();
      await user.save();

      // Generate JWT token
      const token = this.generateToken({
        _id: user._id.toString(),
        username: user.username,
        email: user.email
      });

      // Return user without password
      const userWithoutPassword: UserWithoutPassword = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };

      return {
        user: userWithoutPassword,
        token
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as AuthUser;
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate JWT token
   */
  private static generateToken(user: AuthUser): string {
    return jwt.sign(user, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN
    });
  }

  /**
   * Get user by ID (without password)
   */
  static async getUserById(userId: string): Promise<UserWithoutPassword | null> {
    try {
      const user = await UserModel.findById(userId).select('-password');
      if (!user) return null;
      
      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by email (without password)
   */
  static async getUserByEmail(email: string): Promise<UserWithoutPassword | null> {
    try {
      const user = await UserModel.findOne({ email: email.toLowerCase() }).select('-password');
      if (!user) return null;

      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user by username (without password)
   */
  static async getUserByUsername(username: string): Promise<UserWithoutPassword | null> {
    try {
      const user = await UserModel.findOne({ username: username }).select('-password');
      if (!user) return null;

      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user online status
   */
  static async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await UserModel.findByIdAndUpdate(
        userId,
        {
          isOnline,
          lastSeen: new Date()
        },
        { new: true }
      );
    } catch (error) {
      // Silent fail for status updates to avoid disrupting chat flow
      console.error('Failed to update user status:', error);
    }
  }

  /**
   * Update user room
   */
  static async updateUserRoom(userId: string, room?: string): Promise<void> {
    try {
      await UserModel.findByIdAndUpdate(
        userId,
        {
          room: room || null,
          lastSeen: new Date()
        },
        { new: true }
      );
    } catch (error) {
      // Silent fail for room updates to avoid disrupting chat flow
      console.error('Failed to update user room:', error);
    }
  }

  /**
   * Get all users (without passwords) with pagination
   */
  static async getAllUsers(limit: number = 50, skip: number = 0): Promise<{
    users: UserWithoutPassword[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const [users, total] = await Promise.all([
        UserModel.find({})
          .select('-password')
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        UserModel.countDocuments({})
      ]);

      const formattedUsers: UserWithoutPassword[] = users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }));

      return {
        users: formattedUsers,
        total,
        hasMore: total > skip + limit
      };
    } catch (error) {
      throw new Error('Failed to get users');
    }
  }

  /**
   * Get online users
   */
  static async getOnlineUsers(): Promise<UserWithoutPassword[]> {
    try {
      const users = await UserModel.find({ isOnline: true })
        .select('-password')
        .sort({ lastSeen: -1 })
        .lean();

      return users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }));
    } catch (error) {
      throw new Error('Failed to get online users');
    }
  }

  /**
   * Get users in a specific room
   */
  static async getUsersInRoom(room: string): Promise<UserWithoutPassword[]> {
    try {
      const users = await UserModel.find({ room, isOnline: true })
        .select('-password')
        .sort({ lastSeen: -1 })
        .lean();

      return users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }));
    } catch (error) {
      throw new Error('Failed to get users in room');
    }
  }

  /**
   * Search users by username or email
   */
  static async searchUsers(query: string, limit: number = 20): Promise<UserWithoutPassword[]> {
    try {
      const users = await UserModel.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      })
        .select('-password')
        .limit(limit)
        .sort({ username: 1 })
        .lean();

      return users.map(user => ({
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }));
    } catch (error) {
      throw new Error('Failed to search users');
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string, 
    updates: { username?: string; email?: string }
  ): Promise<UserWithoutPassword | null> {
    try {
      // Check for existing username/email if being updated
      if (updates.username || updates.email) {
        const existingUser = await UserModel.findOne({
          _id: { $ne: userId },
          $or: [
            ...(updates.username ? [{ username: updates.username }] : []),
            ...(updates.email ? [{ email: updates.email.toLowerCase() }] : [])
          ]
        });

        if (existingUser) {
          throw new Error('Username or email already exists');
        }
      }

      const user = await UserModel.findByIdAndUpdate(
        userId,
        {
          ...(updates.username && { username: updates.username.trim() }),
          ...(updates.email && { email: updates.email.toLowerCase().trim() })
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) return null;

      return {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        room: user.room,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

      // Update password
      user.password = hashedNewPassword;
      await user.save();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to change password');
    }
  }

  /**
   * Delete user account
   */
  static async deleteUser(userId: string, password: string): Promise<void> {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify password before deletion
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Password is incorrect');
      }

      await UserModel.findByIdAndDelete(userId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    totalUsers: number;
    onlineUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [totalUsers, onlineUsers, newUsersToday, newUsersThisWeek] = await Promise.all([
        UserModel.countDocuments({}),
        UserModel.countDocuments({ isOnline: true }),
        UserModel.countDocuments({ createdAt: { $gte: today } }),
        UserModel.countDocuments({ createdAt: { $gte: weekAgo } })
      ]);

      return {
        totalUsers,
        onlineUsers,
        newUsersToday,
        newUsersThisWeek
      };
    } catch (error) {
      throw new Error('Failed to get user statistics');
    }
  }

  /**
   * Logout user (set offline)
   */
  static async logout(userId: string): Promise<void> {
    try {
      await UserModel.findByIdAndUpdate(
        userId,
        {
          isOnline: false,
          lastSeen: new Date(),
          room: null
        }
      );
    } catch (error) {
      console.error('Failed to logout user:', error);
    }
  }

  /**
   * Refresh token
   */
  static async refreshToken(userId: string): Promise<string> {
    try {
      const user = await UserModel.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }

      return this.generateToken({
        _id: user._id.toString(),
        username: user.username,
        email: user.email
      });
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  }
}
