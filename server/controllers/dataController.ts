import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/authMiddleware.js';
import { Room } from '../models/Room.js';
import { Guest } from '../models/Guest.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { CommRecord } from '../models/CommRecord.js';
import { Log } from '../models/Log.js';
import { StandaloneInvoice } from '../models/StandaloneInvoice.js';
import { StoredInvoice } from '../models/StoredInvoice.js';
import { Expense } from '../models/Expense.js';
import { randomUUID } from 'crypto';
import { Tombstone, recordDeletion } from '../models/Tombstone.js';
import { serializeLean, commAliases } from '../services/serialize.js';
import { pushAvailability, confirmChannelReservation, rejectChannelReservation } from '../services/channelManagerService.js';

function titleCase(str: string) {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Copy only the fields the model's schema defines. Replaces the hand-written
 * destructuring lists, which had drifted from the schemas and silently dropped
 * required fields (e.g. bookings lost nights/subtotal/gst/createdAt and failed
 * validation; guests lost city/state/ID type). Unknown keys are ignored.
 */
function pickSchemaFields(model: mongoose.Model<any>, body: Record<string, any>, { forUpdate = false } = {}) {
  const allowed = new Set(Object.keys(model.schema.paths).map(k => k.split('.')[0]));
  ['_id', '__v', 'updatedAt'].forEach(k => allowed.delete(k));
  if (forUpdate && model.schema.path('createdAt')?.instance === 'Date') allowed.delete('createdAt');
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body || {})) {
    if (allowed.has(k) && v !== undefined) out[k] = v;
  }
  return out;
}

// Log Action Helper — never throws. Route handlers fire it without awaiting so
// the audit write doesn't add a DB round trip to every mutation's latency.
const logAction = async (req: AuthRequest, action: string, details: string) => {
  try {
    const userId = req.user?.id || 'system';
    const userName = req.user?.name || 'System Auto';

    await Log.create({
      _id: `LOG-${randomUUID().slice(0, 8).toUpperCase()}`,
      action,
      details,
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

// GET /api/initialize
// Fetch all initial data
export const initializeData = async (req: Request, res: Response) => {
  try {
    // Taken before the reads, so a later /api/sync?since=serverTime can't miss a
    // write that landed while these queries ran (re-sent rows are idempotent).
    const serverTime = new Date(Date.now() - 2000).toISOString();
    // Independent collections — fetch concurrently instead of 9 serial round trips
    // Plain (lean) reads: this endpoint returns the whole database, and
    // hydrating every row as a Mongoose document was most of its cost.
    const [rooms, guests, bookings, payments, comms, logs, invoices, storedInvoices, expenses] = await Promise.all([
      Room.find().lean(),
      Guest.find().lean(),
      Booking.find().sort({ checkIn: -1, createdAt: -1 }).lean(),
      Payment.find().lean(),
      CommRecord.find().lean(),
      Log.find().sort({ timestamp: -1 }).limit(100).lean(),
      StandaloneInvoice.find().sort({ createdAt: -1 }).lean(),
      StoredInvoice.find().sort({ createdAt: -1 }).lean(),
      Expense.find().sort({ date: -1 }).lean()
    ]);

    // Recompute each guest's lifetime value (LTV) as the sum of Completed
    // payments actually received from them — keeps totalSpent in sync with
    // the payments ledger (income) every time data is initialized.
    const spendByGuest = new Map<string, number>();
    for (const p of payments) {
      if (p.status === 'Completed' && p.guestId && p.guestId !== '-') {
        spendByGuest.set(p.guestId, (spendByGuest.get(p.guestId) || 0) + p.amount);
      }
    }
    const guestUpdates = [];
    for (const g of guests as any[]) {
      const computed = spendByGuest.get(g._id) || 0;
      if (g.totalSpent !== computed) {
        g.totalSpent = computed; // reflected in this response
        guestUpdates.push({ updateOne: { filter: { _id: g._id }, update: { $set: { totalSpent: computed } } } });
      }
    }
    // One bulk write instead of a save() round trip per drifted guest
    if (guestUpdates.length) await Guest.bulkWrite(guestUpdates, { ordered: false });

    res.json({
      serverTime,
      rooms: serializeLean(Room, rooms),
      guests: serializeLean(Guest, guests),
      bookings: serializeLean(Booking, bookings),
      payments: serializeLean(Payment, payments),
      comms: serializeLean(CommRecord, comms, commAliases),
      logs: serializeLean(Log, logs),
      invoices: serializeLean(StandaloneInvoice, invoices),
      storedInvoices: serializeLean(StoredInvoice, storedInvoices),
      expenses: serializeLean(Expense, expenses)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/sync?since=<ISO>
// Incremental refresh: only rows created/updated since `since`, plus ids deleted
// since then. A full /api/initialize is only needed on first load.
export const syncData = async (req: Request, res: Response) => {
  try {
    const sinceRaw = typeof req.query.since === 'string' ? req.query.since : '';
    const since = new Date(sinceRaw);
    if (!sinceRaw || isNaN(since.getTime())) return res.status(400).json({ error: 'since must be an ISO timestamp' });
    // Tombstones expire after 60 days; older cursors must do a full reload
    if (Date.now() - since.getTime() > 55 * 86400_000) return res.status(410).json({ error: 'Sync cursor too old, reload required' });

    const serverTime = new Date(Date.now() - 2000).toISOString();
    const changed = { updatedAt: { $gt: since } };
    const [rooms, guests, bookings, payments, comms, logs, invoices, storedInvoices, expenses, tombstones] = await Promise.all([
      Room.find(changed).lean(),
      Guest.find(changed).lean(),
      Booking.find(changed).lean(),
      Payment.find(changed).lean(),
      CommRecord.find(changed).lean(),
      Log.find({ createdAt: { $gt: since } }).sort({ timestamp: -1 }).limit(100).lean(),
      StandaloneInvoice.find(changed).lean(),
      StoredInvoice.find(changed).lean(),
      Expense.find(changed).lean(),
      Tombstone.find({ deletedAt: { $gt: since } }).lean()
    ]);

    const deleted: Record<string, string[]> = {};
    for (const t of tombstones) (deleted[t.collectionName] ||= []).push(t.docId);

    res.json({
      serverTime,
      rooms: serializeLean(Room, rooms),
      guests: serializeLean(Guest, guests),
      bookings: serializeLean(Booking, bookings),
      payments: serializeLean(Payment, payments),
      comms: serializeLean(CommRecord, comms, commAliases),
      logs: serializeLean(Log, logs),
      invoices: serializeLean(StandaloneInvoice, invoices),
      storedInvoices: serializeLean(StoredInvoice, storedInvoices),
      expenses: serializeLean(Expense, expenses),
      deleted
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Rooms
export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, housekeepingStatus } = req.body;
    const updateData = { status, notes, housekeepingStatus };
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

    const updated = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    void logAction(req, 'Room Update', `Room ${updated.number} status changed to ${updated.status}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Guests
export const addGuest = async (req: AuthRequest, res: Response) => {
  try {
    const guestData = pickSchemaFields(Guest, req.body);
    if (guestData.name) guestData.name = titleCase(guestData.name);

    const guest = new Guest({ ...guestData, _id: req.body.id });
    await guest.save();
    void logAction(req, 'Add Guest', `Added new guest: ${guest.name}`);
    res.json(guest.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateGuest = async (req: AuthRequest, res: Response) => {
  try {
    const updateData = pickSchemaFields(Guest, req.body, { forUpdate: true });
    if (updateData.name) updateData.name = titleCase(updateData.name);

    const updated = await Guest.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    void logAction(req, 'Update Guest', `Updated guest info: ${updated.name}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Bookings
export const addBooking = async (req: AuthRequest, res: Response) => {
  try {
    const bookingData = pickSchemaFields(Booking, req.body);
    if (bookingData.createdAt === undefined) bookingData.createdAt = new Date().toISOString();

    const booking = new Booking({ ...bookingData, _id: req.body.id });
    await booking.save();
    void logAction(req, 'New Booking', `Created booking ${booking._id} for guest ${booking.guestId}`);

    // Trigger outbound sync in background (fire and forget)
    pushAvailability(booking.checkIn, booking.checkOut).catch(console.error);

    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const updateData = pickSchemaFields(Booking, req.body, { forUpdate: true });

    // Only the dates are needed from the pre-update doc (for the availability push)
    const oldBooking = await Booking.findById(req.params.id).select('checkIn checkOut').lean();
    const updated = await Booking.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    void logAction(req, 'Update Booking', `Booking ${updated._id} status changed to ${updated.status}`);

    // Trigger outbound sync in background if dates or status changed
    if (oldBooking) {
      const minStart = oldBooking.checkIn < updated.checkIn ? oldBooking.checkIn : updated.checkIn;
      const maxEnd = oldBooking.checkOut > updated.checkOut ? oldBooking.checkOut : updated.checkOut;
      pushAvailability(minStart, maxEnd).catch(console.error);
    }

    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response) => {
  try {
    // findByIdAndDelete returns the removed doc — no separate lookup needed
    const booking = await Booking.findByIdAndDelete(req.params.id);
    await recordDeletion('bookings', String(req.params.id));
    void logAction(req, 'Delete Booking', `Deleted booking ${req.params.id}`);

    if (booking) {
      pushAvailability(booking.checkIn, booking.checkOut).catch(console.error);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const confirmChannelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.channelBookingId) return res.status(404).json({ error: 'OTA booking not found' });

    booking.channelStatus = 'confirmed';
    booking.status = 'Confirmed';
    await booking.save();

    void logAction(req, 'Confirm OTA Booking', `Confirmed OTA Booking ${booking._id}`);

    // Notify channel manager
    confirmChannelReservation(booking.channelBookingId, booking._id).catch(console.error);

    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const rejectChannelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.channelBookingId) return res.status(404).json({ error: 'OTA booking not found' });

    booking.channelStatus = 'rejected';
    booking.status = 'Checked-Out'; // release room
    await booking.save();

    void logAction(req, 'Reject OTA Booking', `Rejected OTA Booking ${booking._id}`);

    // Notify channel manager
    rejectChannelReservation(booking.channelBookingId).catch(console.error);

    // Release inventory
    pushAvailability(booking.checkIn, booking.checkOut).catch(console.error);

    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Payments
// One request records the payment AND applies it to the booking balance and the
// guest's lifetime value server-side (previously 3 separate client requests,
// which could half-apply or race). Returns the updated booking/guest too.
export const addPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, guestId, amount, mode, date, status, description, roomId, applyToBooking = true } = req.body;
    const paymentData = { bookingId, guestId, amount, mode, date, status, description, roomId };
    const payment = new Payment({ ...paymentData, _id: req.body.id });
    await payment.save();

    const counts = payment.status === 'Completed' && payment.amount > 0;
    const [booking, guest] = await Promise.all([
      counts && applyToBooking && payment.bookingId && payment.bookingId !== '-'
        ? Booking.findByIdAndUpdate(payment.bookingId, [
            { $set: { paid: { $add: [{ $ifNull: ['$paid', 0] }, payment.amount] } } },
            { $set: { balance: { $subtract: ['$total', '$paid'] } } }
          ], { new: true })
        : null,
      counts && payment.guestId && payment.guestId !== '-'
        ? Guest.findByIdAndUpdate(payment.guestId, { $inc: { totalSpent: payment.amount } }, { new: true })
        : null
    ]);

    void logAction(req, 'Add Payment', `Added payment ${payment._id} of amount ${payment.amount} for booking ${payment.bookingId}`);
    res.json({ ...payment.toJSON(), booking: booking ? booking.toJSON() : null, guest: guest ? guest.toJSON() : null });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Comms
export const addComm = async (req: AuthRequest, res: Response) => {
  try {
    // The Communications page sends recipientId/templateName and no id or
    // timestamp; accept both shapes (previously every send failed validation).
    const b = req.body;
    const comm = new CommRecord({
      _id: b.id || `COMM-${randomUUID().slice(0, 8).toUpperCase()}`,
      guestId: b.guestId || b.recipientId,
      channel: b.channel,
      template: b.template || b.templateName,
      status: b.status || 'Sent',
      timestamp: b.timestamp || b.sentAt || new Date().toISOString()
    });
    await comm.save();
    void logAction(req, 'Send Comm', `Sent ${comm.channel} to guest ${comm.guestId} - Template: ${comm.template}`);
    res.json(comm.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Invoices
export const addInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const invoiceData = pickSchemaFields(StandaloneInvoice, req.body);
    const invoice = new StandaloneInvoice({ ...invoiceData, _id: req.body.id });
    await invoice.save();
    void logAction(req, 'Generate Invoice', `Generated standalone invoice ${invoice._id} for ${invoice.customerName}`);
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const addStoredInvoice = async (req: AuthRequest, res: Response) => {
  try {
    // The app sends the invoice fields at the top level; the previous
    // {bookingId, invoiceNumber, data} destructuring dropped all of them, so
    // every save failed validation and the invoice archive stayed empty.
    const { invoiceId, date, billedTo, checkIn, checkOut, roomPlan, paymentStatus, items, subtotal, gstTotal, gst, total, staySummary } = req.body;
    const invoice = new StoredInvoice({
      _id: invoiceId,
      invoiceId, date, billedTo, checkIn, checkOut, roomPlan, paymentStatus, items,
      subtotal, gstTotal: gstTotal ?? gst, total, staySummary
    });
    await invoice.save();
    void logAction(req, 'Store Invoice Data', `Saved full invoice data ${invoice._id}`);
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Expenses
export const addExpense = async (req: AuthRequest, res: Response) => {
  try {
    // The app sends recordedBy/roomId; reading approvedBy/receiptUrl (fields the
    // schema doesn't have) dropped the required recordedBy, so every manual
    // expense failed validation.
    const { category, amount, date, description, roomId, recordedBy, approvedBy } = req.body;
    const expenseData = { category, amount, date, description, roomId, recordedBy: recordedBy || approvedBy || req.user?.name || 'System' };
    const expense = new Expense({ ...expenseData, _id: req.body.id });
    await expense.save();
    void logAction(req, 'Add Expense', `Added expense ${expense.id} of amount ₹${expense.amount} under ${expense.category}`);
    res.json(expense.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    await recordDeletion('expenses', String(req.params.id));
    void logAction(req, 'Delete Expense', `Deleted expense ${req.params.id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Logs
export const addLog = async (req: AuthRequest, res: Response) => {
  try {
    const { action, details } = req.body;
    await logAction(req, action, details);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};
