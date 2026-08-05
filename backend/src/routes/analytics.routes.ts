import { Router } from 'express';
import { getAnalytics, getResellerAnalytics } from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();
const authMiddleware = authenticate;

router.use(authenticate);
router.get('/', getAnalytics);
router.get('/reseller/:id', authMiddleware, getResellerAnalytics);

export default router;
