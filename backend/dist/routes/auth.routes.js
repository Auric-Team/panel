"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
router.post('/login', rateLimiter_1.authLimiter, auth_controller_1.login);
router.post('/verify-2fa', rateLimiter_1.authLimiter, auth_controller_1.verify2FA);
exports.default = router;
