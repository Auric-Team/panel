import { Router } from 'express';
import { verifyKey, getKeys, generateKeys, resetHwid, deleteKey, deleteExpiredKeys } from '../controllers/keys.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/verify', apiLimiter, verifyKey);

router.use(authenticate);
router.get('/', getKeys);
router.post('/generate', generateKeys);
router.post('/reset-hwid', resetHwid);
router.post('/delete', deleteKey);
router.post('/delete-expired', deleteExpiredKeys);

export default router;
