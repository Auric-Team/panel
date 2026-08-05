"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResellerAnalytics = exports.getAnalytics = void 0;
const sqlite_1 = require("../db/sqlite");
const errors_1 = require("../utils/errors");
const getAnalytics = (req, res, next) => {
    try {
        const { role, id } = req.user;
        let totalKeys = 0;
        let activeKeys = 0;
        let expiredKeys = 0;
        let boundDevices = 0;
        let totalResellers = 0;
        let totalTokensSpent = 0;
        if (role === 'owner') {
            totalKeys = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys').get().count;
            activeKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active'").get().count;
            expiredKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired'").get().count;
            boundDevices = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL').get().count;
            totalResellers = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'reseller'").get().count;
            totalTokensSpent = sqlite_1.db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys').get().total;
        }
        else if (role === 'manager') {
            totalKeys = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)').get(id, id).count;
            activeKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active' AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))").get(id, id).count;
            expiredKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired' AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))").get(id, id).count;
            boundDevices = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))').get(id, id).count;
            totalResellers = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id).count;
            totalTokensSpent = sqlite_1.db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)').get(id, id).total;
        }
        else {
            totalKeys = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(id).count;
            activeKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(id).count;
            expiredKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(id).count;
            boundDevices = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND hwid IS NOT NULL').get(id).count;
            totalResellers = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id).count;
            totalTokensSpent = sqlite_1.db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ?').get(id).total;
        }
        // Daily Sales timeline (Last 14 days)
        const salesMap = new Map();
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesMap.set(dateStr, { count: 0, tokens: 0 });
        }
        const oldestDate = Array.from(salesMap.keys())[0];
        let salesRows = [];
        if (role === 'owner') {
            salesRows = sqlite_1.db.prepare(`
        SELECT 
          substr(createdAt, 1, 10) as date,
          COUNT(*) as count,
          COALESCE(SUM(costTokens), 0) as tokens
        FROM keys
        WHERE substr(createdAt, 1, 10) >= ?
        GROUP BY substr(createdAt, 1, 10)
      `).all(oldestDate);
        }
        else if (role === 'manager') {
            salesRows = sqlite_1.db.prepare(`
        SELECT 
          substr(createdAt, 1, 10) as date,
          COUNT(*) as count,
          COALESCE(SUM(costTokens), 0) as tokens
        FROM keys
        WHERE (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))
          AND substr(createdAt, 1, 10) >= ?
        GROUP BY substr(createdAt, 1, 10)
      `).all(id, id, oldestDate);
        }
        else {
            salesRows = sqlite_1.db.prepare(`
        SELECT 
          substr(createdAt, 1, 10) as date,
          COUNT(*) as count,
          COALESCE(SUM(costTokens), 0) as tokens
        FROM keys
        WHERE createdById = ? AND substr(createdAt, 1, 10) >= ?
        GROUP BY substr(createdAt, 1, 10)
      `).all(id, oldestDate);
        }
        for (const row of salesRows) {
            if (salesMap.has(row.date)) {
                salesMap.set(row.date, { count: Number(row.count), tokens: Number(row.tokens) });
            }
        }
        const dailySales = Array.from(salesMap.entries()).map(([date, val]) => ({
            date,
            count: val.count,
            tokens: val.tokens
        }));
        // Top Resellers
        let topResellersRows = [];
        if (role === 'owner') {
            topResellersRows = sqlite_1.db.prepare(`
        SELECT 
          u.username,
          COUNT(k.id) as keysCount,
          COALESCE(SUM(k.costTokens), 0) as tokensSpent
        FROM users u
        LEFT JOIN keys k ON u.id = k.createdById
        WHERE u.role = 'reseller'
        GROUP BY u.id, u.username
        ORDER BY tokensSpent DESC, keysCount DESC
        LIMIT 10
      `).all();
        }
        else if (role === 'manager') {
            topResellersRows = sqlite_1.db.prepare(`
        SELECT 
          u.username,
          COUNT(k.id) as keysCount,
          COALESCE(SUM(k.costTokens), 0) as tokensSpent
        FROM users u
        LEFT JOIN keys k ON u.id = k.createdById
        WHERE u.role = 'reseller' AND u.createdBy = ?
        GROUP BY u.id, u.username
        ORDER BY tokensSpent DESC, keysCount DESC
        LIMIT 10
      `).all(id);
        }
        else {
            topResellersRows = sqlite_1.db.prepare(`
        SELECT 
          u.username,
          COUNT(k.id) as keysCount,
          COALESCE(SUM(k.costTokens), 0) as tokensSpent
        FROM users u
        LEFT JOIN keys k ON u.id = k.createdById
        WHERE u.id = ?
        GROUP BY u.id, u.username
        ORDER BY tokensSpent DESC, keysCount DESC
      `).all(id);
        }
        const topResellers = topResellersRows.map(r => ({
            username: r.username,
            keysCount: Number(r.keysCount),
            tokensSpent: Number(r.tokensSpent)
        }));
        return res.json({
            totalKeys,
            activeKeys,
            expiredKeys,
            boundDevices,
            totalResellers,
            totalTokensSpent: Number(totalTokensSpent),
            dailySales,
            topResellers
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAnalytics = getAnalytics;
const getResellerAnalytics = (req, res, next) => {
    try {
        const resellerId = req.params.id;
        const resellerInfo = sqlite_1.db.prepare('SELECT id, username, role, createdBy, isBlocked, credits, COALESCE(tokens, credits, 0) as tokens, createdAt FROM users WHERE id = ?').get(resellerId);
        if (!resellerInfo) {
            return next(new errors_1.AppError('Reseller not found', 404));
        }
        const totalKeys = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(resellerId)?.count || 0;
        const activeKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(resellerId)?.count || 0;
        const expiredKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(resellerId)?.count || 0;
        const tokensSpent = sqlite_1.db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ?').get(resellerId)?.total || 0;
        const stats = {
            totalKeys: Number(totalKeys),
            activeKeys: Number(activeKeys),
            expiredKeys: Number(expiredKeys),
            tokensSpent: Number(tokensSpent)
        };
        // Sales graph (last 14 days)
        const salesMap = new Map();
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            salesMap.set(dateStr, { count: 0, tokens: 0 });
        }
        const oldestDate = Array.from(salesMap.keys())[0];
        const salesRows = sqlite_1.db.prepare(`
      SELECT 
        substr(createdAt, 1, 10) as date,
        COUNT(*) as count,
        COALESCE(SUM(costTokens), 0) as tokens
      FROM keys
      WHERE createdById = ? AND substr(createdAt, 1, 10) >= ?
      GROUP BY substr(createdAt, 1, 10)
    `).all(resellerId, oldestDate);
        for (const row of salesRows) {
            if (salesMap.has(row.date)) {
                salesMap.set(row.date, { count: Number(row.count), tokens: Number(row.tokens) });
            }
        }
        const salesGraph = Array.from(salesMap.entries()).map(([date, val]) => ({
            date,
            count: val.count,
            tokens: val.tokens
        }));
        // Latest 50 keys created by reseller (including paymentScreenshot)
        const keys = sqlite_1.db.prepare('SELECT * FROM keys WHERE createdById = ? ORDER BY createdAt DESC LIMIT 50').all(resellerId);
        return res.json({
            resellerInfo,
            stats,
            salesGraph,
            keys
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getResellerAnalytics = getResellerAnalytics;
