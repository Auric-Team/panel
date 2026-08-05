import { Request, Response, NextFunction } from 'express';
import { db } from '../db/sqlite';
import crypto from 'crypto';
import { AppError } from '../utils/errors';
import { LogsService } from '../services/logs.service';
import { AuthRequest } from '../middlewares/auth';

export const getUsers = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, id } = req.user!;

    if (role === 'owner') {
      const users = db.prepare('SELECT id, username, role, createdBy, isBlocked, credits, COALESCE(tokens, credits, 0) AS tokens, createdAt FROM users').all();
      return res.json(users);
    } else if (role === 'manager') {
      const users = db.prepare('SELECT id, username, role, createdBy, isBlocked, credits, COALESCE(tokens, credits, 0) AS tokens, createdAt FROM users WHERE createdBy = ? OR id = ?').all(id, id);
      return res.json(users);
    } else {
      return next(new AppError('Access denied.', 403));
    }
  } catch (err) {
    next(err);
  }
};

export const createUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username, password, role, pin2fa, credits, tokens } = req.body;
    const currentUser = req.user!;

    if (!username || !password || !role) {
      return next(new AppError('Username, password and role are required.', 400));
    }

    if (currentUser.role === 'manager' && role !== 'reseller') {
      return next(new AppError('Managers can only create Resellers.', 403));
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return next(new AppError('Username already exists.', 400));
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const tokenVal = parseInt(tokens ?? credits) || 0;

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(userId, username, password, role, currentUser.id, pin2fa || null, tokenVal, tokenVal, now);

    LogsService.logAction(currentUser.id, currentUser.username, 'USER_CREATED', `Created ${role}: ${username}`);

    return res.json({ success: true, message: `${role} created successfully.` });
  } catch (err) {
    next(err);
  }
};

export const toggleBlockUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, isBlocked } = req.body;
    if (!userId) return next(new AppError('User ID required.', 400));

    db.prepare('UPDATE users SET isBlocked = ? WHERE id = ?').run(isBlocked ? 1 : 0, userId);
    
    LogsService.logAction(req.user!.id, req.user!.username, 'USER_BLOCK_TOGGLED', `Set block status to ${isBlocked} for user ID: ${userId}`);

    return res.json({ success: true, message: 'User status updated.' });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const currentUser = req.user!;
    if (!userId) return next(new AppError('User ID required.', 400));

    if (userId === currentUser.id) {
      return next(new AppError('You cannot delete your own account.', 400));
    }

    const targetUser: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return next(new AppError('User not found.', 404));
    }

    if (targetUser.role === 'owner') {
      return next(new AppError('Owner account cannot be deleted.', 403));
    }

    if (currentUser.role === 'manager' && targetUser.role !== 'reseller') {
      return next(new AppError('Managers can only delete Resellers.', 403));
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    LogsService.logAction(currentUser.id, currentUser.username, 'USER_DELETED', `Deleted user ${targetUser.username} (${targetUser.role})`);

    return res.json({ success: true, message: `User ${targetUser.username} deleted successfully.` });
  } catch (err) {
    next(err);
  }
};

export const updateTokens = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, amount, action } = req.body;
    const currentUser = req.user!;

    if (!userId || amount === undefined || !action) {
      return next(new AppError('userId, amount, and action are required.', 400));
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return next(new AppError('Amount must be a positive number.', 400));
    }

    if (action !== 'add' && action !== 'deduct') {
      return next(new AppError("Action must be 'add' or 'deduct'.", 400));
    }

    const targetUser: any = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) {
      return next(new AppError('User not found.', 404));
    }

    if (currentUser.role === 'owner') {
      // Owner can update anyone
    } else if (currentUser.role === 'manager') {
      if (targetUser.role !== 'reseller' || (targetUser.createdBy !== currentUser.id && targetUser.id !== currentUser.id)) {
        return next(new AppError('Managers can only update resellers created or managed by them.', 403));
      }
    } else {
      return next(new AppError('Access denied.', 403));
    }

    const delta = action === 'add' ? parsedAmount : -parsedAmount;

    db.prepare(`
      UPDATE users 
      SET tokens = MAX(0, COALESCE(tokens, credits, 0) + ?),
          credits = MAX(0, COALESCE(tokens, credits, 0) + ?)
      WHERE id = ?
    `).run(delta, delta, userId);

    const updatedUser: any = db.prepare('SELECT COALESCE(tokens, credits, 0) AS tokens FROM users WHERE id = ?').get(userId);
    const newBalance = updatedUser ? updatedUser.tokens : 0;

    LogsService.logAction(
      currentUser.id,
      currentUser.username,
      'TOKENS_UPDATED',
      `${action === 'add' ? 'Added' : 'Deducted'} ${parsedAmount} tokens for user ${targetUser.username} (${userId}). New balance: ${newBalance}`
    );

    return res.json({
      success: true,
      newBalance,
      message: `Successfully ${action === 'add' ? 'added' : 'deducted'} ${parsedAmount} tokens.`
    });
  } catch (err) {
    next(err);
  }
};
