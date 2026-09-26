# ShardaCRM Express Backend

This directory contains the Express + Mongoose REST API backend to support data persistence for ShardaCRM.

## Prerequisites
1. A MongoDB Atlas cluster (or local MongoDB database).

## Setup
1. Create a `.env` file in this directory based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in your `MONGODB_URI`.

## Scripts
- **Start server**: `npm run dev`
- **Seed database**: `npm run seed` (Clears current DB and initializes with project mock data)
- **Check the booking-email parser**: `npm run test:email-parser`

## Email booking import

Without OTA channel-manager API access, bookings are read from the booking
confirmation emails that Booking.com, Agoda, MakeMyTrip/Goibibo, Airbnb and the
website send. The **Email Import** page in the app syncs the inbox. Each email
becomes a confirmed booking with an assigned room (so it shows on the calendar
and bookings list), a guest profile (matched by phone or email), a prepaid
receipt when the OTA collected payment, and a commission expense. Modification
emails update the booking; cancellation emails cancel it, release the room,
remove the commission and mark the prepayment refunded. Every email is recorded
once, by Message-ID, so syncing again never creates duplicates. Emails the
parser can't read fully (for example, a missing check-out date) are marked
**Needs review** rather than guessed.

By default the server uses a **dummy inbox** of sample OTA emails
(`services/emailInbox/dummyInbox.ts`), plus an "Add test email" button. To
switch to the real mailbox, set these in `.env` (or in Render → Environment):

```bash
EMAIL_INBOX_PROVIDER=imap
IMAP_HOST=imap.gmail.com        # Outlook: outlook.office365.com, Zoho: imap.zoho.in
IMAP_PORT=993
IMAP_USER=bookings@yourhotel.com
IMAP_PASSWORD=your-app-password # Gmail: enable IMAP, then create an App Password
EMAIL_SYNC_INTERVAL_MINUTES=15  # optional; 15 by default for IMAP, 0 = manual only
```

The mailbox is only read, never modified. Code map:
`services/emailBookingParser.ts` (email → booking fields),
`services/emailImportService.ts` (room allocation, guests, bookings, ledger),
`services/emailInbox/` (dummy and IMAP providers), `models/EmailImport.ts`
(import log).
