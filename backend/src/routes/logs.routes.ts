import { Router } from 'express';
import { getLogs, clearLogs } from '../controllers/logs.controller';
import { authenticate, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);
router.get('/', getLogs);
router.post('/clear', authorizeRole(['owner']), clearLogs);

export default router;
