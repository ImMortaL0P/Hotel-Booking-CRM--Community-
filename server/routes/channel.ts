import express from 'express';
import { Request, Response } from 'express';
import { channelAuth, channelRateLimiter } from '../middleware/channelAuth.js';
import { processChannelWebhook } from '../controllers/channelController.js';

const router = express.Router();

// Apply rate limiting to all channel routes
router.use(channelRateLimiter);

// Health check endpoint for channel managers
router.post('/ping', channelAuth, (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ShardaCRM Channel Webhook Receiver Active' });
});

// Incoming reservation webhook from channel manager
router.post('/reservation', channelAuth, processChannelWebhook);

export default router;
