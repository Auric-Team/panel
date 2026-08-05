import { Response, NextFunction } from 'express';
import { db } from '../db/sqlite';
import { AuthRequest } from '../middlewares/auth';
import { AppError } from '../utils/errors';

export const getAnalytics = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, id } = req.user!;

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
      boundDevices = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL').get() as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'reseller'").get() as any).count;
      totalTokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys').get() as any).total;
    } else if (role === 'manager') {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)').get(id, id) as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active' AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))").get(id, id) as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired' AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))").get(id, id) as any).count;
      boundDevices = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL AND (createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?))').get(id, id) as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id) as any).count;
      totalTokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ? OR createdById IN (SELECT id FROM users WHERE createdBy = ?)').get(id, id) as any).total;
    } else {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(id) as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(id) as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(id) as any).count;
      boundDevices = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND hwid IS NOT NULL').get(id) as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id) as any).count;
      totalTokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ?').get(id) as any).total;
    }

    // Daily Sales timeline (Last 14 days)
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
      `).all(oldestDate);
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
      `).all(id, id, oldestDate);
    } else {
      salesRows = db.prepare(`
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
      `).all();
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
      `).all(id);
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
  } catch (err) {
    next(err);
  }
};

export const getResellerAnalytics = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const resellerId = req.params.id;

    const resellerInfo = db.prepare('SELECT id, username, role, createdBy, isBlocked, credits, COALESCE(tokens, credits, 0) as tokens, createdAt FROM users WHERE id = ?').get(resellerId);

    if (!resellerInfo) {
      return next(new AppError('Reseller not found', 404));
    }

    const totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(resellerId) as any)?.count || 0;
    const activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(resellerId) as any)?.count || 0;
    const expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(resellerId) as any)?.count || 0;
    const tokensSpent = (db.prepare('SELECT COALESCE(SUM(costTokens), 0) as total FROM keys WHERE createdById = ?').get(resellerId) as any)?.total || 0;

    const stats = {
      totalKeys: Number(totalKeys),
      activeKeys: Number(activeKeys),
      expiredKeys: Number(expiredKeys),
      tokensSpent: Number(tokensSpent)
    };

    // Sales graph (last 14 days)
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
    const keys = db.prepare('SELECT * FROM keys WHERE createdById = ? ORDER BY createdAt DESC LIMIT 50').all(resellerId);

    return res.json({
      resellerInfo,
      stats,
      salesGraph,
      keys
    });
  } catch (err) {
    next(err);
  }
};
