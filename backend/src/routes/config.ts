import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import authenticateToken from '../middleware/auth.js';
import { readImportConfig, modifyImportConfig } from '../utils/fileService.js';
import { configSchema } from '../utils/schemes.js';

const router = express.Router();

router.get('/config', (req: Request, res: Response) => {
  res.json({
    requireLogin: ['true', '1', 'yes', 'on'].includes(process.env.REQUIRE_LOGIN?.trim().toLowerCase() || 'false'),
  });
});

router.get('/config-rules', async (req: Request, res: Response) => {
  const data = await readImportConfig();
  res.json(data);
});

async function patchConfigRules(req: Request, res: Response, next: NextFunction) {
  try {
    // validate the incoming patch itself
    const { error: patchErr } = configSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (patchErr) {
      const invalid = patchErr.details.find((d) => d.context?.invalid)?.context?.invalid || [];
      return res.status(400).json({
        message: 'Validation failed',
        details: invalid.length ? invalid : patchErr.details,
      });
    }

    // merge with current config, then validate the whole thing
    let mergeError: import('joi').ValidationError | null = null;
    const savedConfig = await modifyImportConfig((currentConfig) => {
      const mergedConfig = { ...currentConfig, ...req.body };
      const { error, value: validConfig } = configSchema.validate(mergedConfig, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        mergeError = error;
        return null;
      }
      return validConfig;
    });
    if (mergeError) {
      const err = mergeError as import('joi').ValidationError;
      const invalid = err.details.find((d) => d.context?.invalid)?.context?.invalid || [];
      return res.status(400).json({
        message: 'Validation failed',
        details: invalid.length ? invalid : err.details,
      });
    }
    res.json(savedConfig);
  } catch (err) {
    next(err);
  }
}

router.patch('/config-rules', authenticateToken, patchConfigRules);

// deprecated
router.get('/importer-config', async (req: Request, res: Response) => {
  const data = await readImportConfig();
  res.json(data);
});

router.patch('/importer-config', authenticateToken, patchConfigRules);

export default router;
