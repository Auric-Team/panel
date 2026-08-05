import { Router } from 'express';
import { login, verify2FA } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/login', authLimiter, login);
router.post('/verify-2fa', authLimiter, verify2FA);

export default router;
