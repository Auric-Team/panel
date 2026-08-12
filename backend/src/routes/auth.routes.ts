import { Router } from 'express';
import { login, register, verify2FA } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
router.post('/verify-2fa', authLimiter, verify2FA);

export default router;
