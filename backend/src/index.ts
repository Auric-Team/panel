import express from 'express';
import cors from 'cors';
import { initDb } from './db/sqlite';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.set('trust proxy', 1);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

app.use(express.json());

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
