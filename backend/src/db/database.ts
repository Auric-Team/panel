import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env';

const dataDir = path.dirname(ENV.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const sqliteDb = new Database(ENV.DB_PATH, { create: true });

sqliteDb.exec('PRAGMA journal_mode = WAL;');
sqliteDb.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'manager', 'reseller')),
      createdBy TEXT,
      pin2fa TEXT,
      isBlocked INTEGER DEFAULT 0,
      credits INTEGER DEFAULT 0,
      tokens INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      hwid TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked', 'banned')),
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      activatedAt TEXT,
      createdById TEXT NOT NULL,
      createdByUsername TEXT NOT NULL,
      note TEXT,
      isMasterKey INTEGER DEFAULT 0,
      paymentScreenshot TEXT,
      costTokens INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payload_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version TEXT NOT NULL DEFAULT '1.0.0',
      versionCode INTEGER NOT NULL DEFAULT 100,
      changelog TEXT,
      size INTEGER DEFAULT 0,
      updatedAt TEXT NOT NULL,
      updatedBy TEXT
    );
  `);

  sqliteDb.exec(`
    INSERT OR IGNORE INTO payload_meta (id, version, versionCode, changelog, size, updatedAt, updatedBy)
    VALUES (1, '1.0.0', 100, 'Initial libil2cpp release', 0, CURRENT_TIMESTAMP, 'System');
  `);

  const columnsToAdd = [
    { table: 'keys', column: 'isMasterKey INTEGER DEFAULT 0' },
    { table: 'keys', column: 'paymentScreenshot TEXT' },
    { table: 'keys', column: 'costTokens INTEGER DEFAULT 0' },
    { table: 'users', column: 'tokens INTEGER DEFAULT 0' },
  ];

  for (const { table, column } of columnsToAdd) {
    try {
      sqliteDb.exec(`ALTER TABLE ${table} ADD COLUMN ${column}`);
    } catch {
      // Column already exists
    }
  }

  const ownerUser = sqliteDb.query('SELECT * FROM users WHERE role = ? OR username = ?').get('owner', ENV.OWNER_USERNAME) as any;
  if (!ownerUser) {
    const ownerId = 'owner-root-id';
    const now = new Date().toISOString();
    sqliteDb.query(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, 'owner', 'system', ?, 0, 999999, 999999, ?)
    `).run(ownerId, ENV.OWNER_USERNAME, ENV.OWNER_PASSWORD, ENV.OWNER_2FA_PIN, now);
    console.log(`[Database] Default Owner created (${ENV.OWNER_USERNAME}).`);
  }
}

export const db = {
  prepare: (sql: string) => {
    const stmt = sqliteDb.prepare(sql);
    return {
      get: (...params: any[]) => stmt.get(...params),
      all: (...params: any[]) => stmt.all(...params),
      run: (...params: any[]) => stmt.run(...params),
    };
  },
  exec: (sql: string) => sqliteDb.exec(sql),
  transaction: <T>(fn: () => T): T => sqliteDb.transaction(fn)(),
};
