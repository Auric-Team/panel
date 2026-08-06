"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: { error: 'Too many authentication attempts. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || '127.0.0.1'
});
exports.apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000,
    max: 2000,
    message: { error: 'Too many requests. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip || '127.0.0.1'
});
