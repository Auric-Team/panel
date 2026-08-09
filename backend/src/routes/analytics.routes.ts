import { Router } from 'express';
import { getAnalytics, getResellerAnalytics } from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getAnalytics);
router.get('/reseller/:id', getResellerAnalytics);

export default router;
