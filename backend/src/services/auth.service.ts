import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { ENV } from '../config/env';
import { AppError } from '../utils/errors';
import { LogsService } from './logs.service';
import { LoginResponse, UserRecord } from '../types/auth';

export class AuthService {
  static login(username?: string, password?: string): LoginResponse {
    if (!username || !password) {
      throw new AppError('Username and password are required.', 400);
    }

    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRecord | undefined;

    if (username === ENV.OWNER_USERNAME) {
      if (password !== ENV.OWNER_PASSWORD) {
        LogsService.logAction('system', username, 'LOGIN_FAILED', 'Invalid owner credentials');
        throw new AppError('Invalid username or password.', 401);
      }
      if (!user) {
        const ownerId = 'owner-root-id';
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
          VALUES (?, ?, ?, 'owner', 'system', ?, 0, 999999, 999999, ?)
        `).run(ownerId, ENV.OWNER_USERNAME, ENV.OWNER_PASSWORD, ENV.OWNER_2FA_PIN, now);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(ownerId) as UserRecord;
      }
    } else {
      if (!user || user.password !== password) {
        LogsService.logAction('system', username, 'LOGIN_FAILED', 'Invalid credentials');
        throw new AppError('Invalid username or password.', 401);
      }
    }

    if (user.isBlocked === 1) {
      LogsService.logAction(user.id, user.username, 'LOGIN_BLOCKED', 'Blocked account attempt');
      throw new AppError('Account is blocked by management.', 403);
    }

    if (user.role === 'owner' || user.role === 'manager') {
      return {
        require2FA: true,
        userId: user.id,
        role: user.role,
        username: user.username,
        message: '2FA PIN required for authentication.',
      };
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', 'User logged in successfully');

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

  static verify2FA(userId?: string, pin?: string): LoginResponse {
    if (!userId || !pin) {
      throw new AppError('User ID and PIN are required.', 400);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const expectedPin =
      user.role === 'owner'
        ? user.pin2fa || ENV.OWNER_2FA_PIN
        : user.role === 'manager'
        ? user.pin2fa || ENV.MANAGER_2FA_PIN
        : user.pin2fa;

    if (pin !== expectedPin) {
      LogsService.logAction(user.id, user.username, '2FA_FAILED', 'Invalid 2FA PIN entered');
      throw new AppError('Invalid 2FA PIN entered.', 401);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', 'User verified 2FA successfully');

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

  static register(username?: string, password?: string, deviceFingerprint?: string) {
    const cleanUsername = username?.trim();
    const cleanPassword = password?.trim();

    if (!cleanUsername || !cleanPassword) {
      throw new AppError('Username and password are required for registration.', 400);
    }

    if (cleanUsername.length < 3) {
      throw new AppError('Username must be at least 3 characters.', 400);
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(cleanUsername);
    if (existingUser) {
      throw new AppError('Username is already registered. Please choose another username or log in.', 400);
    }

    const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();
    const defaultRole = 'user';

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, 'self_registration', null, 0, 0, 0, ?)
    `).run(userId, cleanUsername, cleanPassword, defaultRole, now);

    const token = jwt.sign(
      { id: userId, username: cleanUsername, role: defaultRole },
      ENV.JWT_SECRET,
      { expiresIn: '24h' }
    );

    LogsService.logAction(userId, cleanUsername, 'USER_REGISTERED', `New user registered successfully (${deviceFingerprint || 'Client device'})`);

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
