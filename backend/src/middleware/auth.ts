import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { AuthUser } from '../models/user';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid access token'
    });
    return;
  }

  try {
    const user = AuthService.verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(403).json({ 
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
  }
};

/**
 * Middleware to check if user is authenticated (optional auth)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const user = AuthService.verifyToken(token);
      req.user = user;
    } catch (error) {
      // Token is invalid, but we don't reject the request
      // Just continue without user
    }
  }

  next();
};

/**
 * Middleware to authorize specific roles (for future use)
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be authenticated to access this resource'
      });
      return;
    }

    // For now, all authenticated users have access
    // In the future, you can add role-based authorization here
    next();
  };
};
