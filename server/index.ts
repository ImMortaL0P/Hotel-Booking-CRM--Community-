import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './db.js';
import apiRoutes from './routes/api.js';
import channelRoutes from './routes/channel.js';
import authRoutes from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
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
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://192.168')) {
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

app.use(compression());
app.use(express.json());

// Routes
// Apply rate limiter to API routes only
app.use('/api', globalLimiter, apiRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/channel', channelRoutes); // channel webhook has its own specific rate limits in middleware


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

// Serve static frontend files continuously in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback to index.html for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    // Listen on all network interfaces (0.0.0.0) so it's accessible over network
    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API securely restricted to ${process.env.FRONTEND_URL || 'https://hotel-booking-crm-community.vercel.app'}`);
    });
  });
}

export default app;
