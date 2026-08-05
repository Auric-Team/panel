"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
exports.initDb = initDb;
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const DB_PATH = path_1.default.resolve(process.cwd(), 'data', 'axios.db');
const OLD_KEYS_PATH = path_1.default.resolve(process.cwd(), 'data', 'keys.json');
const dataDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
let sqlDb = null;
function saveDbToFile() {
    if (sqlDb) {
        const data = sqlDb.export();
        const buffer = Buffer.from(data);
        fs_1.default.writeFileSync(DB_PATH, buffer);
    }
}
exports.db = {
    prepare: (sql) => {
        return {
            get: (...params) => {
                const stmt = sqlDb.prepare(sql);
                stmt.bind(params);
                let result = null;
                if (stmt.step()) {
                    result = stmt.getAsObject();
                }
                stmt.free();
                return result;
            },
            all: (...params) => {
                const stmt = sqlDb.prepare(sql);
                stmt.bind(params);
                const results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            },
            run: (...params) => {
                sqlDb.run(sql, params);
                saveDbToFile();
                return { changes: 1 };
            }
        };
    },
    exec: (sql) => {
        sqlDb.run(sql);
        saveDbToFile();
    },
    transaction: (fn) => {
        return (...args) => {
            sqlDb.run('BEGIN TRANSACTION;');
            try {
                fn(...args);
                sqlDb.run('COMMIT;');
                saveDbToFile();
            }
            catch (err) {
                sqlDb.run('ROLLBACK;');
                throw err;
            }
        };
    }
};
async function initDb() {
    const cwdWasm = path_1.default.resolve(process.cwd(), 'dist', 'sql-wasm.wasm');
    const dirWasm = path_1.default.resolve(__dirname, 'sql-wasm.wasm');
    const wasmPath = fs_1.default.existsSync(cwdWasm) ? cwdWasm : dirWasm;
    const SQL = await (0, sql_js_1.default)({
        locateFile: (file) => fs_1.default.existsSync(wasmPath) ? wasmPath : path_1.default.resolve(process.cwd(), `node_modules/sql.js/dist/${file}`)
    });
    if (fs_1.default.existsSync(DB_PATH)) {
        const filebuffer = fs_1.default.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(filebuffer);
    }
    else {
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
    }
    catch (e) {
        // Column already exists
    }
    try {
        sqlDb.run('ALTER TABLE keys ADD COLUMN paymentScreenshot TEXT');
    }
    catch (e) {
        // Column already exists
    }
    try {
        sqlDb.run('ALTER TABLE keys ADD COLUMN costTokens INTEGER DEFAULT 0');
    }
    catch (e) {
        // Column already exists
    }
    try {
        sqlDb.run('ALTER TABLE users ADD COLUMN tokens INTEGER DEFAULT 0');
    }
    catch (e) {
        // Column already exists
    }
    saveDbToFile();
    const userCountRow = exports.db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (!userCountRow || userCountRow.count === 0) {
        const ownerId = 'owner-root-id';
        const now = new Date().toISOString();
        const ownerUser = process.env.OWNER_USERNAME || 'owner';
        const ownerPass = process.env.OWNER_PASSWORD || 'owner123';
        const ownerPin = process.env.OWNER_2FA_PIN || '123456';
        exports.db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 999999, 999999, ?)
    `).run(ownerId, ownerUser, ownerPass, 'owner', 'system', ownerPin, now);
        exports.db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 500, 500, ?)
    `).run('manager-1-id', 'manager', 'manager123', 'manager', ownerId, process.env.MANAGER_2FA_PIN || '654321', now);
        exports.db.prepare(`
      INSERT INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, tokens, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, 100, 100, ?)
    `).run('reseller-1-id', 'reseller', 'reseller123', 'reseller', 'manager-1-id', null, now);
    }
    const keyCountRow = exports.db.prepare('SELECT COUNT(*) as count FROM keys').get();
    if ((!keyCountRow || keyCountRow.count === 0) && fs_1.default.existsSync(OLD_KEYS_PATH)) {
        try {
            const raw = fs_1.default.readFileSync(OLD_KEYS_PATH, 'utf-8');
            const oldKeys = JSON.parse(raw);
            const insertStmt = exports.db.prepare(`
        INSERT OR IGNORE INTO keys (id, key, hwid, status, expiresAt, createdAt, activatedAt, createdById, createdByUsername, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            for (const k of oldKeys) {
                insertStmt.run(k.id || crypto_1.default.randomUUID(), k.key, k.hwid || null, k.status || 'active', k.expiresAt || 'never', k.createdAt || new Date().toISOString(), k.hwid ? k.createdAt : null, 'owner-root-id', 'owner', k.note || 'Migrated Key');
            }
            console.log(`[DB] Successfully migrated ${oldKeys.length} keys from keys.json to axios.db!`);
        }
        catch (err) {
            console.error('[DB] Failed to migrate old keys:', err);
        }
    }
}
