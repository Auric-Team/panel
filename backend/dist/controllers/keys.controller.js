"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteKey = exports.resetHwid = exports.generateKeys = exports.getKeys = exports.verifyKey = void 0;
const sqlite_1 = require("../db/sqlite");
const crypto_1 = __importDefault(require("crypto"));
const errors_1 = require("../utils/errors");
const logs_service_1 = require("../services/logs.service");
const verifyKey = (req, res, next) => {
    try {
        const reqKey = req.body.key;
        const reqHwid = req.body.hwid;
        const timestamp = req.body.timestamp;
        const signature = req.body.signature || req.body.hash;
        if (!reqKey || !reqHwid) {
            return res.status(400).json({ status: 'invalid', message: 'Key and HWID are required' });
        }
        if (timestamp && signature) {
            const requestTime = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
            const nowTime = Date.now();
            const timeDiff = Math.abs(nowTime - requestTime);
            if (isNaN(requestTime) || timeDiff > 10 * 60 * 1000) {
                return res.status(403).json({ status: 'invalid', message: 'Request timestamp expired' });
            }
            const salt = process.env.API_SALT || 'AXIOS_SECURE_SALT_2026';
            const payloadStr = `${reqKey}${reqHwid}${timestamp}${salt}`;
            const expectedHash = crypto_1.default.createHash('sha256').update(payloadStr).digest('hex');
            const secret = process.env.PAYLOAD_SECRET || 'AXIOS_PAYLOAD_SECRET';
            const expectedHmac = crypto_1.default.createHmac('sha256', secret).update(`${reqKey}${reqHwid}${timestamp}`).digest('hex');
            if (signature.toLowerCase() !== expectedHash.toLowerCase() && signature.toLowerCase() !== expectedHmac.toLowerCase()) {
                return res.status(403).json({ status: 'invalid', message: 'Invalid payload integrity hash' });
            }
        }
        const keyItem = sqlite_1.db.prepare('SELECT * FROM keys WHERE UPPER(key) = UPPER(?)').get(reqKey.trim());
        if (!keyItem) {
            logs_service_1.LogsService.logAction('system', 'client', 'KEY_VERIFY_FAILED', `Invalid key: ${reqKey}`);
            return res.status(404).json({ status: 'invalid', message: 'Key does not exist' });
        }
        const now = new Date();
        if (keyItem.status === 'expired' ||
            (keyItem.expiresAt !== 'never' && new Date(keyItem.expiresAt) < now)) {
            if (keyItem.status !== 'expired') {
                sqlite_1.db.prepare("UPDATE keys SET status = 'expired' WHERE id = ?").run(keyItem.id);
            }
            return res.status(403).json({ status: 'expired', message: 'Key has expired' });
        }
        if (keyItem.status === 'revoked' || keyItem.status === 'banned') {
            return res.status(403).json({ status: 'revoked', message: 'Key has been revoked or banned' });
        }
        if (!keyItem.hwid) {
            sqlite_1.db.prepare('UPDATE keys SET hwid = ?, activatedAt = ? WHERE id = ?').run(reqHwid, now.toISOString(), keyItem.id);
            logs_service_1.LogsService.logAction('system', 'client', 'KEY_ACTIVATED', `Key ${keyItem.key} bound to HWID ${reqHwid}`);
            return res.json({
                status: 'authenticated',
                message: 'Key successfully activated and bound to device',
                expiresAt: keyItem.expiresAt,
            });
        }
        if (keyItem.hwid === reqHwid) {
            return res.json({
                status: 'authenticated',
                message: 'Key authenticated',
                expiresAt: keyItem.expiresAt,
            });
        }
        else {
            logs_service_1.LogsService.logAction('system', 'client', 'KEY_HWID_MISMATCH', `Key ${keyItem.key} HWID mismatch. Exp: ${keyItem.hwid}, Got: ${reqHwid}`);
            return res.status(403).json({ status: 'mismatch', message: 'Key is bound to another device' });
        }
    }
    catch (err) {
        next(err);
    }
};
exports.verifyKey = verifyKey;
const getKeys = (req, res, next) => {
    try {
        const { role, id } = req.user;
        let keys = [];
        if (role === 'owner') {
            keys = sqlite_1.db.prepare('SELECT * FROM keys ORDER BY createdAt DESC').all();
        }
        else if (role === 'manager') {
            keys = sqlite_1.db.prepare(`
        SELECT k.* FROM keys k
        LEFT JOIN users u ON k.createdById = u.id
        WHERE k.createdById = ? OR u.createdBy = ?
        ORDER BY k.createdAt DESC
      `).all(id, id);
        }
        else {
            keys = sqlite_1.db.prepare('SELECT * FROM keys WHERE createdById = ? ORDER BY createdAt DESC').all(id);
        }
        return res.json(keys);
    }
    catch (err) {
        next(err);
    }
};
exports.getKeys = getKeys;
const generateKeys = (req, res, next) => {
    try {
        const { durationDays, count, note } = req.body;
        const user = req.user;
        const numKeys = Math.max(1, parseInt(count) || 1);
        const days = parseInt(durationDays) || 0;
        const createdKeys = [];
        const now = new Date();
        const generateKeyString = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            const seg = (len) => Array.from({ length: len }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
            return `AXIOS-${seg(4)}-${seg(4)}-${seg(4)}`;
        };
        const insertStmt = sqlite_1.db.prepare(`
      INSERT INTO keys (id, key, expiresAt, createdAt, createdById, createdByUsername, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        for (let i = 0; i < numKeys; i++) {
            let expiresAt = 'never';
            if (days > 0) {
                expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
            }
            const newKey = {
                id: crypto_1.default.randomUUID(),
                key: generateKeyString(),
                expiresAt,
                createdAt: now.toISOString(),
                createdById: user.id,
                createdByUsername: user.username,
                note: note || (days === 0 ? 'Lifetime Key' : `${days} Days Key`)
            };
            insertStmt.run(newKey.id, newKey.key, newKey.expiresAt, newKey.createdAt, newKey.createdById, newKey.createdByUsername, newKey.note);
            createdKeys.push(newKey);
        }
        logs_service_1.LogsService.logAction(user.id, user.username, 'KEYS_GENERATED', `Generated ${numKeys} keys (${days} days)`);
        return res.json({ success: true, count: createdKeys.length, keys: createdKeys });
    }
    catch (err) {
        next(err);
    }
};
exports.generateKeys = generateKeys;
const resetHwid = (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id)
            return next(new errors_1.AppError('Key ID is required.', 400));
        sqlite_1.db.prepare('UPDATE keys SET hwid = null WHERE id = ?').run(id);
        logs_service_1.LogsService.logAction(req.user.id, req.user.username, 'KEY_HWID_RESET', `Reset HWID for key ID: ${id}`);
        return res.json({ success: true, message: 'HWID reset successfully.' });
    }
    catch (err) {
        next(err);
    }
};
exports.resetHwid = resetHwid;
const deleteKey = (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id)
            return next(new errors_1.AppError('Key ID is required.', 400));
        sqlite_1.db.prepare('DELETE FROM keys WHERE id = ?').run(id);
        logs_service_1.LogsService.logAction(req.user.id, req.user.username, 'KEY_DELETED', `Deleted key ID: ${id}`);
        return res.json({ success: true, message: 'Key deleted successfully.' });
    }
    catch (err) {
        next(err);
    }
};
exports.deleteKey = deleteKey;
