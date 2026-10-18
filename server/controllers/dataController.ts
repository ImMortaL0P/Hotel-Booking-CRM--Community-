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
import {
  INITAL_ROOMS,
  INITAL_GUESTS,
  INITAL_BOOKINGS,
  INITAL_PAYMENTS,
  INITAL_COMMS
} from '../../src/app/data/seedData.ts';

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

// High-speed in-memory cache with short TTL (invalidated on writes)
let priorityCache: { time: number; data: any } | null = null;
let secondaryCache: { time: number; data: any } | null = null;
let fullCache: { time: number; data: any } | null = null;
const CACHE_TTL_MS = 20_000;

export const invalidateDataCache = () => {
  priorityCache = null;
  secondaryCache = null;
  fullCache = null;
};

// GET /api/initialize
// Fetch initial data with support for sequential priority stages (priority=1, secondary=1)
export const initializeData = async (req: Request, res: Response) => {
  try {
    const isPriorityOnly = req.query.priority === '1' || req.query.priority === 'true';
    const isSecondaryOnly = req.query.secondary === '1' || req.query.secondary === 'true';

    if (mongoose.connection.readyState !== 1) {
      if (isPriorityOnly) {
        return res.json({
          serverTime: new Date().toISOString(),
          isPriority: true,
          rooms: INITAL_ROOMS,
          guests: INITAL_GUESTS,
          bookings: INITAL_BOOKINGS,
          payments: INITAL_PAYMENTS
        });
      }
      if (isSecondaryOnly) {
        return res.json({
          serverTime: new Date().toISOString(),
          isSecondary: true,
          comms: INITAL_COMMS,
          logs: [],
          invoices: [],
          storedInvoices: [],
          expenses: []
        });
      }
      return res.json({
        serverTime: new Date().toISOString(),
        rooms: INITAL_ROOMS,
        guests: INITAL_GUESTS,
        bookings: INITAL_BOOKINGS,
        payments: INITAL_PAYMENTS,
        comms: INITAL_COMMS,
        logs: [],
        invoices: [],
        storedInvoices: [],
        expenses: []
      });
    }

    const now = Date.now();

    // 1. Stage 1: Priority Data (Dashboard & Bookings First)
    if (isPriorityOnly) {
      if (priorityCache && (now - priorityCache.time < CACHE_TTL_MS)) {
        return res.json(priorityCache.data);
      }

      const serverTime = new Date(now - 2000).toISOString();
      const [rooms, guests, bookings, payments] = await Promise.all([
        Room.find().lean(),
        Guest.find().lean(),
        Booking.find().sort({ checkIn: -1, createdAt: -1 }).lean(),
        Payment.find().lean()
      ]);

      const spendByGuest = new Map<string, number>();
      for (const p of payments) {
        if (p.status === 'Completed' && p.guestId && p.guestId !== '-') {
          spendByGuest.set(p.guestId, (spendByGuest.get(p.guestId) || 0) + p.amount);
        }
      }
      for (const g of guests as any[]) {
        const computed = spendByGuest.get(g._id) || 0;
        if (g.totalSpent !== computed) {
          g.totalSpent = computed;
        }
      }

      const priorityResult = {
        serverTime,
        isPriority: true,
        rooms: serializeLean(Room, rooms),
        guests: serializeLean(Guest, guests),
        bookings: serializeLean(Booking, bookings),
        payments: serializeLean(Payment, payments)
      };

      priorityCache = { time: now, data: priorityResult };
      return res.json(priorityResult);
    }

    // 2. Stage 2: Secondary Data (Comms, Logs, Invoices, Expenses)
    if (isSecondaryOnly) {
      if (secondaryCache && (now - secondaryCache.time < CACHE_TTL_MS)) {
        return res.json(secondaryCache.data);
      }

      const serverTime = new Date(now - 2000).toISOString();
      const [comms, logs, invoices, storedInvoices, expenses] = await Promise.all([
        CommRecord.find().lean(),
        Log.find().sort({ timestamp: -1 }).limit(100).lean(),
        StandaloneInvoice.find().sort({ createdAt: -1 }).lean(),
        StoredInvoice.find().sort({ createdAt: -1 }).lean(),
        Expense.find().sort({ date: -1 }).lean()
      ]);

      const secondaryResult = {
        serverTime,
        isSecondary: true,
        comms: serializeLean(CommRecord, comms, commAliases),
        logs: serializeLean(Log, logs),
        invoices: serializeLean(StandaloneInvoice, invoices),
        storedInvoices: serializeLean(StoredInvoice, storedInvoices),
        expenses: serializeLean(Expense, expenses)
      };

      secondaryCache = { time: now, data: secondaryResult };
      return res.json(secondaryResult);
    }

    // 3. Full Initialization
    if (fullCache && (now - fullCache.time < CACHE_TTL_MS)) {
      return res.json(fullCache.data);
    }

    const serverTime = new Date(now - 2000).toISOString();
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
        g.totalSpent = computed;
        guestUpdates.push({ updateOne: { filter: { _id: g._id }, update: { $set: { totalSpent: computed } } } });
      }
    }
    // Fire background bulk write without blocking the response
    if (guestUpdates.length) {
      Guest.bulkWrite(guestUpdates, { ordered: false }).catch(err => console.error('Guest spend bulk write error:', err));
    }

    const fullResult = {
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
    };

    fullCache = { time: now, data: fullResult };
    return res.json(fullResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/sync?since=<ISO>
// Incremental refresh: only rows created/updated since `since`, plus ids deleted
// since then. A full /api/initialize is only needed on first load.
export const syncData = async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        serverTime: new Date().toISOString(),
        rooms: [], guests: [], bookings: [], payments: [], comms: [], logs: [], invoices: [], storedInvoices: [], expenses: [],
        deleted: {}
      });
    }

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

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.params.id, ...updateData });
    }

    const updated = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    void logAction(req, 'Room Update', `Room ${updated.number} status changed to ${updated.status}`);
    invalidateDataCache();
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

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.body.id || `g-${Date.now()}`, ...guestData });
    }

    const guest = new Guest({ ...guestData, _id: req.body.id });
    await guest.save();
    void logAction(req, 'Add Guest', `Added new guest: ${guest.name}`);
    invalidateDataCache();
    res.json(guest.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateGuest = async (req: AuthRequest, res: Response) => {
  try {
    const updateData = pickSchemaFields(Guest, req.body, { forUpdate: true });
    if (updateData.name) updateData.name = titleCase(updateData.name);

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.params.id, ...updateData });
    }

    const updated = await Guest.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    void logAction(req, 'Update Guest', `Updated guest info: ${updated.name}`);
    invalidateDataCache();
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

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.body.id || `SP-${Date.now()}`, ...bookingData });
    }

    const booking = new Booking({ ...bookingData, _id: req.body.id });
    await booking.save();
    void logAction(req, 'New Booking', `Created booking ${booking._id} for guest ${booking.guestId}`);

    // Trigger outbound sync in background (fire and forget)
    pushAvailability(booking.checkIn, booking.checkOut).catch(console.error);

    invalidateDataCache();
    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const updateData = pickSchemaFields(Booking, req.body, { forUpdate: true });

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.params.id, ...updateData });
    }

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

    invalidateDataCache();
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, id: req.params.id });
    }

    // findByIdAndDelete returns the removed doc — no separate lookup needed
    const booking = await Booking.findByIdAndDelete(req.params.id);
    await recordDeletion('bookings', String(req.params.id));
    void logAction(req, 'Delete Booking', `Deleted booking ${req.params.id}`);

    if (booking) {
      pushAvailability(booking.checkIn, booking.checkOut).catch(console.error);
    }

    invalidateDataCache();
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteGuest = async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, id: req.params.id });
    }

    const guest = await Guest.findByIdAndDelete(req.params.id);
    await recordDeletion('guests', String(req.params.id));
    void logAction(req, 'Delete Guest', `Deleted guest ${guest?.name || req.params.id} (${req.params.id})`);

    invalidateDataCache();
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, id: req.params.id });
    }

    const payment = await Payment.findByIdAndDelete(req.params.id);
    await recordDeletion('payments', String(req.params.id));
    void logAction(req, 'Delete Payment', `Deleted payment record ${req.params.id}`);

    invalidateDataCache();
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

    invalidateDataCache();
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

    invalidateDataCache();
    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Payments
export const addPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, guestId, amount, mode, date, status, description, roomId, applyToBooking = true } = req.body;
    const paymentData = { bookingId, guestId, amount, mode, date, status, description, roomId };

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.body.id || `RCPT-${Date.now()}`, ...paymentData, booking: null, guest: null });
    }

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
    invalidateDataCache();
    res.json({ ...payment.toJSON(), booking: booking ? booking.toJSON() : null, guest: guest ? guest.toJSON() : null });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Comms
export const addComm = async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;
    const commData = {
      _id: b.id || `COMM-${randomUUID().slice(0, 8).toUpperCase()}`,
      guestId: b.guestId || b.recipientId,
      channel: b.channel,
      template: b.template || b.templateName,
      status: b.status || 'Sent',
      timestamp: b.timestamp || b.sentAt || new Date().toISOString()
    };

    if (mongoose.connection.readyState !== 1) {
      return res.json(commData);
    }

    const comm = new CommRecord(commData);
    await comm.save();
    void logAction(req, 'Send Comm', `Sent ${comm.channel} to guest ${comm.guestId} - Template: ${comm.template}`);
    invalidateDataCache();
    res.json(comm.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Invoices
export const addInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const invoiceData = pickSchemaFields(StandaloneInvoice, req.body);

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.body.id || `INV-${Date.now()}`, ...invoiceData });
    }

    const invoice = new StandaloneInvoice({ ...invoiceData, _id: req.body.id });
    await invoice.save();
    void logAction(req, 'Generate Invoice', `Generated standalone invoice ${invoice._id} for ${invoice.customerName}`);
    invalidateDataCache();
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const addStoredInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId, date, billedTo, checkIn, checkOut, roomPlan, paymentStatus, items, subtotal, gstTotal, gst, total, staySummary } = req.body;
    const invoiceData = {
      _id: invoiceId,
      invoiceId, date, billedTo, checkIn, checkOut, roomPlan, paymentStatus, items,
      subtotal, gstTotal: gstTotal ?? gst, total, staySummary
    };

    if (mongoose.connection.readyState !== 1) {
      return res.json(invoiceData);
    }

    const invoice = new StoredInvoice(invoiceData);
    await invoice.save();
    void logAction(req, 'Store Invoice Data', `Saved full invoice data ${invoice._id}`);
    invalidateDataCache();
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Expenses
export const addExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { category, amount, date, description, roomId, recordedBy, approvedBy } = req.body;
    const expenseData = { category, amount, date, description, roomId, recordedBy: recordedBy || approvedBy || req.user?.name || 'System' };

    if (mongoose.connection.readyState !== 1) {
      return res.json({ id: req.body.id || `EXP-${Date.now()}`, ...expenseData });
    }

    const expense = new Expense({ ...expenseData, _id: req.body.id });
    await expense.save();
    void logAction(req, 'Add Expense', `Added expense ${expense.id} of amount ₹${expense.amount} under ${expense.category}`);
    invalidateDataCache();
    res.json(expense.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, id: req.params.id });
    }

    await Expense.findByIdAndDelete(req.params.id);
    await recordDeletion('expenses', String(req.params.id));
    void logAction(req, 'Delete Expense', `Deleted expense ${req.params.id}`);
    invalidateDataCache();
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Logs
export const addLog = async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true });
    }
    const { action, details } = req.body;
    await logAction(req, action, details);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};
