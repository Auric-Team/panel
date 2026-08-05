import { Response, NextFunction } from 'express';
import { db } from '../db/sqlite';
import { AuthRequest } from '../middlewares/auth';

export const getAnalytics = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, id } = req.user!;

    let totalKeys = 0;
    let activeKeys = 0;
    let expiredKeys = 0;
    let boundDevices = 0;
    let totalResellers = 0;

    if (role === 'owner') {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys').get() as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active'").get() as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired'").get() as any).count;
      boundDevices = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL').get() as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'reseller'").get() as any).count;
    } else {
      totalKeys = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(id) as any).count;
      activeKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(id) as any).count;
      expiredKeys = (db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(id) as any).count;
      boundDevices = (db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND hwid IS NOT NULL').get(id) as any).count;
      totalResellers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id) as any).count;
    }

    return res.json({
      totalKeys,
      activeKeys,
      expiredKeys,
      boundDevices,
      totalResellers
    });
  } catch (err) {
    next(err);
  }
};
