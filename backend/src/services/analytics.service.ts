import { db } from '../db/database';
import { AppError } from '../utils/errors';
import { AuthUserPayload } from '../types/common';

export class AnalyticsService {
  static getAnalytics(user: AuthUserPayload) {
    const { role, id } = user;

    const nowIso = new Date().toISOString();
    db.prepare("UPDATE keys SET status = 'expired' WHERE status = 'active' AND expiresAt != 'never' AND expiresAt <= ?").run(nowIso);

    let totalKeys = 0;
    let activeKeys = 0;
    let expiredKeys = 0;
    let boundDevices = 0;
    let totalResellers = 0;
    let totalTokensSpent = 0;

    if (role === 'owner') {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys').get() as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active'").get() as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired'").get() as any).count;
      boundDevices = (db.prepare('SELECT COUNT(DISTINCT hwid) as count FROM (SELECT hwid FROM keys WHERE hwid IS NOT NULL AND hwid != "" UNION SELECT hwid FROM key_devices WHERE hwid IS NOT NULL AND hwid != "")').get() as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'reseller'").get() as any).count;
      totalTokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys').get() as any).total;
    } else if (role === 'manager') {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)').get(id, id) as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active' AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))").get(id, id) as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired' AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))").get(id, id) as any).count;
      boundDevices = (db.prepare('SELECT COUNT(DISTINCT hwid) as count FROM (SELECT hwid FROM keys WHERE (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)) AND hwid IS NOT NULL AND hwid != "" UNION SELECT kd.hwid FROM key_devices kd JOIN keys k ON kd.keyId = k.id WHERE (k.createdById = ? OR k.createdById IN (SELECT id FROM users WHERE createdBy = ?)) AND kd.hwid IS NOT NULL AND kd.hwid != "")').get(id, id, id, id) as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id) as any).count;
      totalTokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)').get(id, id) as any).total;
    } else {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(id) as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(id) as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(id) as any).count;
      boundDevices = (db.prepare('SELECT COUNT(DISTINCT hwid) as count FROM (SELECT hwid FROM keys WHERE createdById = ? AND hwid IS NOT NULL AND hwid != "" UNION SELECT kd.hwid FROM key_devices kd JOIN keys k ON kd.keyId = k.id WHERE k.createdById = ? AND kd.hwid IS NOT NULL AND kd.hwid != "")').get(id, id) as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id) as any).count;
      totalTokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ?').get(id) as any).total;
    }

    const salesMap = new Map<string, { count: number; tokens: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesMap.set(dateStr, { count: 0, tokens: 0 });
    }
    const oldestDate = Array.from(salesMap.keys())[0];

    let salesRows: any[] = [];
    if (role === 'owner') {
      salesRows = db.prepare(`
        SELECT 
          substr(createdAt, 1, 10) as date,
          COUNT(*) as count,
          COALESCE(SUM(costTokens), 0) as tokens
        FROM keys
        WHERE substr(createdAt, 1, 10) >= ?
        GROUP BY substr(createdAt, 1, 10)
      `).all(oldestDate) as any[];
    } else if (role === 'manager') {
      salesRows = db.prepare(`
        SELECT 
          substr(createdAt, 1, 10) as date,
          COUNT(*) as count,
          COALESCE(SUM(costTokens), 0) as tokens
        FROM keys
        WHERE (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))
          AND substr(createdAt, 1, 10) >= ?
        GROUP BY substr(createdAt, 1, 10)
      `).all(id, id, oldestDate) as any[];
    } else {
      salesRows = db.prepare(`
        SELECT 
          substr(createdAt, 1, 10) as date,
          COUNT(*) as count,
          COALESCE(SUM(costTokens), 0) as tokens
        FROM keys
        WHERE createdById = ? AND substr(createdAt, 1, 10) >= ?
        GROUP BY substr(createdAt, 1, 10)
      `).all(id, oldestDate) as any[];
    }

    for (const row of salesRows) {
      if (salesMap.has(row.date)) {
        salesMap.set(row.date, { count: Number(row.count), tokens: Number(row.tokens) });
      }
    }

    const dailySales = Array.from(salesMap.entries()).map(([date, val]) => ({
      date,
      count: val.count,
      tokens: val.tokens,
    }));

    let topResellersRows: any[] = [];
    if (role === 'owner') {
      topResellersRows = db.prepare(`
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
      `).all() as any[];
    } else if (role === 'manager') {
      topResellersRows = db.prepare(`
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
      `).all(id) as any[];
    } else {
      topResellersRows = db.prepare(`
        SELECT 
          u.username,
          COUNT(k.id) as keysCount,
          COALESCE(SUM(k.costTokens), 0) as tokensSpent
        FROM users u
        LEFT JOIN keys k ON u.id = k.createdById
        WHERE u.id = ?
        GROUP BY u.id, u.username
        ORDER BY tokensSpent DESC, keysCount DESC
      `).all(id) as any[];
    }

    const topResellers = topResellersRows.map((r) => ({
      username: r.username,
      keysCount: Number(r.keysCount),
      tokensSpent: Number(r.tokensSpent),
    }));

    return {
      totalKeys: Number(totalKeys),
      activeKeys: Number(activeKeys),
      expiredKeys: Number(expiredKeys),
      boundDevices: Number(boundDevices),
      totalResellers: Number(totalResellers),
      totalTokensSpent: Number(totalTokensSpent),
      dailySales,
      topResellers,
    };
  }

  static getResellerAnalytics(resellerId: string) {
    const resellerInfo = db.prepare(`
      SELECT 
        u.id, 
        u.username, 
        u.role, 
        COALESCE(c.username, u.createdBy, 'System') AS createdBy,
        COALESCE(c.username, u.createdBy, 'System') AS createdByUsername,
        u.isBlocked, 
        u.credits, 
        COALESCE(u.tokens, u.credits, 0) as tokens, 
        u.createdAt 
      FROM users u
      LEFT JOIN users c ON u.createdBy = c.id
      WHERE u.id = ?
    `).get(resellerId);

    if (!resellerInfo) {
      throw new AppError('Reseller not found', 404);
    }

    const totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(resellerId) as any)?.count || 0;
    const activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(resellerId) as any)?.count || 0;
    const expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(resellerId) as any)?.count || 0;
    const tokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ?').get(resellerId) as any)?.total || 0;

    const stats = {
      totalKeys: Number(totalKeys),
      activeKeys: Number(activeKeys),
      expiredKeys: Number(expiredKeys),
      tokensSpent: Number(tokensSpent),
    };

    const salesMap = new Map<string, { count: number; tokens: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesMap.set(dateStr, { count: 0, tokens: 0 });
    }
    const oldestDate = Array.from(salesMap.keys())[0];

    const salesRows: any[] = db.prepare(`
      SELECT 
        substr(createdAt, 1, 10) as date,
        COUNT(*) as count,
        COALESCE(SUM(costTokens), 0) as tokens
      FROM keys
      WHERE createdById = ? AND substr(createdAt, 1, 10) >= ?
      GROUP BY substr(createdAt, 1, 10)
    `).all(resellerId, oldestDate) as any[];

    for (const row of salesRows) {
      if (salesMap.has(row.date)) {
        salesMap.set(row.date, { count: Number(row.count), tokens: Number(row.tokens) });
      }
    }

    const salesGraph = Array.from(salesMap.entries()).map(([date, val]) => ({
      date,
      count: val.count,
      tokens: val.tokens,
    }));

    const keys = db.prepare('SELECT * FROM keys WHERE createdById = ? ORDER BY createdAt DESC LIMIT 50').all(resellerId);

    return {
      resellerInfo,
      stats,
      salesGraph,
      keys,
    };
  }
}
