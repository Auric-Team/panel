import { Router } from 'express';
import authRoutes from './auth.routes';
import keysRoutes from './keys.routes';
import usersRoutes from './users.routes';
import analyticsRoutes from './analytics.routes';
import logsRoutes from './logs.routes';
import { verifyKey } from '../controllers/keys.controller';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use('/auth', authRoutes);
router.use('/keys', keysRoutes);
router.use('/users', usersRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/logs', logsRoutes);

router.post('/verify', apiLimiter, verifyKey);

router.get(['/stats', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
