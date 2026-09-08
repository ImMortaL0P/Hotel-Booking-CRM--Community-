import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only-change-in-prod';
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      res.status(400).json({ message: 'Please provide user ID and password' });
      return;
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      res.status(401).json({ message: 'Invalid User ID or Password' });
      return;
    }

    // @ts-ignore (comparePassword is a custom method)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid User ID or Password' });
      return;
    }

    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const verify = async (req: Request, res: Response): Promise<void> => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only-change-in-prod';
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, role: string, name: string };

    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
