import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { importGeneric } from '../utils/importer.js';
import authenticateToken from '../middleware/auth.js';
import { importSchema } from '../utils/schemes.js';

const router = express.Router();

router.post('/import', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = importSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        message: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }

    const { url } = value;
    try {
      const recipe = await importGeneric(url);
      res.json(recipe);
    } catch (err) {
      return res.status(400).json({
        message: 'Import failed',
        details: [(err as Error).message],
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;
