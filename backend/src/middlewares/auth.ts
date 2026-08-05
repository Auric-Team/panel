import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export const JWT_SECRET = process.env.JWT_SECRET || 'AXIOS_ULTRA_SECURE_JWT_SECRET_2026_KEY_PANEL';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

import { db } from '../db/sqlite';

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized. Token required.', 401));
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if account is blocked or deleted in real-time
    const userRecord: any = db.prepare('SELECT isBlocked FROM users WHERE id = ?').get(decoded.id);
    if (!userRecord || userRecord.isBlocked === 1) {
      return next(new AppError('Account is blocked or no longer exists.', 403));
    }

    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token.', 401));
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden. Insufficient permissions.', 403));
    }
    next();
  };
};
