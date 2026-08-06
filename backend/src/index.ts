import express from 'express';
import cors from 'cors';
import { initDb } from './db/sqlite';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.set('trust proxy', true);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Root status endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'AXIOS Executive Control Server Running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/stats',
      verifyKey: '/api/verify',
      auth: '/api/auth/login',
      keys: '/api/keys',
      users: '/api/users'
    }
  });
});

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 20067;

async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`[Axios Backend] Express & SQLite server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
