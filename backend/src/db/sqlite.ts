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
  `);
  try {
    sqlDb.run('ALTER TABLE keys ADD COLUMN isMasterKey INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists
  }
  try {
    sqlDb.run('ALTER TABLE keys ADD COLUMN paymentScreenshot TEXT');
  } catch (e) {
    // Column already exists
  }
  try {
    sqlDb.run('ALTER TABLE keys ADD COLUMN costTokens INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists
  }
  try {
    sqlDb.run('ALTER TABLE users ADD COLUMN tokens INTEGER DEFAULT 0');
  } catch (e) {
    // Column already exists
  }
  saveDbToFile();

  const userCountRow: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCountRow || userCountRow.count === 0) {
    const ownerId = 'owner-root-id';
    const now = new Date().toISOString();

    const ownerUser = process.env.OWNER_USERNAME || 'owner';
    const ownerPass = process.env.OWNER_PASSWORD || 'owner123';
    const ownerPin = process.env.OWNER_2FA_PIN || '123456';
    
    db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 999999, 999999, ?)
    `).run(ownerId, ownerUser, ownerPass, 'owner', 'system', ownerPin, now);
  }
}
