import { randomUUID } from 'crypto';
import { Booking } from '../models/Booking.js';
import { Guest } from '../models/Guest.js';
import { Room } from '../models/Room.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { Log } from '../models/Log.js';
import { EmailImport } from '../models/EmailImport.js';
import { getInboxProvider, InboxMessage } from './emailInbox/index.js';
import { parseBookingEmail, htmlToText, normalizePhone, ParsedEmailBooking } from './emailBookingParser.js';
import { pushAvailability } from './channelManagerService.js';

/**
 * Email → CRM importer. Stands in for the OTA channel-manager API: reads
 * booking / modification / cancellation emails and turns them into real
 * bookings with a physical room, guest profile, prepaid payment and OTA
 * commission expense, so they show up on the calendar, bookings list,
 * dashboard and ledger like any other booking.
 */

type ImportStatus = 'imported' | 'updated' | 'cancelled' | 'duplicate' | 'needs_review' | 'ignored' | 'failed';

export interface SyncSummary {
  provider: string;
  trigger: 'manual' | 'scheduled';
  startedAt: string;
  finishedAt: string;
  fetched: number;
  newMessages: number;
  counts: Partial<Record<ImportStatus, number>>;
  error?: string;
}

const ACTIVE_STATUSES = ['Booked', 'Confirmed', 'Checked-In'];

// Lean row shapes (the schemas use string _ids, which Mongoose can't infer)
type RoomRow = { _id: string; number: string; category: string };
type StayRow = { _id: string; roomId: string; checkIn: string; checkOut: string };
const SYSTEM_USER = { id: 'system-email', name: 'Email Import' };

const shortId = () => randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
const day = (s: string) => s.slice(0, 10);
const nightsBetween = (inIso: string, outIso: string) =>
  Math.max(1, Math.round((Date.parse(day(outIso)) - Date.parse(day(inIso))) / 86400_000));

const log = (action: string, details: string) =>
  Log.create({
    _id: `LOG-${randomUUID().slice(0, 8).toUpperCase()}`,
    action, details,
    userId: SYSTEM_USER.id, userName: SYSTEM_USER.name,
    timestamp: new Date().toISOString()
  }).catch(err => console.error('[Email Import] log failed', err));

// ------------------------------------------------------------ rooms

interface Allocation { roomIds: string[]; notes: string[]; overbooked: boolean }

/**
 * Pick `count` rooms free for the whole stay: preferred category first, then
 * any other category. If the hotel is full the booking still lands (so it's
 * visible on the calendar) but is flagged for manual reassignment.
 */
async function allocateRooms(
  count: number,
  category: string | undefined,
  checkIn: string,
  checkOut: string,
  excludeBookingIds: string[] = [],
  avoidRoomIds: string[] = []
): Promise<Allocation> {
  const rooms = await Room.find().sort({ number: 1 }).lean<RoomRow[]>();
  if (rooms.length === 0) throw new Error('No rooms are configured in the CRM');

  const inDay = day(checkIn), outDay = day(checkOut);
  const overlapping = await Booking.find({
    status: { $in: ACTIVE_STATUSES },
    _id: { $nin: excludeBookingIds }
  }).select('roomId checkIn checkOut').lean<StayRow[]>();
  const taken = new Set([
    ...avoidRoomIds,
    ...overlapping
      .filter(b => day(b.checkIn) < outDay && day(b.checkOut) > inDay)
      .map(b => b.roomId)
  ]);

  const preferred = rooms.filter(r => !category || r.category === category);
  const others = rooms.filter(r => category && r.category !== category);
  const roomIds: string[] = [];
  const notes: string[] = [];

  for (const r of preferred) if (roomIds.length < count && !taken.has(r._id)) roomIds.push(r._id);
  for (const r of others) {
    if (roomIds.length < count && !taken.has(r._id)) {
      roomIds.push(r._id);
      notes.push(`No ${category} free — assigned ${r.category} ${r.number}`);
    }
  }

  let overbooked = false;
  const fallbackPool = preferred.length ? preferred : rooms;
  for (let i = 0; roomIds.length < count; i++) {
    overbooked = true;
    roomIds.push(fallbackPool[i % fallbackPool.length]._id);
  }
  if (overbooked) notes.push('OVERBOOKED: no free room for these dates — reassign manually');

  return { roomIds, notes, overbooked };
}

async function isRoomFree(roomId: string, checkIn: string, checkOut: string, excludeBookingIds: string[]) {
  const inDay = day(checkIn), outDay = day(checkOut);
  const others = await Booking.find({ roomId, status: { $in: ACTIVE_STATUSES }, _id: { $nin: excludeBookingIds } })
    .select('checkIn checkOut').lean<StayRow[]>();
  return !others.some(b => day(b.checkIn) < outDay && day(b.checkOut) > inDay);
}

const roomLabel = async (ids: string[]) => {
  const rooms = await Room.find({ _id: { $in: ids } }).select('number').lean<RoomRow[]>();
  const byId = new Map(rooms.map(r => [r._id, r.number]));
  return ids.map(id => `Room ${byId.get(id) ?? id}`).join(', ');
};

// ------------------------------------------------------------ guests

async function findOrCreateGuest(d: ParsedEmailBooking, stayDate: string) {
  const phone = d.guestPhone;
  const email = d.guestEmail && !/@guest\.booking\.com$/i.test(d.guestEmail) ? d.guestEmail : undefined; // relay addresses change per booking

  let guest = null;
  if (email) guest = await Guest.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  if (!guest && phone) {
    // Stored numbers vary ("+91 98765 01234", "098765-01234"): narrow by the last
    // digits allowing separators, then compare normalised numbers.
    const tail = phone.slice(-6).split('').join('\\D*');
    const candidates = await Guest.find({ phone: { $regex: `${tail}\\D*$` } }).select('phone');
    const hit = candidates.find(g => normalizePhone(g.phone || '') === phone);
    if (hit) guest = await Guest.findById(hit._id);
  }

  if (guest) {
    guest.totalStays = (guest.totalStays || 0) + 1;
    guest.lastStay = stayDate;
    if (!guest.phone && phone) guest.phone = phone;
    if ((!guest.email || guest.email === '-') && d.guestEmail) guest.email = d.guestEmail;
    await guest.save();
    return { guest, created: false, guestId: String(guest._id) };
  }

  const name = d.guestName || 'Unknown Guest';
  guest = await Guest.create({
    _id: `GST-${shortId()}`,
    name,
    phone: phone || '',
    email: d.guestEmail || '-',
    city: '',
    state: '',
    totalStays: 1,
    lastStay: stayDate,
    totalSpent: 0,
    isVIP: false,
    avatarInitial: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  });
  return { guest, created: true };
}

// ------------------------------------------------------------ actions

interface Outcome {
  status: ImportStatus;
  message: string;
  bookingIds?: string[];
  guestId?: string;
  paymentIds?: string[];
  expenseIds?: string[];
}

async function createBookings(d: ParsedEmailBooking, msg: InboxMessage, note?: string): Promise<Outcome> {
  const checkIn = d.checkIn!, checkOut = d.checkOut!;
  const { guest, created } = await findOrCreateGuest(d, day(checkIn));
  const alloc = await allocateRooms(d.rooms, d.roomCategory, checkIn, checkOut);

  const nights = nightsBetween(checkIn, checkOut);
  const perRoomTotal = Math.round((d.totalAmount || 0) / d.rooms);
  const perRoomCommission = Math.round((d.commission || 0) / d.rooms);
  const year = day(checkIn).slice(0, 4);

  const bookingIds: string[] = [], paymentIds: string[] = [], expenseIds: string[] = [];
  const notes = [
    `Imported from ${d.source} email: "${msg.subject}"`,
    d.specialRequests && `Guest request: ${d.specialRequests}`,
    ...alloc.notes
  ].filter(Boolean).join('\n');

  for (const roomId of alloc.roomIds) {
    const bookingId = `SP-${year}-${shortId()}`;
    await Booking.create({
      _id: bookingId,
      guestId: guest._id,
      roomId,
      checkIn,
      checkOut,
      adults: Math.max(1, Math.ceil((d.adults ?? 2) / d.rooms)),
      children: Math.ceil((d.children ?? 0) / d.rooms),
      nights,
      subtotal: perRoomTotal, // OTA totals are tax-inclusive (same convention as the OTA Excel import)
      gst: 0,
      total: perRoomTotal,
      paid: d.prepaid ? perRoomTotal : 0,
      balance: d.prepaid ? 0 : perRoomTotal,
      status: alloc.overbooked ? 'Booked' : 'Confirmed',
      createdAt: msg.receivedAt,
      notes,
      source: d.source,
      channelBookingId: d.channelBookingId,
      // No channel-manager API: the OTA has already confirmed, nothing to accept/reject
      channelStatus: 'ok',
      commission: perRoomCommission,
      netRevenue: perRoomTotal - perRoomCommission,
      unitType: d.roomType || null,
      bookerCountry: d.bookerCountry || null,
      channelRoomsCount: d.rooms
    });
    bookingIds.push(bookingId);

    if (d.prepaid && perRoomTotal > 0) {
      const id = `RCPT-EM-${shortId()}`;
      await Payment.create({
        _id: id, bookingId, guestId: guest._id,
        // Dated to the stay (same as the OTA Excel import) so P&L books revenue and commission together
        date: day(checkIn), mode: 'Bank Transfer', amount: perRoomTotal, status: 'Completed',
        description: `Prepaid via ${d.source} (${d.channelBookingId})`, roomId
      });
      paymentIds.push(id);
    }
    if (perRoomCommission > 0) {
      const id = `EXP-EM-${shortId()}`;
      await Expense.create({
        _id: id, date: day(checkIn), amount: perRoomCommission, category: 'Commission',
        description: `${d.source} commission for booking ${d.channelBookingId} (${guest.name})`,
        roomId, recordedBy: SYSTEM_USER.name
      });
      expenseIds.push(id);
    }
  }

  pushAvailability(checkIn, checkOut).catch(() => {});
  const where = await roomLabel(alloc.roomIds);
  const message = [note, `${bookingIds.join(', ')} → ${where}`, created ? 'new guest profile' : 'matched existing guest', ...alloc.notes]
    .filter(Boolean).join(' · ');
  log('Email Import: New Booking', `${d.source} ${d.channelBookingId} for ${guest.name}: ${message}`);

  return {
    status: alloc.overbooked ? 'needs_review' : 'imported',
    message, bookingIds, guestId: guest._id, paymentIds, expenseIds
  };
}

/** Import records that created money rows for this OTA booking */
const priorImports = (channelBookingId: string) =>
  EmailImport.find({ channelBookingId, status: { $in: ['imported', 'updated', 'needs_review'] } });

async function modifyBookings(d: ParsedEmailBooking, msg: InboxMessage): Promise<Outcome> {
  const existing = await Booking.find({ channelBookingId: d.channelBookingId });
  if (existing.length === 0) return createBookings(d, msg, 'Modification for a booking not in the CRM — imported as new');

  const checkIn = d.checkIn || existing[0].checkIn;
  const checkOut = d.checkOut || existing[0].checkOut;
  const ids = existing.map(b => String(b._id));
  const nights = nightsBetween(checkIn, checkOut);
  const perRoomTotal = d.totalAmount !== undefined ? Math.round(d.totalAmount / existing.length) : undefined;
  const perRoomCommission = d.commission !== undefined ? Math.round(d.commission / existing.length) : undefined;

  // Re-check each room against the new dates (ignoring this booking's own rows)
  const notes: string[] = [];
  let overbooked = false;
  const currentRooms = await Room.find({ _id: { $in: existing.map(b => b.roomId) } }).lean<RoomRow[]>();
  const categoryOf = new Map(currentRooms.map(r => [r._id, r.category]));
  const claimed: string[] = [];
  for (const b of existing) {
    if (claimed.includes(b.roomId) || !(await isRoomFree(b.roomId, checkIn, checkOut, ids))) {
      const probe = await allocateRooms(1, categoryOf.get(b.roomId), checkIn, checkOut, ids, claimed);
      notes.push(`Moved ${b._id} to ${await roomLabel(probe.roomIds)} (original room taken for the new dates)`, ...probe.notes);
      b.roomId = probe.roomIds[0];
      overbooked ||= probe.overbooked;
    }
    claimed.push(b.roomId);

    b.checkIn = checkIn;
    b.checkOut = checkOut;
    b.nights = nights;
    if (d.adults !== undefined) b.adults = Math.max(1, Math.ceil(d.adults / existing.length));
    if (d.children !== undefined) b.children = Math.ceil(d.children / existing.length);
    if (perRoomTotal !== undefined) {
      b.total = perRoomTotal;
      b.subtotal = perRoomTotal;
    }
    if (perRoomCommission !== undefined) b.commission = perRoomCommission;
    b.netRevenue = b.total - (b.commission || 0);
    if (b.status === 'Cancelled') b.status = 'Confirmed';
    b.channelStatus = 'ok';
    b.notes = `${b.notes || ''}\nModified via ${d.source} email on ${day(msg.receivedAt)}`.trim();
    await b.save();
  }

  // Keep the ledger rows the original import created in step with the new amounts
  const prior = await priorImports(d.channelBookingId!);
  const paymentIds = prior.flatMap(p => p.paymentIds);
  const expenseIds = prior.flatMap(p => p.expenseIds);
  if (paymentIds.length) {
    await Payment.updateMany(
      { _id: { $in: paymentIds } },
      { $set: { date: day(checkIn), ...(perRoomTotal !== undefined ? { amount: perRoomTotal } : {}) } }
    );
  }
  if (perRoomCommission !== undefined && expenseIds.length) {
    await Expense.updateMany({ _id: { $in: expenseIds } }, { $set: { amount: perRoomCommission, date: day(checkIn) } });
  }
  // Paid follows the (updated) prepaid receipts
  for (const b of existing) {
    const paid = (await Payment.find({ bookingId: b._id, status: 'Completed' }).select('amount').lean<{ amount: number }[]>())
      .reduce((s, p) => s + p.amount, 0);
    b.paid = paid;
    b.balance = b.total - paid;
    await b.save();
  }

  pushAvailability(checkIn, checkOut).catch(() => {});
  const message = [`Updated ${ids.join(', ')}: ${day(checkIn)} → ${day(checkOut)}${perRoomTotal !== undefined ? `, total ₹${d.totalAmount}` : ''}`, ...notes].join(' · ');
  log('Email Import: Modify Booking', `${d.source} ${d.channelBookingId}: ${message}`);
  return { status: overbooked ? 'needs_review' : 'updated', message, bookingIds: ids, guestId: existing[0].guestId };
}

async function cancelBookings(d: ParsedEmailBooking, msg: InboxMessage): Promise<Outcome> {
  const existing = await Booking.find({ channelBookingId: d.channelBookingId });
  if (existing.length === 0) {
    return { status: 'needs_review', message: `Cancellation for ${d.channelBookingId}, which is not in the CRM` };
  }
  for (const b of existing) {
    b.status = 'Cancelled';
    b.channelStatus = 'cancelled';
    b.notes = `${b.notes || ''}\nCancelled via ${d.source} email on ${day(msg.receivedAt)}`.trim();
    await b.save();
  }

  // Reverse the money side of the original import: no commission is owed and
  // the prepaid amount goes back to the guest.
  const prior = await priorImports(d.channelBookingId!);
  const expenseIds = prior.flatMap(p => p.expenseIds);
  const paymentIds = prior.flatMap(p => p.paymentIds);
  if (expenseIds.length) await Expense.deleteMany({ _id: { $in: expenseIds } });
  if (paymentIds.length) await Payment.updateMany({ _id: { $in: paymentIds } }, { $set: { status: 'Refunded' } });

  pushAvailability(existing[0].checkIn, existing[0].checkOut).catch(() => {});
  const message = `Cancelled ${existing.map(b => String(b._id)).join(', ')} — room released${expenseIds.length ? ', commission removed' : ''}${paymentIds.length ? ', prepayment marked refunded' : ''}`;
  log('Email Import: Cancel Booking', `${d.source} ${d.channelBookingId}: ${message}`);
  return { status: 'cancelled', message, bookingIds: existing.map(b => String(b._id)), guestId: existing[0].guestId };
}

// ------------------------------------------------------------ processing

const rawTextOf = (msg: InboxMessage) => (msg.text?.trim() ? msg.text : htmlToText(msg.html || '')).slice(0, 20000);

async function processMessage(msg: InboxMessage, providerId: string) {
  const base = {
    _id: `EMI-${shortId()}${shortId()}`,
    provider: providerId,
    messageId: msg.messageId,
    from: msg.from,
    subject: msg.subject,
    receivedAt: msg.receivedAt,
    rawText: rawTextOf(msg)
  };

  let outcome: Outcome;
  let parsed: ParsedEmailBooking | null = null;
  try {
    const result = parseBookingEmail(msg);
    if (result.kind === 'ignored') {
      outcome = { status: 'ignored', message: result.reason };
    } else {
      parsed = result.data;
      if (result.missing.length) {
        outcome = { status: 'needs_review', message: `Could not read: ${result.missing.join(', ')}` };
      } else if (parsed.action === 'CANCEL') {
        outcome = await cancelBookings(parsed, msg);
      } else if (parsed.action === 'MODIFY') {
        outcome = await modifyBookings(parsed, msg);
      } else if (await Booking.exists({ channelBookingId: parsed.channelBookingId })) {
        outcome = { status: 'duplicate', message: `Booking ${parsed.channelBookingId} is already in the CRM` };
      } else {
        outcome = await createBookings(parsed, msg);
      }
    }
  } catch (err: any) {
    console.error('[Email Import] failed to process', msg.messageId, err);
    outcome = { status: 'failed', message: err?.message || String(err) };
  }

  const record = await EmailImport.create({
    ...base,
    status: outcome.status,
    action: parsed?.action ?? null,
    source: parsed?.source ?? null,
    channelBookingId: parsed?.channelBookingId ?? null,
    bookingIds: outcome.bookingIds || [],
    guestId: outcome.guestId || null,
    paymentIds: outcome.paymentIds || [],
    expenseIds: outcome.expenseIds || [],
    message: outcome.message,
    parsed,
    processedAt: new Date().toISOString()
  });
  return record;
}

let running: Promise<SyncSummary> | null = null;
let lastSync: SyncSummary | null = null;

export const getLastSync = () => lastSync;

/** Pull the inbox and import every email not seen before. Concurrent calls share one run. */
export function syncInbox(trigger: SyncSummary['trigger'] = 'manual'): Promise<SyncSummary> {
  if (running) return running;
  running = (async () => {
    const provider = getInboxProvider();
    const summary: SyncSummary = {
      provider: provider.id, trigger, startedAt: new Date().toISOString(), finishedAt: '',
      fetched: 0, newMessages: 0, counts: {}
    };
    try {
      const messages = await provider.fetchMessages();
      summary.fetched = messages.length;
      const seen = new Set(
        (await EmailImport.find({ messageId: { $in: messages.map(m => m.messageId) } }).select('messageId').lean())
          .map(r => r.messageId)
      );
      // Oldest first so a booking is created before its modification / cancellation
      const fresh = messages
        .filter(m => !seen.has(m.messageId))
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
      summary.newMessages = fresh.length;

      for (const msg of fresh) {
        const rec = await processMessage(msg, provider.id);
        summary.counts[rec.status as ImportStatus] = (summary.counts[rec.status as ImportStatus] || 0) + 1;
      }
    } catch (err: any) {
      console.error('[Email Import] sync failed', err);
      summary.error = err?.message || String(err);
    }
    summary.finishedAt = new Date().toISOString();
    lastSync = summary;
    return summary;
  })().finally(() => { running = null; });
  return running;
}

/** Retry an email flagged for review / failed (e.g. after freeing a room). */
export async function reprocessImport(id: string) {
  const rec = await EmailImport.findById(id);
  if (!rec) throw new Error('Import record not found');
  if (!['needs_review', 'failed'].includes(rec.status)) throw new Error(`Only emails that need review or failed can be retried (this one is "${rec.status}")`);
  if (rec.bookingIds.length) throw new Error('This email already created bookings; edit them from the Bookings page instead');

  const msg: InboxMessage = {
    messageId: rec.messageId, from: rec.from, subject: rec.subject, receivedAt: rec.receivedAt, text: rec.rawText
  };
  await EmailImport.deleteOne({ _id: rec._id });
  return processMessage(msg, rec.provider);
}

/** Minutes between automatic syncs; 0 disables. Defaults to 15 for a real inbox. */
export function syncIntervalMinutes() {
  const env = process.env.EMAIL_SYNC_INTERVAL_MINUTES;
  if (env !== undefined && env !== '') return Math.max(0, Number(env) || 0);
  return getInboxProvider().id === 'imap' ? 15 : 0;
}

export function startEmailSyncScheduler() {
  const minutes = syncIntervalMinutes();
  if (!minutes) return;
  console.log(`[Email Import] auto-sync every ${minutes} min from ${getInboxProvider().label}`);
  setInterval(() => { syncInbox('scheduled').catch(() => {}); }, minutes * 60_000);
  setTimeout(() => { syncInbox('scheduled').catch(() => {}); }, 15_000);
}
