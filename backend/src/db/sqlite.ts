import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.resolve(process.cwd(), 'data', 'axios.db');
const OLD_KEYS_PATH = path.resolve(process.cwd(), 'data', 'keys.json');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let sqlDb: any = null;

function saveDbToFile() {
  if (sqlDb) {
    const data = sqlDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export const db = {
  prepare: (sql: string) => {
    return {
      get: (...params: any[]) => {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      },
      all: (...params: any[]) => {
        const stmt = sqlDb.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      },
      run: (...params: any[]) => {
        sqlDb.run(sql, params);
        saveDbToFile();
        return { changes: 1 };
      }
    };
  },
  exec: (sql: string) => {
    sqlDb.run(sql);
    saveDbToFile();
  },
  transaction: (fn: Function) => {
    return (...args: any[]) => {
      sqlDb.run('BEGIN TRANSACTION;');
      try {
        fn(...args);
        sqlDb.run('COMMIT;');
        saveDbToFile();
      } catch (err) {
        sqlDb.run('ROLLBACK;');
        throw err;
      }
    };
  }
};

export async function initDb() {
  const cwdWasm = path.resolve(process.cwd(), 'dist', 'sql-wasm.wasm');
  const dirWasm = path.resolve(__dirname, 'sql-wasm.wasm');
  const wasmPath = fs.existsSync(cwdWasm) ? cwdWasm : dirWasm;

  const SQL = await initSqlJs({
    locateFile: (file: string) => fs.existsSync(wasmPath) ? wasmPath : path.resolve(process.cwd(), `node_modules/sql.js/dist/${file}`)
  });
  
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(filebuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('owner', 'manager', 'reseller')),
      createdBy TEXT,
      pin2fa TEXT,
      isBlocked INTEGER DEFAULT 0,
      credits INTEGER DEFAULT 0,
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
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );
  `);
  saveDbToFile();

  const userCountRow: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCountRow || userCountRow.count === 0) {
    const ownerId = 'owner-root-id';
    const now = new Date().toISOString();

    const ownerUser = process.env.OWNER_USERNAME || 'owner';
    const ownerPass = process.env.OWNER_PASSWORD || 'owner123';
    const ownerPin = process.env.OWNER_2FA_PIN || '123456';
    
    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 999999, ?)
    `).run(ownerId, ownerUser, ownerPass, 'owner', 'system', ownerPin, now);

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 500, ?)
    `).run('manager-1-id', 'manager', 'manager123', 'manager', ownerId, process.env.MANAGER_2FA_PIN || '654321', now);

    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 100, ?)
    `).run('reseller-1-id', 'reseller', 'reseller123', 'reseller', 'manager-1-id', null, now);
  }

  const keyCountRow: any = db.prepare('SELECT COUNT(*) as count FROM keys').get();
  if ((!keyCountRow || keyCountRow.count === 0) && fs.existsSync(OLD_KEYS_PATH)) {
    try {
      const raw = fs.readFileSync(OLD_KEYS_PATH, 'utf-8');
      const oldKeys = JSON.parse(raw);
      const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO keys (id, key, hwid, status, expiresAt, createdAt, activatedAt, createdById, createdByUsername, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const k of oldKeys) {
        insertStmt.run(
          k.id || crypto.randomUUID(),
          k.key,
          k.hwid || null,
          k.status || 'active',
          k.expiresAt || 'never',
          k.createdAt || new Date().toISOString(),
          k.hwid ? k.createdAt : null,
          'owner-root-id',
          'owner',
          k.note || 'Migrated Key'
        );
      }
      console.log(`[DB] Successfully migrated ${oldKeys.length} keys from keys.json to axios.db!`);
    } catch (err) {
      console.error('[DB] Failed to migrate old keys:', err);
    }
  }
}
