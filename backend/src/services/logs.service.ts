import fs from 'fs';
import path from 'path';
import { generateUUID } from '../utils/crypto';

export interface AuditLogRecord {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

const LOGS_FILE_PATH = path.join(process.cwd(), 'data', 'logs.json');

function ensureLogsFileExists(): void {
  const dir = path.dirname(LOGS_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(LOGS_FILE_PATH)) {
    fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
}

export class LogsService {
  static logAction(
    userId: string,
    username: string,
    action: string,
    details: string,
    metadata?: Record<string, any>
  ): AuditLogRecord {
    ensureLogsFileExists();
    const newLog: AuditLogRecord = {
      id: generateUUID(),
      userId: userId || 'system',
      username: username || 'System',
      action,
      details,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    try {
      const raw = fs.readFileSync(LOGS_FILE_PATH, 'utf-8');
      let logs: AuditLogRecord[] = [];
      try {
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];
      } catch {
        logs = [];
      }

      // Add to front (newest first)
      logs.unshift(newLog);

      // Keep last 2000 log records to prevent unlimited file growth while maintaining rich history
      if (logs.length > 2000) {
        logs = logs.slice(0, 2000);
      }

      fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    } catch (error) {
      console.error('[LogsService] Failed to write JSON audit log:', error);
    }

    return newLog;
  }

  static getLogs(limit: number = 500, action?: string, username?: string): AuditLogRecord[] {
    ensureLogsFileExists();
    try {
      const raw = fs.readFileSync(LOGS_FILE_PATH, 'utf-8');
      let logs: AuditLogRecord[] = JSON.parse(raw);
      if (!Array.isArray(logs)) return [];

      if (action && action !== 'all') {
        logs = logs.filter((l) => l.action.toLowerCase() === action.toLowerCase());
      }
      if (username) {
        const q = username.toLowerCase();
        logs = logs.filter(
          (l) => l.username.toLowerCase().includes(q) || l.details.toLowerCase().includes(q)
        );
      }

      return logs.slice(0, limit);
    } catch (error) {
      console.error('[LogsService] Failed to read JSON audit logs:', error);
      return [];
    }
  }

  static clearLogs(): { success: boolean; message: string } {
    ensureLogsFileExists();
    try {
      fs.writeFileSync(LOGS_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
      return { success: true, message: 'Audit logs file cleared successfully.' };
    } catch (error: any) {
      console.error('[LogsService] Failed to clear audit logs:', error);
      return { success: false, message: error?.message || 'Failed to clear audit logs.' };
    }
  }
}
