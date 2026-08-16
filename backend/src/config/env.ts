import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

function findUploadsDir(): string {
  const panelRoot = path.resolve(__dirname, '..', '..', '..');
  const backendDir = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.resolve(panelRoot, 'uploads'),
    path.resolve(panelRoot, 'backup_db', 'uploads'),
    path.resolve(backendDir, 'uploads'),
    path.resolve(process.cwd(), 'uploads'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const fallback = path.resolve(panelRoot, 'uploads');
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch {}
  return fallback;
}

function findDbPath(): string {
  const panelRoot = path.resolve(__dirname, '..', '..', '..');
  const backendDir = path.resolve(__dirname, '..', '..');
  const candidates = [
    path.resolve(backendDir, 'data', 'axios.db'),
    path.resolve(panelRoot, 'backup_db', 'axios.db'),
    path.resolve(process.cwd(), 'data', 'axios.db'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return path.resolve(backendDir, 'data', 'axios.db');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '20067', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'AXIOS_ULTRA_SECURE_JWT_SECRET_2026_KEY_PANEL',
  API_SALT: process.env.API_SALT || 'AXIOS_SECURE_SALT_2026',
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'AXIOS_PAYLOAD_SECRET',

  OWNER_USERNAME: process.env.OWNER_USERNAME || 'owner',
  OWNER_PASSWORD: process.env.OWNER_PASSWORD || 'owner123',
  OWNER_2FA_PIN: process.env.OWNER_2FA_PIN || '123456',

  MANAGER_2FA_PIN: process.env.MANAGER_2FA_PIN || '654321',

  DB_PATH: findDbPath(),
  UPLOADS_DIR: findUploadsDir(),
};
