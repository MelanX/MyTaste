import express from 'express';
import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import authRouter from '../src/routes/auth.js';
import bringRouter from '../src/routes/bring.js';
import collectionsRouter from '../src/routes/collections.js';
import recipesRouter from '../src/routes/recipes.js';
import importRouter from '../src/routes/import.js';
import uploadRouter from '../src/routes/upload.js';
import configRouter from '../src/routes/config.js';

export function makeApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', authRouter, bringRouter, collectionsRouter, recipesRouter, importRouter, uploadRouter, configRouter);
  // mimic global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => res.status(500).json({ message: err.message }));
  return app;
}

export function authHeader(): { Authorization: string } {
  const token = jwt.sign({ user: process.env.ADMIN_USER }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

  return { Authorization: `Bearer ${token}` };
}
