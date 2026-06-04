import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { revoke, isRevoked } from '../utils/tokenStore.js';

import { loginSchema } from '../utils/schemes.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function safeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

const isDev = process.env.NODE_ENV !== 'production';

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: !isDev,
    ...(isDev ? {} : { sameSite: 'strict' as const }),
    expires: new Date(Date.now() + maxAgeMs),
    path: '/',
  };
}

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { value, error } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        message: 'Bad request',
      });
    }

    const { ADMIN_USER, ADMIN_PASS, JWT_SECRET } = process.env;

    const userOk = safeEqual(value.username, ADMIN_USER);
    const passwordOk = safeEqual(value.password, ADMIN_PASS);

    if (!userOk || !passwordOk) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay to prevent brute force attacks
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign({ user: value.username }, JWT_SECRET as string, { expiresIn: '15m' });

    const refreshToken = jwt.sign({ user: value.username }, process.env.JWT_REFRESH_SECRET || (JWT_SECRET as string), {
      expiresIn: '30d',
      jwtid: randomUUID(),
    });

    return res
      .cookie('access_token', accessToken, cookieOptions(15 * 60 * 1000))
      .cookie('refresh_token', refreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000))
      .json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const old = req.cookies['refresh_token'];
  if (!old) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  jwt.verify(
    old,
    process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string),
    async (err: jwt.VerifyErrors | null, decoded?: object | string) => {
      const payload = decoded as jwt.JwtPayload;
      if (err || (await isRevoked(payload.jti as string))) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      await revoke(payload.jti as string, (payload.exp as number) * 1000);

      const newRefreshToken = jwt.sign({ user: payload.user }, process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string), {
        expiresIn: '30d',
        jwtid: randomUUID(),
      });
      const accessToken = jwt.sign({ user: payload.user }, process.env.JWT_SECRET as string, { expiresIn: '15m' });

      return res
        .cookie('refresh_token', newRefreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000))
        .cookie('access_token', accessToken, cookieOptions(15 * 60 * 1000))
        .json({ success: true });
    },
  );
});

router.post('/logout', async (req: Request, res: Response) => {
  const refreshToken = req.cookies['refresh_token'];

  if (refreshToken) {
    try {
      const { jti, exp } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET as string)) as jwt.JwtPayload;

      await revoke(jti as string, (exp as number) * 1000);
    } catch {
      /* ignore */
    }
  }

  res.clearCookie('access_token').clearCookie('refresh_token').status(204).end();
});

export default router;
