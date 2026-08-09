import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '20067', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'AXIOS_ULTRA_SECURE_JWT_SECRET_2026_KEY_PANEL',
  API_SALT: process.env.API_SALT || 'AXIOS_SECURE_SALT_2026',
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'AXIOS_PAYLOAD_SECRET',

  OWNER_USERNAME: process.env.OWNER_USERNAME || 'owner',
  OWNER_PASSWORD: process.env.OWNER_PASSWORD || 'owner123',
  OWNER_2FA_PIN: process.env.OWNER_2FA_PIN || '123456',

  MANAGER_2FA_PIN: process.env.MANAGER_2FA_PIN || '654321',

  DB_PATH: path.resolve(process.cwd(), 'data', 'axios.db'),
  UPLOADS_DIR: path.resolve(process.cwd(), 'uploads'),
};
