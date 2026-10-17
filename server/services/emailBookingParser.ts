import { InboxMessage } from './emailInbox/types.js';

/**
 * Turns an OTA / website booking email into structured booking data.
 *
 * Deliberately rule-based (labels + regexes) rather than per-template: OTAs
 * tweak their layouts often, and every label here has several aliases. The
 * result says what's missing so the importer can flag an email for review
 * instead of guessing.
 */

export type EmailBookingAction = 'NEW' | 'MODIFY' | 'CANCEL';
export type EmailBookingSource = 'Booking.com' | 'Agoda' | 'MakeMyTrip' | 'Airbnb' | 'Website' | 'Other';

export interface ParsedEmailBooking {
  action: EmailBookingAction;
  source: EmailBookingSource;
  channelBookingId?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  /** YYYY-MM-DDTHH:mm (local hotel time) */
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  rooms: number;
  roomType?: string;
  roomCategory?: 'Double Bed Room' | 'Family Bed Room';
  totalAmount?: number;
  commission?: number;
  prepaid: boolean;
  bookerCountry?: string;
  specialRequests?: string;
}

export type ParseResult =
  | { kind: 'booking'; data: ParsedEmailBooking; missing: string[] }
  | { kind: 'ignored'; reason: string };

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
};

const DEFAULT_CHECKIN_TIME = '12:00';
const DEFAULT_CHECKOUT_TIME = '11:00';

// ---------------------------------------------------------------- text utils

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", rsquo: "'", ndash: '–', mdash: '—', '#8377': '₹', inr: '₹' };

/** HTML → text that keeps table cells as "label : value" on one line */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, ' : ')
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-z0-9#]+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : m));
}

function toLines(msg: InboxMessage): string[] {
  const raw = msg.text?.trim() ? msg.text : htmlToText(msg.html || '');
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .map(l => l.replace(/[\t  ]+/g, ' ').trim())
    .filter(Boolean);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Value for the first matching label. Supports "Label: value", "Label - value",
 * "Label (note): value" and Airbnb-style "Label" with the value on the next line.
 */
function field(lines: string[], labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(`^${escapeRe(label)}\\s*(?:\\([^)]*\\))?\\s*(?:[:|–—-]\\s*(.*)|$)`, 'i');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re);
      if (!m) continue;
      const v = (m[1] ?? '').trim();
      if (v) return v;
      if (i + 1 < lines.length) return lines[i + 1].trim();
    }
  }
  return undefined;
}

// ------------------------------------------------------------ value parsers

/** Day-first (Indian) for numeric dates; month names in either order. */
export function parseDate(s: string | undefined): { date: string; time?: string } | undefined {
  if (!s) return undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  const build = (y: number, m: number, d: number) => {
    if (!y || m < 1 || m > 12 || d < 1 || d > 31) return undefined;
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1) return undefined; // e.g. 31 Feb
    return `${y}-${pad(m)}-${pad(d)}`;
  };

  let date: string | undefined;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/))) date = build(+m[1], +m[2], +m[3]);
  else if ((m = s.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/))) date = build(+m[3], +m[2], +m[1]);
  else {
    // "3 October 2026", "03-Oct-2026"
    for (const x of s.matchAll(/(\d{1,2})(?:st|nd|rd|th)?[\s-]+([A-Za-z]{3,9})\.?[\s,-]+(\d{4})/g)) {
      const mon = MONTHS[x[2].toLowerCase()];
      if (mon) { date = build(+x[3], mon, +x[1]); break; }
    }
    // "Oct 3, 2026", "October 3 2026"
    if (!date) for (const x of s.matchAll(/([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/g)) {
      const mon = MONTHS[x[1].toLowerCase()];
      if (mon) { date = build(+x[3], mon, +x[2]); break; }
    }
  }
  if (!date) return undefined;

  let time: string | undefined;
  let h: number | undefined, min = 0, ampm = '';
  let t = s.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (t) { h = +t[1]; min = +t[2]; ampm = (t[3] || '').toLowerCase(); }
  else if ((t = s.match(/\b(\d{1,2})\s*(am|pm)\b/i))) { h = +t[1]; ampm = t[2].toLowerCase(); }
  if (h !== undefined) {
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h < 24 && min < 60) time = `${pad(h)}:${pad(min)}`;
  }
  return { date, time };
}

export function parseAmount(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/(?<=\d),(?=\d)/g, '').match(/(\d+(?:\.\d+)?)/);
  if (!m) return undefined;
  const n = Math.round(parseFloat(m[1]) * 100) / 100;
  return Number.isFinite(n) ? n : undefined;
}

export function normalizePhone(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const digits = s.replace(/\D/g, '');
  if (digits.length < 8) return undefined;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());

// ------------------------------------------------------------ classification

function detectSource(from: string, subject: string): EmailBookingSource {
  const f = `${from} ${subject}`.toLowerCase();
  if (f.includes('booking.com')) return 'Booking.com';
  if (f.includes('agoda')) return 'Agoda';
  if (f.includes('makemytrip') || f.includes('goibibo') || /\bmmt\b/.test(f)) return 'MakeMyTrip';
  if (f.includes('airbnb')) return 'Airbnb';
  if (f.includes('website') || f.includes('shardapalace')) return 'Website';
  return 'Other';
}

function detectAction(subject: string, body: string): EmailBookingAction | undefined {
  const s = subject.toLowerCase();
  const b = body.toLowerCase();
  if (/cancel/.test(s) || /\b(booking|reservation) (has been|was) cancel/.test(b)) return 'CANCEL';
  if (/modif|amend|changed|updated/.test(s) || /\b(booking|reservation) (has been|was) (modified|amended|changed)/.test(b)) return 'MODIFY';
  if (/new booking|booking confirm|reservation confirm|booking request|new reservation|confirmed/.test(s)) return 'NEW';
  return undefined;
}

// --------------------------------------------------------------------- main

export function parseBookingEmail(msg: InboxMessage): ParseResult {
  const lines = toLines(msg);
  const body = lines.join('\n');
  const action = detectAction(msg.subject, body);
  if (!action) return { kind: 'ignored', reason: 'Not a booking, modification or cancellation email' };

  const source = detectSource(msg.from, msg.subject);

  let channelBookingId = field(lines, [
    'booking number', 'booking no', 'booking no.', 'booking id', 'booking reference', 'reservation number',
    'reservation id', 'reservation no', 'confirmation code', 'confirmation number', 'itinerary number', 'itinerary id'
  ])?.match(/[A-Za-z0-9-]{4,}/)?.[0];
  if (!channelBookingId) channelBookingId = msg.subject.match(/(?:\(|#|id\s*:?\s*)([A-Za-z0-9-]{6,})\)?/i)?.[1];

  let guestName = field(lines, ['guest name', 'primary guest', 'lead guest', 'guest', 'customer name', 'booker name', 'name']);
  if (!guestName) {
    const first = field(lines, ['customer first name', 'guest first name', 'first name']);
    const last = field(lines, ['customer last name', 'guest last name', 'last name']);
    if (first || last) guestName = [first, last].filter(Boolean).join(' ');
  }
  guestName = guestName ? titleCase(guestName.replace(/\s+/g, ' ').trim()) : undefined;

  const guestPhone = normalizePhone(field(lines, ['phone', 'phone number', 'mobile', 'mobile number', 'contact', 'contact number', 'telephone', 'guest phone']));
  const guestEmail = field(lines, ['guest email', 'email', 'email address', 'e-mail'])?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0]?.toLowerCase();

  const inRaw = parseDate(field(lines, ['check-in', 'check in', 'checkin', 'arrival', 'arrival date', 'check-in date']));
  const outRaw = parseDate(field(lines, ['check-out', 'check out', 'checkout', 'departure', 'departure date', 'check-out date']));
  const checkIn = inRaw ? `${inRaw.date}T${inRaw.time || DEFAULT_CHECKIN_TIME}` : undefined;
  const checkOut = outRaw ? `${outRaw.date}T${outRaw.time || DEFAULT_CHECKOUT_TIME}` : undefined;

  const guestsLine = field(lines, ['guests', 'number of guests', 'occupancy', 'pax']) || '';
  const num = (v?: string) => (v && /\d/.test(v) ? parseInt(v.match(/\d+/)![0], 10) : undefined);
  const adults = num(field(lines, ['adults', 'no. of adults', 'number of adults']))
    ?? num(guestsLine.match(/(\d+)\s*adults?/i)?.[1])
    ?? (/^\d+$/.test(guestsLine.trim()) ? parseInt(guestsLine, 10) : undefined);
  const children = num(field(lines, ['children', 'no. of children', 'number of children', 'kids']))
    ?? num(guestsLine.match(/(\d+)\s*(?:child|children|kids?)/i)?.[1])
    ?? (adults !== undefined ? 0 : undefined);

  const roomType = field(lines, ['room type', 'room', 'unit type', 'room category', 'accommodation']);
  const rooms = num(field(lines, ['number of rooms', 'no. of rooms', 'rooms']))
    ?? num(roomType?.match(/^(\d+)\s*x\s/i)?.[1])
    ?? 1;
  const roomTypeClean = roomType?.replace(/^\d+\s*x\s*/i, '').trim();
  const roomCategory: ParsedEmailBooking['roomCategory'] =
    roomTypeClean && /family|triple|quad|suite/i.test(roomTypeClean) ? 'Family Bed Room'
      : roomTypeClean ? 'Double Bed Room'
      : (adults ?? 0) > 2 ? 'Family Bed Room'
      : 'Double Bed Room';

  const totalAmount = parseAmount(field(lines, [
    'total price', 'total amount', 'total booking amount', 'total', 'grand total', 'booking amount',
    'amount', 'price', 'total payable', 'amount payable'
  ]));
  const commission = parseAmount(field(lines, ['commission', 'mmt commission', 'commission amount', 'host service fee', 'service fee']));

  const payText = `${field(lines, ['payment', 'payment mode', 'payment model', 'payment type', 'payment status']) || ''}\n${body}`;
  const payAtHotel = /pay(ment)? at (the )?(hotel|property)|pay on arrival|to be collected at (the )?(hotel|property)/i.test(payText);
  const prepaid = !payAtHotel && /prepaid|paid online|agoda collect|fully paid|already paid|payment collected by|payout/i.test(payText);

  const data: ParsedEmailBooking = {
    action, source, channelBookingId, guestName, guestPhone, guestEmail, checkIn, checkOut,
    adults, children, rooms: Math.max(1, Math.min(rooms, 10)), roomType: roomTypeClean, roomCategory,
    totalAmount, commission, prepaid,
    bookerCountry: field(lines, ['booker country', 'country']),
    specialRequests: field(lines, ['special requests', 'special request', 'remarks', 'guest request', 'notes'])
  };

  const missing: string[] = [];
  if (!channelBookingId) missing.push('booking reference');
  if (action !== 'CANCEL') {
    if (!guestName) missing.push('guest name');
    if (!checkIn) missing.push('check-in date');
    if (!checkOut) missing.push('check-out date');
    if (checkIn && checkOut && checkOut.slice(0, 10) <= checkIn.slice(0, 10)) missing.push('check-out after check-in');
    if (totalAmount === undefined) missing.push('total amount');
  }
  return { kind: 'booking', data, missing };
}
