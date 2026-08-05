"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const keys_routes_1 = __importDefault(require("./keys.routes"));
const users_routes_1 = __importDefault(require("./users.routes"));
const analytics_routes_1 = __importDefault(require("./analytics.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/keys', keys_routes_1.default); // Wait, /verify was in api/verify in index.ts, I should mount it properly. Or I can keep it under /keys/verify
router.use('/users', users_routes_1.default);
router.use('/analytics', analytics_routes_1.default);
// For backwards compatibility with older client code, also mount /verify here directly
const keys_controller_1 = require("../controllers/keys.controller");
const rateLimiter_1 = require("../middlewares/rateLimiter");
router.post('/verify', rateLimiter_1.apiLimiter, keys_controller_1.verifyKey);
exports.default = router;
