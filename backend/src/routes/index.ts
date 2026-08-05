import { Router } from 'express';
import authRoutes from './auth.routes';
import keysRoutes from './keys.routes';
import usersRoutes from './users.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/keys', keysRoutes); // Wait, /verify was in api/verify in index.ts, I should mount it properly. Or I can keep it under /keys/verify
router.use('/users', usersRoutes);
router.use('/analytics', analyticsRoutes);

// For backwards compatibility with older client code, also mount /verify here directly
import { verifyKey } from '../controllers/keys.controller';
import { apiLimiter } from '../middlewares/rateLimiter';
router.post('/verify', apiLimiter, verifyKey);

// Health and Stats check endpoints
router.get(['/stats', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
