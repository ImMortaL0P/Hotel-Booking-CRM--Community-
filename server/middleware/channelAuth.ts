import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ChannelConfig } from '../models/ChannelConfig.js';
import { randomUUID } from 'crypto';
import { Log } from '../models/Log.js';

// Basic rate limiter for channel endpoints (e.g. max 100 requests per 15 minutes)
export const channelRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many channel requests, please try again later.' }
});

export const channelAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await ChannelConfig.findById('default');

    if (!config || !config.isActive) {
      return res.status(403).json({ error: 'Channel integration is not active' });
    }

    // Expect the channel manager to send the webhook secret in a header
    const providedSecret = req.headers['x-channel-webhook-secret'] || req.headers['x-api-key'];

    if (!providedSecret || providedSecret !== config.webhookSecret) {
      // Log failed auth for security monitoring
      try {
        await Log.create({
          _id: `LOG-${randomUUID().slice(0, 8).toUpperCase()}`,
          action: 'Channel Auth Failed',
          details: `Failed webhook authentication attempt from IP: ${req.ip}`,
          userId: 'system',
          userName: 'System Auto',
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.error('Failed to log channel auth failure:', logErr);
      }

      return res.status(401).json({ error: 'Unauthorized channel connection' });
    }

    // Optional IP whitelist validation
    if (config.ipWhitelist && config.ipWhitelist.length > 0) {
      const clientIp = req.ip || req.socket.remoteAddress || '';
      // A more robust IP check might be needed for production behind proxies
      if (!config.ipWhitelist.includes(clientIp) && !config.ipWhitelist.includes('*')) {
        return res.status(403).json({ error: 'IP address not whitelisted for channel connections' });
      }
    }

    // Auth succeeded
    next();
  } catch (error) {
    console.error('Channel auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during channel authentication' });
  }
};
