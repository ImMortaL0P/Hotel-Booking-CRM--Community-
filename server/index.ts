import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env before importing routes that depend on it!
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

import compression from 'compression';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db.js';
import apiRoutes from './routes/api.js';
import channelRoutes from './routes/channel.js';
import authRoutes from './routes/auth.js';
import { startEmailSyncScheduler } from './services/emailImportService.js';

const PORT = process.env.PORT || 5000;

// Initialize express
const app = express();

// Security Middleware: Helmet sets various HTTP headers for security
app.use(helmet());

// Cross-Origin Resource Sharing (CORS) Security
// We use process.env so when handing off to a client, you just change the Render environment variable.
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://hotel-booking-crm-community.vercel.app',
  'http://localhost:5173' // keep local dev enabled
];

app.use(cors({
  origin: function (origin, callback) {
    // Determine if it's local network dev dynamically
    const isDevNetwork = process.env.NODE_ENV !== 'production' && origin?.startsWith('http://192.168');

    if (!origin || allowedOrigins.includes(origin) || isDevNetwork) {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Access Blocked'));
    }
  },
  credentials: true
}));

// Global Rate Limiting to prevent Brute Force & DDoS attacks
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // limit each IP to 1500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Brute-force protection for the login form only. It used to cover all of
// /api/auth — including /verify, which runs on every page load — so a few
// staff sharing the hotel's IP got locked out after 15 page loads. Only
// failed attempts count now.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // strictly limit failed login attempts
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' }
});

app.use(compression());
// 10mb body limit: P&L / invoice export HTML documents (a multi-month report's
// ledger detail can exceed the default 100kb) are POSTed here as JSON.
app.use(express.json({ limit: '10mb' }));

// Public Health Check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  let dbStatusStr = 'Disconnected';
  if (dbState === 1) dbStatusStr = 'Connected';
  else if (dbState === 2) dbStatusStr = 'Connecting';
  else if (dbState === 3) dbStatusStr = 'Disconnecting';

  res.json({
    status: 'ok',
    msg: 'ShardaCRM Backend is running securely',
    dbState: dbState,
    dbStatus: dbStatusStr,
    timestamp: new Date().toISOString()
  });
});

// Routes
// Apply rate limiter to API routes only
app.post('/api/auth/login', authLimiter);
app.use('/api/auth', globalLimiter, authRoutes);
app.use('/api', globalLimiter, apiRoutes);
app.use('/api/channel', channelRoutes); // channel webhook has its own specific rate limits in middleware

// Serve static frontend files continuously in production
const distPath = path.join(__dirname, '../dist');
// Vite emits content-hashed filenames under /assets, so they can be cached
// forever; index.html must always revalidate so new deploys are picked up.
app.use('/assets', express.static(path.join(distPath, 'assets'), { maxAge: '1y', immutable: true }));
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// Fallback to index.html for React Router
app.get("*", (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    // Listen on all network interfaces (0.0.0.0) so it's accessible over network
    startEmailSyncScheduler();
    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API securely restricted to ${process.env.FRONTEND_URL || 'https://hotel-booking-crm-community.vercel.app'}`);
    });
  });
}

export default app;
