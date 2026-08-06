import { Request, Response, NextFunction } from 'express';
import { db } from '../db/sqlite';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middlewares/auth';
import { LogsService } from '../services/logs.service';
import { AppError } from '../utils/errors';

export const login = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return next(new AppError('Username and password are required.', 400));
    }

    const envOwnerUser = process.env.OWNER_USERNAME || 'owner';
    const envOwnerPass = process.env.OWNER_PASSWORD || 'owner123';

    let user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    
    // Check owner login dynamically against .env
    if (username === envOwnerUser) {
      if (password !== envOwnerPass) {
        LogsService.logAction('system', username, 'LOGIN_FAILED', 'Invalid owner credentials');
        return next(new AppError('Invalid username or password.', 401));
      }
      if (!user) {
        // Create owner dynamically if missing
        const ownerId = 'owner-root-id';
        const now = new Date().toISOString();
        db.prepare(`
          INSERT OR REPLACE INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, createdAt)
          VALUES (?, ?, ?, 'owner', 'system', ?, 0, 999999, ?)
        `).run(ownerId, envOwnerUser, envOwnerPass, process.env.OWNER_2FA_PIN || '123456', now);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(ownerId);
      }
    } else {
      if (!user || user.password !== password) {
        LogsService.logAction('system', username, 'LOGIN_FAILED', 'Invalid credentials');
        return next(new AppError('Invalid username or password.', 401));
      }
    }

    if (user.isBlocked) {
      LogsService.logAction(user.id, user.username, 'LOGIN_BLOCKED', 'Blocked account tried to login');
      return next(new AppError('Account is blocked by manager or owner.', 403));
    }

    if (user.role === 'owner' || user.role === 'manager') {
      return res.json({
        require2FA: true,
        userId: user.id,
        role: user.role,
        username: user.username,
        message: '2FA PIN required for Owner/Manager authentication.'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', 'User logged in successfully');

    return res.json({
      require2FA: false,
      token,
      user: { id: user.id, username: user.username, role: user.role, credits: user.credits }
    });
  } catch (err) {
    next(err);
  }
};

export const verify2FA = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return next(new AppError('User ID and PIN are required.', 400));
    }

    const user: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return next(new AppError('User not found.', 404));
    }

    // Check 2FA PIN against process.env configuration or database fallback
    const expectedPin = user.role === 'owner'
      ? (user.pin2fa || process.env.OWNER_2FA_PIN || '123456')
      : user.role === 'manager'
      ? (user.pin2fa || process.env.MANAGER_2FA_PIN || '654321')
      : user.pin2fa;

    if (pin !== expectedPin) {
      LogsService.logAction(user.id, user.username, '2FA_FAILED', 'Invalid 2FA PIN entered');
      return next(new AppError('Invalid 2FA PIN entered.', 401));
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', 'User verified 2FA and logged in');

    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, credits: user.credits }
    });
  } catch (err) {
    next(err);
  }
};
