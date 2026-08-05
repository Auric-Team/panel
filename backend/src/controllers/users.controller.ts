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
      const users = db.prepare('SELECT id, username, role, createdBy, isBlocked, credits, createdAt FROM users').all();
      return res.json(users);
    } else if (role === 'manager') {
      const users = db.prepare('SELECT id, username, role, createdBy, isBlocked, credits, createdAt FROM users WHERE createdBy = ? OR id = ?').all(id, id);
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
    const { username, password, role, pin2fa, credits } = req.body;
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

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(userId, username, password, role, currentUser.id, pin2fa || null, parseInt(credits) || 0, now);

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
