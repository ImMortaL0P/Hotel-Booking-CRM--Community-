import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { InboxMessage, InboxProvider } from './types.js';

/**
 * Real mailbox over IMAP (Gmail, Outlook/Office 365, Zoho, cPanel, ...).
 *
 * Enabled with EMAIL_INBOX_PROVIDER=imap plus:
 *   IMAP_HOST, IMAP_PORT (993), IMAP_SECURE (true), IMAP_USER, IMAP_PASSWORD,
 *   IMAP_MAILBOX (INBOX), EMAIL_LOOKBACK_DAYS (14), EMAIL_MAX_MESSAGES (200)
 *
 * Gmail: enable IMAP and use an App Password (Google Account → Security →
 * App passwords), host imap.gmail.com. Messages are only read, never
 * modified or deleted; idempotency comes from the Message-ID.
 */
export class ImapInboxProvider implements InboxProvider {
  readonly id = 'imap';
  readonly label: string;

  constructor(private readonly cfg = {
    host: process.env.IMAP_HOST || '',
    port: Number(process.env.IMAP_PORT || 993),
    secure: (process.env.IMAP_SECURE || 'true') !== 'false',
    user: process.env.IMAP_USER || '',
    pass: process.env.IMAP_PASSWORD || '',
    mailbox: process.env.IMAP_MAILBOX || 'INBOX',
    lookbackDays: Number(process.env.EMAIL_LOOKBACK_DAYS || 14),
    maxMessages: Number(process.env.EMAIL_MAX_MESSAGES || 200)
  }) {
    this.label = cfg.user || 'IMAP inbox';
  }

  static isConfigured() {
    return !!(process.env.IMAP_HOST && process.env.IMAP_USER && process.env.IMAP_PASSWORD);
  }

  async fetchMessages(): Promise<InboxMessage[]> {
    const client = new ImapFlow({
      host: this.cfg.host,
      port: this.cfg.port,
      secure: this.cfg.secure,
      auth: { user: this.cfg.user, pass: this.cfg.pass },
      logger: false
    });

    await client.connect();
    const lock = await client.getMailboxLock(this.cfg.mailbox);
    try {
      const since = new Date(Date.now() - this.cfg.lookbackDays * 86400_000);
      const found = await client.search({ since }, { uid: true });
      const uids = (Array.isArray(found) ? found : []).slice(-this.cfg.maxMessages);
      if (uids.length === 0) return [];

      const messages: InboxMessage[] = [];
      for await (const msg of client.fetch(uids, { source: true, envelope: true, internalDate: true }, { uid: true })) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const internal = msg.internalDate ? new Date(msg.internalDate) : undefined;
        messages.push({
          messageId: parsed.messageId || `<imap-uid-${msg.uid}@${this.cfg.host}>`,
          from: parsed.from?.text || '',
          to: Array.isArray(parsed.to) ? parsed.to.map(t => t.text).join(', ') : parsed.to?.text,
          subject: parsed.subject || '',
          receivedAt: (parsed.date || internal || new Date()).toISOString(),
          text: parsed.text || undefined,
          html: typeof parsed.html === 'string' ? parsed.html : undefined
        });
      }
      return messages;
    } finally {
      lock.release();
      await client.logout().catch(() => {});
    }
  }
}
