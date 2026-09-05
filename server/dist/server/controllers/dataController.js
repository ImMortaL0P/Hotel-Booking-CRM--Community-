import { Room } from '../models/Room.js';
import { Guest } from '../models/Guest.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { CommRecord } from '../models/CommRecord.js';
// GET /api/initialize
// Fetch all initial data
export const initializeData = async (req, res) => {
    try {
        const rooms = await Room.find();
        const guests = await Guest.find();
        const bookings = await Booking.find();
        const payments = await Payment.find();
        const comms = await CommRecord.find();
        // Convert to JSON (triggers the transform we wrote)
        res.json({
            rooms: rooms.map(r => r.toJSON()),
            guests: guests.map(g => g.toJSON()),
            bookings: bookings.map(b => b.toJSON()),
            payments: payments.map(p => p.toJSON()),
            comms: comms.map(c => c.toJSON())
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// Rooms
export const updateRoom = async (req, res) => {
    try {
        const updated = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ error: 'Not found' });
        res.json(updated.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Guests
export const addGuest = async (req, res) => {
    try {
        const guest = new Guest({ ...req.body, _id: req.body.id });
        await guest.save();
        res.json(guest.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const updateGuest = async (req, res) => {
    try {
        const updated = await Guest.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ error: 'Not found' });
        res.json(updated.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Bookings
export const addBooking = async (req, res) => {
    try {
        const booking = new Booking({ ...req.body, _id: req.body.id });
        await booking.save();
        res.json(booking.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const updateBooking = async (req, res) => {
    try {
        const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated)
            return res.status(404).json({ error: 'Not found' });
        res.json(updated.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
export const deleteBooking = async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Payments
export const addPayment = async (req, res) => {
    try {
        const payment = new Payment({ ...req.body, _id: req.body.id });
        await payment.save();
        res.json(payment.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Comms
export const addComm = async (req, res) => {
    try {
        const comm = new CommRecord({ ...req.body, _id: req.body.id });
        await comm.save();
        res.json(comm.toJSON());
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
