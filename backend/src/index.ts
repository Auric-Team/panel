import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { ENV } from './config/env';
import { initDatabase } from './db/database';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { sanitizeRequest } from './middlewares/rateLimiter';
import { sanitizeFilename } from './utils/crypto';

const app = express();
app.set('trust proxy', true);

// Advanced Hardened Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Hide backend technology header
  res.removeHeader('X-Powered-By');
  next();
});

// CORS Configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Retry-After'],
  })
);
app.options('*', cors());

// Body Parsers with limits
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Global Security Request Sanitizer (Anti-Prototype Pollution & Injection)
app.use(sanitizeRequest);

// Robust upload directory resolution
const panelRoot = path.resolve(__dirname, '..', '..');
const backendDir = path.resolve(__dirname, '..');
const uploadPaths = [
  ENV.UPLOADS_DIR,
  path.resolve(panelRoot, 'uploads'),
  path.resolve(panelRoot, 'backup_db', 'uploads'),
  path.resolve(backendDir, 'uploads'),
  path.resolve(process.cwd(), 'uploads'),
];

uploadPaths.forEach((p) => {
  if (fs.existsSync(p)) {
    app.use('/uploads', express.static(p, { dotfiles: 'ignore', maxAge: '7d' }));
  }
});

// Path-traversal-proof fallback handler for /uploads/:filename
app.get('/uploads/:filename', (req, res) => {
  const safeFilename = sanitizeFilename(req.params.filename);
  if (!safeFilename) {
    return res.status(400).send('Invalid filename.');
  }

  for (const p of uploadPaths) {
    const fullPath = path.join(p, safeFilename);
    if (fs.existsSync(fullPath)) {
      return res.sendFile(fullPath);
    }
  }
  return res.status(404).send(`Screenshot ${safeFilename} not found`);
});

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    engine: 'AXIOS Bun Native Military-Grade Engine',
    message: 'AXIOS Executive License Control Armor Active',
    version: '3.0.0-PRO',
    securityLevel: 'MAXIMUM_HARDENED',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/stats',
      verifyKey: '/api/verify',
      auth: '/api/auth/login',
      keys: '/api/keys',
      users: '/api/users',
      analytics: '/api/analytics',
      deploy: '/api/deploy/status',
    },
  });
});

app.use('/api', routes);

app.use(errorHandler);

async function bootstrap() {
  try {
    initDatabase();
    app.listen(ENV.PORT, () => {
      console.log(`\n🚀 [AXIOS Bulletproof Server] Active on http://0.0.0.0:${ENV.PORT}`);
    });
  } catch (error) {
    console.error('[AXIOS Backend Fatal Startup Error]', error);
    process.exit(1);
  }
}

bootstrap();
