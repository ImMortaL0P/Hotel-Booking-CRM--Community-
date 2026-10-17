import { DummyInboxProvider } from './dummyInbox.js';
import { ImapInboxProvider } from './imapInbox.js';
import { InboxProvider } from './types.js';

export * from './types.js';
export { addDummyTestEmail } from './dummyInbox.js';

let provider: InboxProvider | null = null;

/**
 * EMAIL_INBOX_PROVIDER=imap (with IMAP_* set) reads the real mailbox;
 * anything else — including an imap setting with missing credentials —
 * falls back to the dummy inbox so the feature keeps working.
 */
export function getInboxProvider(): InboxProvider {
  if (provider) return provider;
  const wanted = (process.env.EMAIL_INBOX_PROVIDER || 'dummy').toLowerCase();
  if (wanted === 'imap') {
    if (ImapInboxProvider.isConfigured()) {
      provider = new ImapInboxProvider();
    } else {
      console.warn('[Email Import] EMAIL_INBOX_PROVIDER=imap but IMAP_HOST/IMAP_USER/IMAP_PASSWORD are not all set; using the dummy inbox.');
      provider = new DummyInboxProvider();
    }
  } else {
    provider = new DummyInboxProvider();
  }
  return provider;
}
