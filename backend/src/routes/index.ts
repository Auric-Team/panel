import { Router } from 'express';
import authRoutes from './auth.routes';
import keysRoutes from './keys.routes';
import usersRoutes from './users.routes';
import analyticsRoutes from './analytics.routes';
import logsRoutes from './logs.routes';
import deployRoutes from './deploy.routes';
import { verifyKey } from '../controllers/keys.controller';
import { login } from '../controllers/auth.controller';
import { getDeployStatus, downloadBinary } from '../controllers/deploy.controller';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.use('/auth', authRoutes);
router.use('/keys', keysRoutes);
router.use('/users', usersRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/logs', logsRoutes);
router.use('/deploy', deployRoutes);

// High-level API Aliases for Injector & Direct Clients
router.post('/verify', apiLimiter, verifyKey);
router.post('/login', apiLimiter, login);
router.get('/status', getDeployStatus);
router.get(['/download/libil2cpp', '/download/libil2cpp.so'], downloadBinary);

router.get(['/stats', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
