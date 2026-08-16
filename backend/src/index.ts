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

// Robust upload directory resolution
const uploadPaths = [
  ENV.UPLOADS_DIR,
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), 'backend', 'uploads'),
  path.resolve(process.cwd(), 'backup_db', 'uploads'),
  path.resolve(__dirname, '..', 'uploads'),
  path.resolve(__dirname, '..', 'backup_db', 'uploads'),
  path.resolve(__dirname, '..', '..', 'uploads'),
  path.resolve(__dirname, '..', '..', 'backup_db', 'uploads'),
];

uploadPaths.forEach((p) => {
  if (fs.existsSync(p)) {
    app.use('/uploads', express.static(p));
  }
});

// Explicit robust fallback handler for any /uploads/:filename
app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  for (const p of uploadPaths) {
    const fullPath = path.join(p, filename);
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
  }
  return res.status(404).send(`Screenshot ${filename} not found`);
});

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
