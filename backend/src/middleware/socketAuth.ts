import { Socket } from 'socket.io';
import { AuthService } from '../services/authService';
import { AuthUser } from '../models/user';

// Extend Socket interface to include user
declare module 'socket.io' {
  interface Socket {
    user?: AuthUser;
  }
}

/**
 * Socket.IO middleware for authentication
 */
export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  try {
    const token = socket.handshake.auth.token  || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    const user = AuthService.verifyToken(token);
    socket.user = user;

    // Update user online status
    AuthService.updateUserStatus(user._id, true);

    next();
  } catch (error) {
    next(new Error('Invalid authentication token'));
  }
};

/**
 * Optional socket authentication middleware
 */
export const optionalSocketAuth = (socket: Socket, next: (err?: Error) => void): void => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (token) {
      try {
        const user = AuthService.verifyToken(token);
        socket.user = user;
        AuthService.updateUserStatus(user._id, true);
      } catch (error) {
        // Token is invalid, but we don't reject the connection
        // Just continue without user authentication
      }
    }

    next();
  } catch (error) {
    next();
  }
};
