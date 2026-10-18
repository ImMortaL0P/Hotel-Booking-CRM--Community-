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
    // In development or local testing, permit all local / LAN origins
    const isDev = process.env.NODE_ENV !== 'production';
    const isLocal = !origin || 
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      origin.startsWith('http://192.168') || 
      origin.startsWith('http://172.') || 
      origin.startsWith('http://10.');

    if (isDev && isLocal) {
      return callback(null, true);
    }

    if (!origin || allowedOrigins.includes(origin)) {
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

import fs from 'fs';

app.use(compression({
  threshold: 512,
  filter: (req, res) => {
    // If client already received a precompressed file, don't re-compress
    if (res.getHeader('Content-Encoding')) return false;
    return compression.filter(req, res);
  }
}));
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

// MIME mapping for pre-compressed static files
const MIME_TYPES: Record<string, string> = {
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.html': 'text/html; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

// High-speed static handler for precompressed (.br / .gz) bundles
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  
  const acceptEncoding = (req.headers['accept-encoding'] || '') as string;
  const reqUrl = req.path === '/' ? '/index.html' : req.path;
  const ext = path.extname(reqUrl).toLowerCase();

  if (['.js', '.css', '.html', '.svg', '.json'].includes(ext)) {
    const rawPath = path.join(distPath, reqUrl);
    const brPath = `${rawPath}.br`;
    const gzPath = `${rawPath}.gz`;
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    // Brotli priority (highest compression)
    if (acceptEncoding.includes('br') && fs.existsSync(brPath)) {
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Encoding', 'br');
      res.setHeader('Vary', 'Accept-Encoding');
      if (reqUrl.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
      return res.sendFile(brPath);
    }

    // Gzip fallback
    if (acceptEncoding.includes('gzip') && fs.existsSync(gzPath)) {
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      if (reqUrl.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
      return res.sendFile(gzPath);
    }
  }

  next();
});

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
  const acceptEncoding = (req.headers['accept-encoding'] || '') as string;
  const htmlBr = path.join(distPath, 'index.html.br');
  const htmlGz = path.join(distPath, 'index.html.gz');

  if (acceptEncoding.includes('br') && fs.existsSync(htmlBr)) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Encoding', 'br');
    res.setHeader('Vary', 'Accept-Encoding');
    return res.sendFile(htmlBr);
  }
  if (acceptEncoding.includes('gzip') && fs.existsSync(htmlGz)) {
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    return res.sendFile(htmlGz);
  }

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
