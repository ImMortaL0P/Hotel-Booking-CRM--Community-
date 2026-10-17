/** A single email as read from any inbox provider (dummy, IMAP, ...). */
export interface InboxMessage {
  /** Stable, globally unique id (RFC 5322 Message-ID for real mail). Used for idempotency. */
  messageId: string;
  from: string;
  to?: string;
  subject: string;
  /** ISO timestamp the message was received */
  receivedAt: string;
  /** Plain-text body (preferred for parsing) */
  text?: string;
  /** HTML body, used when there is no plain-text part */
  html?: string;
}

export interface InboxProvider {
  /** Machine id: 'dummy' | 'imap' */
  readonly id: string;
  /** Human label for the UI, e.g. "Dummy inbox" or "bookings@hotel.com" */
  readonly label: string;
  /** Return recent messages. Already-processed ones are filtered by the importer. */
  fetchMessages(): Promise<InboxMessage[]>;
}
