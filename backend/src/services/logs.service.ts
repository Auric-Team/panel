import { db } from '../db/sqlite';
import crypto from 'crypto';

export class LogsService {
  static logAction(userId: string, username: string, action: string, details: string) {
    try {
      db.prepare(`
        INSERT INTO logs (id, userId, username, action, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        userId,
        username,
        action,
        details,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  static getLogs(limit: number = 100) {
    return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  }
}
