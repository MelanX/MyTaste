import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

import authenticateToken from './middleware/auth.js';
import authRouter from './routes/auth.js';
import bringRouter from './routes/bring.js';
import collectionsRouter from './routes/collections.js';
import configRouter from './routes/config.js';
import recipesRouter from './routes/recipes.js';
import importRouter from './routes/import.js';
import uploadRouter from './routes/upload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (process.env.NODE_ENV !== 'production') return callback(null, origin);
      if (!origin) return callback(null, true);
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }

      console.warn(`Blocked CORS for origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(cookieParser());
app.use(compression());
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Health check (no auth required)
app.get('/api/health', (req: Request, res: Response) => res.json({ status: 'ok' }));

// Mount routers
app.use('/api', authRouter);
app.use('/api', configRouter);
app.use('/api', bringRouter);

if (process.env.REQUIRE_LOGIN === 'true') {
  app.use('/api', authenticateToken);
}

app.use('/api', collectionsRouter);
app.use('/api', recipesRouter);
app.use('/api', importRouter);
app.use('/api', uploadRouter);
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve the built frontend (present in the combined production image; absent in local dev,
// where the Vite dev server on :5173 serves the frontend instead).
const FRONTEND_DIR = path.join(__dirname, '..', 'public');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
  app.get(/^(?!\/api\/|\/uploads\/).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

// Default error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Server error');
});

export { app };
export default app;
