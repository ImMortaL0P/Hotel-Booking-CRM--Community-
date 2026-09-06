import { Request, Response } from 'express';
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

// Log Action Helper
const logAction = async (req: Request, action: string, details: string) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'system';
    const userName = req.headers['x-user-name'] as string || 'System Auto';

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
    const rooms = await Room.find();
    const guests = await Guest.find();
    const bookings = await Booking.find();
    const payments = await Payment.find();
    const comms = await CommRecord.find();
    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    const invoices = await StandaloneInvoice.find().sort({ createdAt: -1 });
    const storedInvoices = await StoredInvoice.find().sort({ createdAt: -1 });
    const expenses = await Expense.find().sort({ date: -1 });

    // Convert to JSON (triggers the transform we wrote)
    res.json({
      rooms: rooms.map(r => r.toJSON()),
      guests: guests.map(g => g.toJSON()),
      bookings: bookings.map(b => b.toJSON()),
      payments: payments.map(p => p.toJSON()),
      comms: comms.map(c => c.toJSON()),
      logs: logs.map(l => l.toJSON()),
      invoices: invoices.map(i => i.toJSON()),
      storedInvoices: storedInvoices.map(i => i.toJSON()),
      expenses: expenses.map(e => e.toJSON())
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Rooms
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const updated = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await logAction(req, 'Room Update', `Room ${updated.number} status changed to ${updated.status}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Guests
export const addGuest = async (req: Request, res: Response) => {
  try {
    const guest = new Guest({ ...req.body, _id: req.body.id });
    await guest.save();
    await logAction(req, 'Add Guest', `Added new guest: ${guest.name}`);
    res.json(guest.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateGuest = async (req: Request, res: Response) => {
  try {
    const updated = await Guest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await logAction(req, 'Update Guest', `Updated guest info: ${updated.name}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Bookings
export const addBooking = async (req: Request, res: Response) => {
  try {
    const booking = new Booking({ ...req.body, _id: req.body.id });
    await booking.save();
    await logAction(req, 'New Booking', `Created booking ${booking._id} for guest ${booking.guestId}`);
    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await logAction(req, 'Update Booking', `Booking ${updated._id} status changed to ${updated.status}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    await logAction(req, 'Delete Booking', `Deleted booking ${req.params.id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Payments
export const addPayment = async (req: Request, res: Response) => {
  try {
    const payment = new Payment({ ...req.body, _id: req.body.id });
    await payment.save();
    await logAction(req, 'Add Payment', `Added payment ${payment._id} of amount ${payment.amount} for booking ${payment.bookingId}`);
    res.json(payment.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Comms
export const addComm = async (req: Request, res: Response) => {
  try {
    const comm = new CommRecord({ ...req.body, _id: req.body.id });
    await comm.save();
    await logAction(req, 'Send Comm', `Sent ${comm.channel} to guest ${comm.guestId} - Template: ${comm.template}`);
    res.json(comm.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Invoices
export const addInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = new StandaloneInvoice({ ...req.body, _id: req.body.id });
    await invoice.save();
    await logAction(req, 'Generate Invoice', `Generated standalone invoice ${invoice._id} for ${invoice.customerName}`);
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const addStoredInvoice = async (req: Request, res: Response) => {
  try {
    const invoice = new StoredInvoice({ ...req.body, _id: req.body.invoiceId });
    await invoice.save();
    await logAction(req, 'Store Invoice Data', `Saved full invoice data ${invoice._id}`);
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Expenses
export const addExpense = async (req: Request, res: Response) => {
  try {
    const expense = new Expense({ ...req.body, _id: req.body.id });
    await expense.save();
    await logAction(req, 'Add Expense', `Added expense ${expense.id} of amount ₹${expense.amount} under ${expense.category}`);
    res.json(expense.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    await logAction(req, 'Delete Expense', `Deleted expense ${req.params.id}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};
