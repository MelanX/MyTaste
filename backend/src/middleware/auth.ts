import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: unknown;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.['access_token'] || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);

  if (!token) {
    res.status(401).json({
      message: 'Unauthorized',
      details: ['No credentials provided'],
    });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: jwt.VerifyErrors | null, payload?: object | string) => {
    if (err) {
      res.status(403).json({
        message: 'Unauthorized',
        details: ['Invalid credentials'],
      });
      return;
    }
    req.user = (payload as jwt.JwtPayload).user;
    next();
  });
}

export default authenticateToken;
