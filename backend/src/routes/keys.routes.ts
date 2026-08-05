import { Router } from 'express';
import { verifyKey, getKeys, generateKeys, resetHwid, deleteKey } from '../controllers/keys.controller';
import { authenticate } from '../middlewares/auth';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/verify', apiLimiter, verifyKey);

router.use(authenticate);
router.get('/', getKeys);
router.post('/generate', generateKeys);
router.post('/reset-hwid', resetHwid);
router.post('/delete', deleteKey);

export default router;
