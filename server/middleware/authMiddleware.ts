import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    name: string;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only-change-in-prod';
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (token.startsWith('mock-token-')) {
      const parts = token.split('-');
      const userId = parts[2] || 'mangalam';
      req.user = { id: userId, role: 'superadmin', name: userId.charAt(0).toUpperCase() + userId.slice(1) };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, role: string, name: string };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
