"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogsService = void 0;
const sqlite_1 = require("../db/sqlite");
const crypto_1 = __importDefault(require("crypto"));
class LogsService {
    static logAction(userId, username, action, details) {
        try {
            sqlite_1.db.prepare(`
        INSERT INTO logs (id, userId, username, action, details, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto_1.default.randomUUID(), userId, username, action, details, new Date().toISOString());
        }
        catch (error) {
            console.error('Failed to write audit log:', error);
        }
    }
    static getLogs(limit = 100) {
        return sqlite_1.db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?').all(limit);
    }
}
exports.LogsService = LogsService;
