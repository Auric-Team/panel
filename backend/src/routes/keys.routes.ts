import { Router } from 'express';
import {
  verifyKey,
  getKeys,
  generateKeys,
  resetHwid,
  deleteKey,
  deleteExpiredKeys,
  extendKey,
  updateKeyNote,
  updateReceipt,
  bulkResetHwid,
  bulkDeleteKeys,
  bulkExtendKeys,
} from '../controllers/keys.controller';
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
router.post('/extend', extendKey);
router.post('/update-note', updateKeyNote);
router.post('/upload-receipt', updateReceipt);
router.post('/update-receipt', updateReceipt);
router.post('/bulk-reset-hwid', bulkResetHwid);
router.post('/bulk-delete', bulkDeleteKeys);
router.post('/bulk-extend', bulkExtendKeys);

export default router;
