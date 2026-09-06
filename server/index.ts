import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const PORT = process.env.PORT || 5000;

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  let dbStatusStr = 'Disconnected';
  if (dbState === 1) dbStatusStr = 'Connected';
  else if (dbState === 2) dbStatusStr = 'Connecting';
  else if (dbState === 3) dbStatusStr = 'Disconnecting';

  res.json({
    status: 'ok',
    msg: 'ShardaCRM Backend is running',
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
      console.log(`Accessible on your local network/internet if exposed`);
    });
  });
}

export default app;
