"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify2FA = exports.login = void 0;
const sqlite_1 = require("../db/sqlite");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middlewares/auth");
const logs_service_1 = require("../services/logs.service");
const errors_1 = require("../utils/errors");
const login = (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return next(new errors_1.AppError('Username and password are required.', 400));
        }
        const envOwnerUser = process.env.OWNER_USERNAME || 'owner';
        const envOwnerPass = process.env.OWNER_PASSWORD || 'owner123';
        let user = sqlite_1.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        // Check owner login dynamically against .env
        if (username === envOwnerUser) {
            if (password !== envOwnerPass) {
                logs_service_1.LogsService.logAction('system', username, 'LOGIN_FAILED', 'Invalid owner credentials');
                return next(new errors_1.AppError('Invalid username or password.', 401));
            }
            if (!user) {
                // Create owner dynamically if missing
                const ownerId = 'owner-root-id';
                const now = new Date().toISOString();
                sqlite_1.db.prepare(`
          INSERT OR REPLACE INTO users (id, username, password, role, createdBy, pin2fa, isBlocked, credits, createdAt)
          VALUES (?, ?, ?, 'owner', 'system', ?, 0, 999999, ?)
        `).run(ownerId, envOwnerUser, envOwnerPass, process.env.OWNER_2FA_PIN || '123456', now);
                user = sqlite_1.db.prepare('SELECT * FROM users WHERE id = ?').get(ownerId);
            }
        }
        else {
            if (!user || user.password !== password) {
                logs_service_1.LogsService.logAction('system', username, 'LOGIN_FAILED', 'Invalid credentials');
                return next(new errors_1.AppError('Invalid username or password.', 401));
            }
        }
        if (user.isBlocked) {
            logs_service_1.LogsService.logAction(user.id, user.username, 'LOGIN_BLOCKED', 'Blocked account tried to login');
            return next(new errors_1.AppError('Account is blocked by manager or owner.', 403));
        }
        if (user.role === 'owner' || user.role === 'manager') {
            return res.json({
                require2FA: true,
                userId: user.id,
                role: user.role,
                username: user.username,
                message: '2FA PIN required for Owner/Manager authentication.'
            });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, auth_1.JWT_SECRET, { expiresIn: '24h' });
        logs_service_1.LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', 'User logged in successfully');
        return res.json({
            require2FA: false,
            token,
            user: { id: user.id, username: user.username, role: user.role, credits: user.credits }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.login = login;
const verify2FA = (req, res, next) => {
    try {
        const { userId, pin } = req.body;
        if (!userId || !pin) {
            return next(new errors_1.AppError('User ID and PIN are required.', 400));
        }
        const user = sqlite_1.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) {
            return next(new errors_1.AppError('User not found.', 404));
        }
        // Check 2FA PIN against process.env configuration or database fallback
        const expectedPin = user.role === 'owner'
            ? (process.env.OWNER_2FA_PIN || user.pin2fa || '123456')
            : user.role === 'manager'
                ? (process.env.MANAGER_2FA_PIN || user.pin2fa || '654321')
                : user.pin2fa;
        if (pin !== expectedPin) {
            logs_service_1.LogsService.logAction(user.id, user.username, '2FA_FAILED', 'Invalid 2FA PIN entered');
            return next(new errors_1.AppError('Invalid 2FA PIN entered.', 401));
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, auth_1.JWT_SECRET, { expiresIn: '24h' });
        logs_service_1.LogsService.logAction(user.id, user.username, 'LOGIN_SUCCESS', 'User verified 2FA and logged in');
        return res.json({
            token,
            user: { id: user.id, username: user.username, role: user.role, credits: user.credits }
        });
    }
    catch (err) {
        next(err);
    }
};
exports.verify2FA = verify2FA;
