"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRole = exports.authenticate = exports.JWT_SECRET = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
exports.JWT_SECRET = process.env.JWT_SECRET || 'AXIOS_ULTRA_SECURE_JWT_SECRET_2026_KEY_PANEL';
const sqlite_1 = require("../db/sqlite");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new errors_1.AppError('Unauthorized. Token required.', 401));
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, exports.JWT_SECRET);
        // Check if account is blocked or deleted in real-time
        const userRecord = sqlite_1.db.prepare('SELECT isBlocked FROM users WHERE id = ?').get(decoded.id);
        if (!userRecord || userRecord.isBlocked === 1) {
            return next(new errors_1.AppError('Account is blocked or no longer exists.', 403));
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        return next(new errors_1.AppError('Invalid or expired token.', 401));
    }
};
exports.authenticate = authenticate;
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new errors_1.AppError('Forbidden. Insufficient permissions.', 403));
        }
        next();
    };
};
exports.authorizeRole = authorizeRole;
