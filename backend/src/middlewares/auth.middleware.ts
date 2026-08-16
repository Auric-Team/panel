import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { db } from '../db/database';
import { AppError } from '../utils/errors';
import { AuthenticatedRequest, AuthUserPayload } from '../types/common';

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized. Token required.', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUserPayload;

    const userRecord = db.prepare('SELECT isBlocked, id, username, role FROM users WHERE id = ? OR username = ?').get(decoded.id || '', decoded.username || '') as any;
    if (!userRecord || userRecord.isBlocked === 1) {
      return next(new AppError('Account is blocked or no longer exists.', 403));
    }

    req.user = {
      id: userRecord.id,
      username: userRecord.username,
      role: userRecord.role,
    };
    next();
  } catch {
    return next(new AppError('Invalid or expired token.', 401));
  }
};

export const authorizeRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden. Insufficient permissions.', 403));
    }
    next();
  };
};
