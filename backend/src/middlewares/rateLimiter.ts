import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { LogsService } from '../services/logs.service';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  failedAttempts?: number;
  lockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const failedAuthStore = new Map<string, { attempts: number; lockedUntil: number }>();
const seenNonces = new Set<string>();

// Cleanup stale memory every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime && (!record.lockedUntil || now > record.lockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
  for (const [key, record] of failedAuthStore.entries()) {
    if (now > record.lockedUntil) {
      failedAuthStore.delete(key);
    }
  }
  if (seenNonces.size > 100000) {
    seenNonces.clear();
  }
}, 10 * 60 * 1000);

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ipList = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ipList[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Record a failed authentication attempt to trigger progressive lockout.
 */
export function recordFailedAuth(ip: string, username?: string): { isLocked: boolean; remainingMinutes: number } {
  const now = Date.now();
  const entry = failedAuthStore.get(ip) || { attempts: 0, lockedUntil: 0 };
  entry.attempts += 1;

  if (entry.attempts >= 5) {
    // 15 minutes lockout
    entry.lockedUntil = now + 15 * 60 * 1000;
    failedAuthStore.set(ip, entry);
    LogsService.logAction('system', username || 'SecurityGuard', 'IP_LOCKED_OUT', `IP ${ip} temporarily locked out due to 5+ failed attempts.`);
    return { isLocked: true, remainingMinutes: 15 };
  }

  failedAuthStore.set(ip, entry);
  return { isLocked: false, remainingMinutes: 0 };
}

/**
 * Reset failed attempts upon successful login/verification.
 */
export function clearFailedAuth(ip: string) {
  failedAuthStore.delete(ip);
}

/**
 * Generic Rate Limiter factory with lockout enforcement.
 */
export const createRateLimiter = (maxRequests: number = 30, windowMs: number = 60 * 1000, name: string = 'api') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();

    // Check brute force lockout
    const authStatus = failedAuthStore.get(ip);
    if (authStatus && authStatus.lockedUntil > now) {
      const remainingSecs = Math.ceil((authStatus.lockedUntil - now) / 1000);
      return next(new AppError(`Security lock active. Too many failed attempts from your IP. Retry in ${remainingSecs} seconds.`, 429));
    }

    const key = `${name}:${ip}`;
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return next(new AppError(`Too many requests to ${name}. Rate limit exceeded. Try again in ${retryAfter}s.`, 429));
    }

    record.count += 1;
    next();
  };
};

/**
 * Security Request Sanitizer middleware (Anti-Prototype Pollution, Anti-Injection).
 */
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleaned[key] = sanitize(obj[key]);
    }
    return cleaned;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

export const authLimiter = createRateLimiter(20, 60 * 1000, 'auth');
export const apiLimiter = createRateLimiter(180, 60 * 1000, 'api');
export const verifyLimiter = createRateLimiter(60, 60 * 1000, 'verify');
export const uploadLimiter = createRateLimiter(10, 60 * 1000, 'upload');
