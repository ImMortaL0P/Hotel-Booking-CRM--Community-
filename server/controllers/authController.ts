import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';

const FALLBACK_USERS: Record<string, { pass: string; name: string; email: string; role: string }> = {
  'mangalam': { pass: 'Kukku404#', name: 'Mangalam', email: 'mangalam@shardapalace.in', role: 'superadmin' },
  'harsh': { pass: 'Harsh#123', name: 'Harsh Chandra', email: 'harsh@shardapalace.in', role: 'owner' },
  'arya': { pass: 'Ekta#143', name: 'Arya Chandra', email: 'arya@shardapalace.in', role: 'owner' },
  'frontdesk1': { pass: 'sharda#321', name: 'Front Desk', email: 'frontdesk@shardapalace.in', role: 'front-desk' }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-development-only-change-in-prod';
    const { userId, password } = req.body;
    
    if (!userId || !password) {
      res.status(400).json({ message: 'Please provide user ID and password' });
      return;
    }

    const normalizedId = String(userId).toLowerCase().trim();

    // Fast-path offline fallback check if MongoDB is disconnected
    if (mongoose.connection.readyState !== 1 && FALLBACK_USERS[normalizedId]) {
      const fb = FALLBACK_USERS[normalizedId];
      if (password === fb.pass) {
        const token = jwt.sign({ id: normalizedId, role: fb.role, name: fb.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
          token,
          user: {
            id: normalizedId,
            name: fb.name,
            email: fb.email,
            role: fb.role,
            avatar: ''
          }
        });
        return;
      }
    }

    let user: any = null;
    try {
      user = await User.findById(userId).select('+password').maxTimeMS(2500);
    } catch {
      // Fallback check on timeout/disconnect
      if (FALLBACK_USERS[normalizedId] && password === FALLBACK_USERS[normalizedId].pass) {
        const fb = FALLBACK_USERS[normalizedId];
        const token = jwt.sign({ id: normalizedId, role: fb.role, name: fb.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
          token,
          user: { id: normalizedId, name: fb.name, email: fb.email, role: fb.role, avatar: '' }
        });
        return;
      }
    }

    if (!user) {
      if (FALLBACK_USERS[normalizedId] && password === FALLBACK_USERS[normalizedId].pass) {
        const fb = FALLBACK_USERS[normalizedId];
        const token = jwt.sign({ id: normalizedId, role: fb.role, name: fb.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
          token,
          user: { id: normalizedId, name: fb.name, email: fb.email, role: fb.role, avatar: '' }
        });
        return;
      }
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

    const normalizedId = String(decoded.id).toLowerCase();
    if (FALLBACK_USERS[normalizedId]) {
      const fb = FALLBACK_USERS[normalizedId];
      res.json({
        user: {
          id: normalizedId,
          name: fb.name,
          email: fb.email,
          role: fb.role,
          avatar: ''
        }
      });
      return;
    }

    try {
      const user = await User.findById(decoded.id).maxTimeMS(2500);
      if (user) {
        res.json({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar
          }
        });
        return;
      }
    } catch {}

    res.json({
      user: {
        id: decoded.id,
        name: decoded.name || 'Staff Member',
        email: `${decoded.id}@hotelshardapalace.com`,
        role: decoded.role || 'manager',
        avatar: ''
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
