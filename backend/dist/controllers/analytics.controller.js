"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = void 0;
const sqlite_1 = require("../db/sqlite");
const getAnalytics = (req, res, next) => {
    try {
        const { role, id } = req.user;
        let totalKeys = 0;
        let activeKeys = 0;
        let expiredKeys = 0;
        let boundDevices = 0;
        let totalResellers = 0;
        if (role === 'owner') {
            totalKeys = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys').get().count;
            activeKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'active'").get().count;
            expiredKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE status = 'expired'").get().count;
            boundDevices = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL').get().count;
            totalResellers = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'reseller'").get().count;
        }
        else {
            totalKeys = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ?').get(id).count;
            activeKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'active'").get(id).count;
            expiredKeys = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND status = 'expired'").get(id).count;
            boundDevices = sqlite_1.db.prepare('SELECT COUNT(*) as count FROM keys WHERE createdById = ? AND hwid IS NOT NULL').get(id).count;
            totalResellers = sqlite_1.db.prepare("SELECT COUNT(*) as count FROM users WHERE createdBy = ? AND role = 'reseller'").get(id).count;
        }
        return res.json({
            totalKeys,
            activeKeys,
            expiredKeys,
            boundDevices,
            totalResellers
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getAnalytics = getAnalytics;
