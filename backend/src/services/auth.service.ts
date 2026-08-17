import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { ENV } from '../config/env';
import { AppError } from '../utils/errors';
import { LogsService } from './logs.service';
import { LoginResponse, UserRecord } from '../types/auth';
import { hashPassword, verifyPassword, safeCompare } from '../utils/crypto';
import { recordFailedAuth, clearFailedAuth } from '../middlewares/rateLimiter';

export class AuthService {
  static login(username?: string, password?: string, ip: string = '127.0.0.1'): LoginResponse {
    const cleanUsername = username?.trim();
    const cleanPassword = password?.trim();

    if (!cleanUsername || !cleanPassword) {
      throw new AppError('Username and password are required.', 400);
    }

    let user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername) as UserRecord | undefined;

    if (cleanUsername === ENV.OWNER_USERNAME) {
      let isOwnerMatch = false;

      if (user) {
        const { isValid, needsRehash } = verifyPassword(cleanPassword, user.password);
        if (isValid) {
          isOwnerMatch = true;
          if (needsRehash) {
            const newHash = hashPassword(cleanPassword);
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
          }
        } else if (cleanPassword === ENV.OWNER_PASSWORD) {
          isOwnerMatch = true;
          const newHash = hashPassword(cleanPassword);
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
        }
      } else {
        if (cleanPassword === ENV.OWNER_PASSWORD) {
          isOwnerMatch = true;
          const ownerId = 'owner-root-id';
          const now = new Date().toISOString();
          const hashedPw = hashPassword(cleanPassword);
          db.prepare(`
            INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
            VALUES (?, ?, ?, 'owner', 'system', ?, 0, 999999, 999999, ?)
          `).run(ownerId, ENV.OWNER_USERNAME, hashedPw, ENV.OWNER_2FA_PIN, now);
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(ownerId) as UserRecord;
        }
      }

      if (!isOwnerMatch) {
        recordFailedAuth(ip, cleanUsername);
        LogsService.logAction('system', cleanUsername, 'LOGIN_FAILED', `Invalid owner credentials attempt from ${ip}`);
        throw new AppError('Invalid username or password.', 401);
      }
    } else {
      if (!user) {
        recordFailedAuth(ip, cleanUsername);
        LogsService.logAction('system', cleanUsername, 'LOGIN_FAILED', `Login attempt for non-existent account: ${cleanUsername} from ${ip}`);
        throw new AppError('Invalid username or password.', 401);
      }

      const { isValid, needsRehash } = verifyPassword(cleanPassword, user.password);
      if (!isValid) {
        recordFailedAuth(ip, cleanUsername);
        LogsService.logAction('system', cleanUsername, 'LOGIN_FAILED', `Failed password attempt for @${user.username} from ${ip}`);
        throw new AppError('Invalid username or password.', 401);
      }

      // Automatically upgrade legacy password hash to Argon2id
      if (needsRehash) {
        const newHash = hashPassword(cleanPassword);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
      }
    }

    if (user!.isBlocked === 1) {
      LogsService.logAction(user!.id, user!.username, 'LOGIN_BLOCKED', `Blocked account login attempted from ${ip}`);
      throw new AppError('Account is suspended by executive management.', 403);
    }

    // Clear failed auth on success
    clearFailedAuth(ip);

    if (user!.role === 'owner' || user!.role === 'manager') {
      return {
        require2FA: true,
        userId: user!.id,
        role: user!.role,
        username: user!.username,
        message: '2FA PIN verification required.',
      };
    }

    const token = jwt.sign(
      { id: user!.id, username: user!.username, role: user!.role },
      ENV.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    LogsService.logAction(user!.id, user!.username, 'LOGIN_SUCCESS', `User authenticated successfully from ${ip}`);

    return {
      require2FA: false,
      token,
      user: {
        id: user!.id,
        username: user!.username,
        role: user!.role,
        tokens: user!.tokens ?? user!.credits ?? 0,
        credits: user!.credits ?? 0,
      },
    };
  }

  static verify2FA(userId?: string, pin?: string, ip: string = '127.0.0.1'): LoginResponse {
    if (!userId || !pin) {
      throw new AppError('User ID and PIN are required.', 400);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
    if (!user) {
      throw new AppError('User session expired or not found.', 404);
    }

    const expectedPin =
      user.role === 'owner'
        ? user.pin2fa || ENV.OWNER_2FA_PIN
        : user.role === 'manager'
        ? user.pin2fa || ENV.MANAGER_2FA_PIN
        : user.pin2fa;

    if (!expectedPin || !safeCompare(String(pin).trim(), String(expectedPin).trim())) {
      recordFailedAuth(ip, user.username);
      LogsService.logAction(user.id, user.username, '2FA_FAILED', `Invalid 2FA PIN entered from ${ip}`);
      throw new AppError('Invalid 2FA Security PIN entered.', 401);
    }

    clearFailedAuth(ip);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', `User verified 2FA successfully from ${ip}`);

    return {
      require2FA: false,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        tokens: user.tokens ?? user.credits ?? 0,
        credits: user.credits ?? 0,
      },
    };
  }

  static register(username?: string, password?: string, deviceFingerprint?: string, ip: string = '127.0.0.1') {
    const cleanUsername = username?.trim();
    const cleanPassword = password?.trim();

    if (!cleanUsername || !cleanPassword) {
      throw new AppError('Username and password are required for registration.', 400);
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 32) {
      throw new AppError('Username must be between 3 and 32 characters.', 400);
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      throw new AppError('Username can only contain alphanumeric characters, hyphens, and underscores.', 400);
    }

    if (cleanPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters long.', 400);
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (existingUser) {
      throw new AppError('Username is already registered. Please choose another username.', 400);
    }

    const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const defaultRole = 'user';
    const hashedPassword = hashPassword(cleanPassword);

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, 'self_registration', null, 0, 0, 0, ?)
    `).run(userId, cleanUsername, hashedPassword, defaultRole, now);

    const token = jwt.sign(
      { id: userId, username: cleanUsername, role: defaultRole },
      ENV.JWT_SECRET,
      { expiresIn: '24h', algorithm: 'HS256' }
    );

    LogsService.logAction(userId, cleanUsername, 'USER_REGISTERED', `New customer account registered (${deviceFingerprint || 'Device'}) from ${ip}`);

    return {
      success: true,
      message: 'Registration complete. Account created successfully.',
      token,
      role: defaultRole,
      user: {
        id: userId,
        username: cleanUsername,
        role: defaultRole,
        tokens: 0,
        credits: 0,
      },
    };
  }
}
