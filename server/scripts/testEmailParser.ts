/**
 * Self-check for the booking-email parser: `npm run test:email-parser`.
 * Runs every email in the dummy inbox through the parser and asserts the
 * extracted fields. When the real inbox is connected, add a sample of each
 * OTA's email here to lock the format in.
 */
import assert from 'node:assert/strict';
import { DummyInboxProvider } from '../services/emailInbox/dummyInbox.js';
import { parseBookingEmail, parseDate, parseAmount, normalizePhone } from '../services/emailBookingParser.js';

let passed = 0;
const check = (name: string, fn: () => void) => {
  try { fn(); passed++; } catch (e: any) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; }
};

// Value parsers
check('dates', () => {
  assert.equal(parseDate('Friday, 3 October 2026 (from 12:00)')?.date, '2026-10-03');
  assert.equal(parseDate('Friday, 3 October 2026 (from 12:00)')?.time, '12:00');
  assert.equal(parseDate('03-Oct-2026')?.date, '2026-10-03');
  assert.equal(parseDate('Fri, Oct 3, 2026 2:00 PM')?.time, '14:00');
  assert.equal(parseDate('03/10/2026')?.date, '2026-10-03'); // day-first
  assert.equal(parseDate('2026-10-03')?.date, '2026-10-03');
  assert.equal(parseDate('31 February 2026'), undefined);
});
check('amounts', () => {
  assert.equal(parseAmount('₹ 4,480'), 4480);
  assert.equal(parseAmount('INR 6,200.00'), 6200);
  assert.equal(parseAmount('Rs. 2350'), 2350);
});
check('phones', () => {
  assert.equal(normalizePhone('+91 98310 22114'), '9831022114');
  assert.equal(normalizePhone('09876501234'), '9876501234');
});

// Whole emails
const msgs = await new DummyInboxProvider().fetchMessages();
const byId = (id: string) => parseBookingEmail(msgs.find(m => m.messageId.includes(id))!);

check('Booking.com new (plain text)', () => {
  const r = byId('bdc-4012345678-new');
  assert.equal(r.kind, 'booking');
  if (r.kind !== 'booking') return;
  assert.deepEqual(r.missing, []);
  assert.equal(r.data.action, 'NEW');
  assert.equal(r.data.source, 'Booking.com');
  assert.equal(r.data.channelBookingId, '4012345678');
  assert.equal(r.data.guestName, 'Rahul Sharma');
  assert.equal(r.data.guestPhone, '9831022114');
  assert.equal(r.data.adults, 2);
  assert.equal(r.data.children, 1);
  assert.equal(r.data.totalAmount, 4480);
  assert.equal(r.data.commission, 672);
  assert.equal(r.data.prepaid, true);
  assert.match(r.data.checkIn!, /T12:00$/);
  assert.match(r.data.checkOut!, /T11:00$/);
});
check('Agoda new (HTML table, first/last name)', () => {
  const r = byId('agoda-987654321');
  assert.equal(r.kind, 'booking');
  if (r.kind !== 'booking') return;
  assert.equal(r.data.guestName, 'Priya Verma');
  assert.equal(r.data.roomCategory, 'Family Bed Room');
  assert.equal(r.data.totalAmount, 6200);
  assert.equal(r.data.prepaid, true);
  assert.equal(r.data.specialRequests, 'Non-smoking room please');
});
check('MakeMyTrip new (pay at hotel)', () => {
  const r = byId('mmt-NH7812345678');
  assert.equal(r.kind, 'booking');
  if (r.kind !== 'booking') return;
  assert.equal(r.data.source, 'MakeMyTrip');
  assert.equal(r.data.prepaid, false);
  assert.equal(r.data.rooms, 1);
});
check('Airbnb new (label and value on separate lines)', () => {
  const r = byId('airbnb-HMQX4K2P9A');
  assert.equal(r.kind, 'booking');
  if (r.kind !== 'booking') return;
  assert.equal(r.data.channelBookingId, 'HMQX4K2P9A');
  assert.equal(r.data.guestName, 'Sneha Iyer');
  assert.match(r.data.checkIn!, /T14:00$/);
  assert.equal(r.data.totalAmount, 7500);
});
check('Website request (DD/MM/YYYY)', () => {
  const r = byId('web-1043');
  assert.equal(r.kind, 'booking');
  if (r.kind !== 'booking') return;
  assert.equal(r.data.source, 'Website');
  assert.equal(r.data.channelBookingId, 'WEB-1043');
});
check('modification and cancellation', () => {
  const m = byId('4012345678-modify');
  const c = byId('4019998888-cancel');
  assert.ok(m.kind === 'booking' && m.data.action === 'MODIFY' && m.data.totalAmount === 6720);
  assert.ok(c.kind === 'booking' && c.data.action === 'CANCEL' && c.data.channelBookingId === '4019998888' && c.missing.length === 0);
});
check('incomplete email is flagged, promo is ignored', () => {
  const r = byId('NH7899990000');
  assert.ok(r.kind === 'booking' && r.missing.includes('check-out date'));
  assert.equal(byId('partner-newsletter').kind, 'ignored');
});

console.log(`${passed} checks passed${process.exitCode ? ', some FAILED' : ''}`);
