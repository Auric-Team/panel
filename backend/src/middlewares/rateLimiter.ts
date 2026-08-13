import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const createRateLimiter = (maxRequests: number = 30, windowMs: number = 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = rateLimitStore.get(ip);
    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return next(new AppError('Too many requests, please try again later.', 429));
    }

    record.count += 1;
    next();
  };
};

export const authLimiter = createRateLimiter(60, 60 * 1000);
export const apiLimiter = createRateLimiter(120, 60 * 1000);
