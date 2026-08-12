import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { getDeployStatus, downloadBinary, uploadBinary } from '../controllers/deploy.controller';
import { authenticate, authorizeRole } from '../middlewares/auth.middleware';
import { ENV } from '../config/env';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ENV.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, 'libil2cpp.so');
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

const router = Router();

router.get('/status', getDeployStatus);
router.get('/download/libil2cpp', downloadBinary);
router.get('/download/libil2cpp.so', downloadBinary);
router.post('/upload', authenticate, authorizeRole(['owner', 'manager']), upload.single('file'), uploadBinary);

export default router;
