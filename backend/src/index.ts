import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { ENV } from './config/env';
import { initDatabase } from './db/database';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();
app.set('trust proxy', true);

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

if (!fs.existsSync(ENV.UPLOADS_DIR)) {
  fs.mkdirSync(ENV.UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(ENV.UPLOADS_DIR));

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    engine: 'Bun Native TypeScript Server',
    message: 'AXIOS Executive Control Center Active',
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/stats',
      verifyKey: '/api/verify',
      auth: '/api/auth/login',
      keys: '/api/keys',
      users: '/api/users',
      analytics: '/api/analytics',
    },
  });
});

app.use('/api', routes);

app.use(errorHandler);

async function bootstrap() {
  try {
    initDatabase();
    app.listen(ENV.PORT, () => {
      console.log(`\n🚀 [AXIOS Bun Backend] Server running directly on http://0.0.0.0:${ENV.PORT}`);
    });
  } catch (error) {
    console.error('[AXIOS Backend Fatal Startup Error]', error);
    process.exit(1);
  }
}

bootstrap();
