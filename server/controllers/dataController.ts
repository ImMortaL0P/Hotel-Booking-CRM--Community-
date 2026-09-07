import { Request, Response } from 'express';
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
import { pushAvailability, confirmChannelReservation, rejectChannelReservation } from '../services/channelManagerService.js';

// Log Action Helper
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
export const updateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes, housekeepingStatus } = req.body;
    const updateData = { status, notes, housekeepingStatus };
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

    const updated = await Room.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await logAction(req, 'Room Update', `Room ${updated.number} status changed to ${updated.status}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Guests
export const addGuest = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, idProof, idProofNumber, address, totalBookings, totalSpent, preferences, notes, channelGuestId } = req.body;
    const guestData = { name, email, phone, idProof, idProofNumber, address, totalBookings, totalSpent, preferences, notes, channelGuestId };

    // Default id based on body or new ID if missing
    const guest = new Guest({ ...guestData, _id: req.body.id });
    await guest.save();
    await logAction(req, 'Add Guest', `Added new guest: ${guest.name}`);
    res.json(guest.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateGuest = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, idProof, idProofNumber, address, totalBookings, totalSpent, preferences, notes, channelGuestId } = req.body;
    const updateData = { name, email, phone, idProof, idProofNumber, address, totalBookings, totalSpent, preferences, notes, channelGuestId };
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

    const updated = await Guest.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    await logAction(req, 'Update Guest', `Updated guest info: ${updated.name}`);
    res.json(updated.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Bookings
export const addBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { guestId, roomId, checkIn, checkOut, adults, children, status, total, paid, balance, source, channelBookingId, channelStatus, commission, netRevenue, channelRatePlan } = req.body;
    const bookingData = { guestId, roomId, checkIn, checkOut, adults, children, status, total, paid, balance, source, channelBookingId, channelStatus, commission, netRevenue, channelRatePlan };

    const booking = new Booking({ ...bookingData, _id: req.body.id });
    await booking.save();
    await logAction(req, 'New Booking', `Created booking ${booking._id} for guest ${booking.guestId}`);

    // Trigger outbound sync in background (fire and forget)
    pushAvailability(booking.checkIn, booking.checkOut).catch(console.error);

    res.json(booking.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { guestId, roomId, checkIn, checkOut, adults, children, status, total, paid, balance, source, channelBookingId, channelStatus, commission, netRevenue, channelRatePlan } = req.body;
    const updateData = { guestId, roomId, checkIn, checkOut, adults, children, status, total, paid, balance, source, channelBookingId, channelStatus, commission, netRevenue, channelRatePlan };
    Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);

    const oldBooking = await Booking.findById(req.params.id);
    const updated = await Booking.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    await logAction(req, 'Update Booking', `Booking ${updated._id} status changed to ${updated.status}`);

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
    const booking = await Booking.findById(req.params.id);
    await Booking.findByIdAndDelete(req.params.id);
    await logAction(req, 'Delete Booking', `Deleted booking ${req.params.id}`);

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

    await logAction(req, 'Confirm OTA Booking', `Confirmed OTA Booking ${booking._id}`);

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

    await logAction(req, 'Reject OTA Booking', `Rejected OTA Booking ${booking._id}`);

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
export const addPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, guestId, amount, mode, date, status } = req.body;
    const paymentData = { bookingId, guestId, amount, mode, date, status };
    const payment = new Payment({ ...paymentData, _id: req.body.id });
    await payment.save();
    await logAction(req, 'Add Payment', `Added payment ${payment._id} of amount ${payment.amount} for booking ${payment.bookingId}`);
    res.json(payment.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Comms
export const addComm = async (req: AuthRequest, res: Response) => {
  try {
    const { guestId, type, channel, template, status, sentAt, content } = req.body;
    const commData = { guestId, type, channel, template, status, sentAt, content };
    const comm = new CommRecord({ ...commData, _id: req.body.id });
    await comm.save();
    await logAction(req, 'Send Comm', `Sent ${comm.channel} to guest ${comm.guestId} - Template: ${comm.template}`);
    res.json(comm.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Invoices
export const addInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceNumber, customerName, customerAddress, customerGst, amount, cgst, sgst, total, date, items } = req.body;
    const invoiceData = { invoiceNumber, customerName, customerAddress, customerGst, amount, cgst, sgst, total, date, items };
    const invoice = new StandaloneInvoice({ ...invoiceData, _id: req.body.id });
    await invoice.save();
    await logAction(req, 'Generate Invoice', `Generated standalone invoice ${invoice._id} for ${invoice.customerName}`);
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const addStoredInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, invoiceNumber, data } = req.body;
    const invoiceData = { bookingId, invoiceNumber, data };
    const invoice = new StoredInvoice({ ...invoiceData, _id: req.body.invoiceId });
    await invoice.save();
    await logAction(req, 'Store Invoice Data', `Saved full invoice data ${invoice._id}`);
    res.json(invoice.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

// Expenses
export const addExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { category, amount, date, description, approvedBy, receiptUrl } = req.body;
    const expenseData = { category, amount, date, description, approvedBy, receiptUrl };
    const expense = new Expense({ ...expenseData, _id: req.body.id });
    await expense.save();
    await logAction(req, 'Add Expense', `Added expense ${expense.id} of amount ₹${expense.amount} under ${expense.category}`);
    res.json(expense.toJSON());
  } catch (error: any) {
    console.error(error); res.status(400).json({ error: error.message });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    await logAction(req, 'Delete Expense', `Deleted expense ${req.params.id}`);
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
