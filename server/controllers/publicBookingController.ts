import { Request, Response } from 'express';
import { BookingModel } from '../models/Booking.js';
import { GuestModel } from '../models/Guest.js';
import { RoomModel } from '../models/Room.js';
import { LogModel } from '../models/Log.js';
import { sendBookingConfirmationEmail } from '../services/emailService.js';

export const submitPublicBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      guestName,
      guestEmail,
      guestPhone,
      guestAddress,
      checkIn,
      checkOut,
      adults = 1,
      children = 0,
      roomCategory = 'Double Bed Room',
      specialRequests
    } = req.body;

    if (!guestName || !guestPhone || !checkIn || !checkOut) {
      res.status(400).json({ success: false, message: 'Missing required guest information or dates.' });
      return;
    }

    // Standard check-in 12:00 PM, checkout 11:00 AM
    const checkInDate = new Date(checkIn.includes('T') ? checkIn : `${checkIn}T12:00:00`);
    const checkOutDate = new Date(checkOut.includes('T') ? checkOut : `${checkOut}T11:00:00`);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      res.status(400).json({ success: false, message: 'Invalid check-in or check-out date format.' });
      return;
    }

    if (checkOutDate.getTime() <= checkInDate.getTime()) {
      res.status(400).json({ success: false, message: 'Check-out date must be after check-in date.' });
      return;
    }

    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Find all operational rooms in requested category (exclude Coming Soon 201, 202, 203)
    const operationalRooms = await RoomModel.find({
      category: roomCategory,
      status: { $nin: ['Coming Soon', 'Maintenance'] }
    });

    if (operationalRooms.length === 0) {
      res.status(400).json({
        success: false,
        message: `No operational rooms are currently active for category "${roomCategory}".`
      });
      return;
    }

    // Find conflicting bookings
    const existingBookings = await BookingModel.find({
      roomId: { $in: operationalRooms.map(r => r.id) },
      status: { $nin: ['Cancelled', 'Checked-Out'] }
    });

    // Check availability
    let allocatedRoom = operationalRooms.find(room => {
      const conflicts = existingBookings.filter(b => {
        if (b.roomId !== room.id) return false;
        const bIn = new Date(b.checkIn).getTime();
        const bOut = new Date(b.checkOut).getTime();
        return checkInDate.getTime() < bOut && checkOutDate.getTime() > bIn;
      });
      return conflicts.length === 0;
    });

    // If all operational rooms are occupied, assign to first operational room for admin review
    if (!allocatedRoom) {
      allocatedRoom = operationalRooms[0];
    }

    const tariff = allocatedRoom.tariff || (roomCategory === 'Family Bed Room' ? 3000 : 1500);
    const totalAmount = tariff * nights;

    // 1. Create or update Guest
    let guest = await GuestModel.findOne({
      $or: [
        { phone: guestPhone },
        ...(guestEmail ? [{ email: guestEmail }] : [])
      ]
    });

    const guestId = guest?.id || `g-${Date.now().toString(36)}`;
    if (!guest) {
      guest = new GuestModel({
        id: guestId,
        name: guestName.trim(),
        email: guestEmail?.trim() || '',
        phone: guestPhone.trim(),
        address: guestAddress?.trim() || 'Direct Online Booking',
        idType: 'Aadhaar',
        idNumber: '',
        history: [],
        createdAt: new Date()
      });
      await guest.save();
    } else {
      // Update contact details if provided
      if (guestEmail && !guest.email) guest.email = guestEmail.trim();
      if (guestAddress && !guest.address) guest.address = guestAddress.trim();
      await guest.save();
    }

    // 2. Create Booking
    const bookingId = `SP-${Date.now().toString().slice(-6)}`;
    const newBooking = new BookingModel({
      id: bookingId,
      guestId: guest.id,
      roomId: allocatedRoom.id,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate.toISOString(),
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      status: 'Booked', // Initial status awaiting admin confirmation
      paymentStatus: 'Pending',
      source: 'Website / Guest Request',
      specialRequests: specialRequests?.trim() || '',
      createdAt: new Date()
    });

    await newBooking.save();

    // 3. Log System Activity
    await new LogModel({
      id: `log-${Date.now().toString(36)}`,
      action: 'Online Booking Request',
      details: `New online reservation request ${bookingId} submitted by ${guestName} for Room ${allocatedRoom.number} (${roomCategory}, ${nights}N).`,
      userName: 'Guest Booking Portal',
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      data: {
        bookingId: newBooking.id,
        guestId: guest.id,
        roomNumber: allocatedRoom.number,
        roomCategory: allocatedRoom.category,
        checkIn: newBooking.checkIn,
        checkOut: newBooking.checkOut,
        nights,
        totalAmount,
        status: newBooking.status,
        message: 'Your booking request has been received and registered directly in our reservation desk!'
      }
    });
  } catch (error: any) {
    console.error('Error submitting public booking:', error);
    res.status(500).json({ success: false, message: 'Failed to submit booking request', error: error.message });
  }
};

export const sendConfirmationEmailHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const booking = await BookingModel.findOne({ id }) || await BookingModel.findById(id);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const [guest, room] = await Promise.all([
      GuestModel.findOne({ id: booking.guestId }),
      RoomModel.findOne({ id: booking.roomId })
    ]);

    if (!guest || !guest.email) {
      res.status(400).json({
        success: false,
        message: 'Guest does not have a registered email address to receive confirmation.'
      });
      return;
    }

    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    const result = await sendBookingConfirmationEmail({
      bookingId: booking.id,
      guestName: guest.name,
      guestEmail: guest.email,
      guestPhone: guest.phone,
      roomNumber: room?.number || 'TBD',
      roomCategory: room?.category || 'Standard Room',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights,
      adults: booking.adults || 1,
      children: booking.children || 0,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount || 0,
      balanceAmount: booking.balance || (booking.totalAmount - (booking.paidAmount || 0)),
      specialRequests: booking.specialRequests
    });

    if (result.success) {
      // Log the dispatch
      await new LogModel({
        id: `log-${Date.now().toString(36)}`,
        action: 'Email Confirmation Sent',
        details: `Detailed booking confirmation email sent to ${guest.email} for Booking ${booking.id}.`,
        userName: (req as any).user?.name || 'Reservation Desk',
        timestamp: new Date()
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in sendConfirmationEmailHandler:', error);
    res.status(500).json({ success: false, message: 'Internal error sending confirmation email', error: error.message });
  }
};
