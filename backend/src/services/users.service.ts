import { db } from '../db/database';
import { AppError } from '../utils/errors';
import { generateUUID } from '../utils/crypto';
import { LogsService } from './logs.service';
import { AuthUserPayload } from '../types/common';
import { UserRecord } from '../types/auth';

export class UsersService {
  static getUsers(user: AuthUserPayload): UserRecord[] {
    const { role, id } = user;

    const baseSql = `
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        COALESCE(c.username, u.createdBy, 'System') AS createdBy,
        COALESCE(c.username, u.createdBy, 'System') AS createdByUsername,
        u.isBlocked, 
        u.credits, 
        COALESCE(u.tokens, u.credits, 0) AS tokens, 
        u.createdAt 
      FROM users u
      LEFT JOIN users c ON u.createdBy = c.id
    `;

    if (role === 'owner') {
      return db.prepare(`${baseSql} ORDER BY u.createdAt DESC`).all() as UserRecord[];
    } else if (role === 'manager') {
      return db.prepare(`${baseSql} WHERE u.createdBy = ? OR u.id = ? ORDER BY u.createdAt DESC`).all(id, id) as UserRecord[];
    } else {
      throw new AppError('Access denied.', 403);
    }
  }

  static createUser(currentUser: AuthUserPayload, payload: any) {
    const { username, password, role, pin2fa, credits, tokens } = payload;

    if (!username || !password || !role) {
      throw new AppError('Username, password and role are required.', 400);
    }

    if (currentUser.role === 'manager' && role !== 'reseller') {
      throw new AppError('Managers can only create Resellers.', 403);
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      throw new AppError('Username already exists.', 400);
    }

    const userId = generateUUID();
    const now = new Date().toISOString();
    const tokenVal = parseInt(String(tokens ?? credits), 10) || 0;

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(userId, username, password, role, currentUser.id, pin2fa || null, tokenVal, tokenVal, now);

    LogsService.logAction(
      currentUser.id,
      currentUser.username,
      'USER_CREATED',
      `Provisioned new ${role.toUpperCase()} account: @${username} (Initial Tokens: ${tokenVal})`,
      { targetUser: username, role, initialTokens: tokenVal }
    );

    return { success: true, message: `${role} created successfully.` };
  }

  static toggleBlockUser(currentUser: AuthUserPayload, userId: string, isBlocked: boolean) {
    if (!userId) throw new AppError('User ID required.', 400);

    const targetUser = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as { username: string } | undefined;
    const targetName = targetUser ? targetUser.username : userId;

    db.prepare('UPDATE users SET isBlocked = ? WHERE id = ?').run(isBlocked ? 1 : 0, userId);
    
    LogsService.logAction(
      currentUser.id,
      currentUser.username,
      'USER_BLOCK_TOGGLED',
      `Updated status for @${targetName}: ${isBlocked ? 'SUSPENDED (Blocked)' : 'ACTIVE (Unblocked)'}`,
      { targetUser: targetName, isBlocked }
    );

    return { success: true, message: 'User status updated.' };
  }

  static deleteUser(currentUser: AuthUserPayload, userId: string) {
    if (!userId) throw new AppError('User ID required.', 400);

    if (userId === currentUser.id) {
      throw new AppError('You cannot delete your own account.', 400);
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
    if (!targetUser) {
      throw new AppError('User not found.', 404);
    }

    if (targetUser.role === 'owner') {
      throw new AppError('Owner account cannot be deleted.', 403);
    }

    if (currentUser.role === 'manager' && targetUser.role !== 'reseller') {
      throw new AppError('Managers can only delete Resellers.', 403);
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    LogsService.logAction(
      currentUser.id,
      currentUser.username,
      'USER_DELETED',
      `Deleted ${targetUser.role.toUpperCase()} partner account: @${targetUser.username} (ID: ${userId})`,
      { targetUser: targetUser.username, role: targetUser.role }
    );

    return { success: true, message: `User ${targetUser.username} deleted successfully.` };
  }

  static updateTokens(currentUser: AuthUserPayload, userId: string, amount: number | string, action: 'add' | 'deduct' | string) {
    if (!userId || amount === undefined || !action) {
      throw new AppError('userId, amount, and action are required.', 400);
    }

    const parsedAmount = parseInt(String(amount), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new AppError('Amount must be a positive number.', 400);
    }

    if (action !== 'add' && action !== 'deduct') {
      throw new AppError("Action must be 'add' or 'deduct'.", 400);
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
    if (!targetUser) {
      throw new AppError('User not found.', 404);
    }

    if (currentUser.role === 'owner') {
      // Owner has full access
    } else if (currentUser.role === 'manager') {
      if (targetUser.role !== 'reseller' || (targetUser.createdBy !== currentUser.id && targetUser.id !== currentUser.id)) {
        throw new AppError('Managers can only update resellers created by them.', 403);
      }
    } else {
      throw new AppError('Access denied.', 403);
    }

    const delta = action === 'add' ? parsedAmount : -parsedAmount;

    db.prepare(`
      UPDATE users 
      SET tokens = MAX(0, COALESCE(tokens, credits, 0) + ?),
          credits = MAX(0, COALESCE(tokens, credits, 0) + ?)
      WHERE id = ?
    `).run(delta, delta, userId);

    const updatedUser = db.prepare('SELECT COALESCE(tokens, credits, 0) AS tokens FROM users WHERE id = ?').get(userId) as { tokens: number };
    const newBalance = updatedUser ? updatedUser.tokens : 0;

    LogsService.logAction(
      currentUser.id,
      currentUser.username,
      'TOKENS_UPDATED',
      `${action === 'add' ? 'Added' : 'Deducted'} ${parsedAmount} tokens for reseller @${targetUser.username}. New Token Balance: ${newBalance.toLocaleString()}`,
      { targetUser: targetUser.username, amount: parsedAmount, action, newBalance }
    );

    return {
      success: true,
      newBalance,
      message: `Successfully ${action === 'add' ? 'added' : 'deducted'} ${parsedAmount} tokens.`,
    };
  }
}
