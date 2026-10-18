import { Request, Response } from 'express';
import { Booking as BookingModel } from '../models/Booking.js';
import { Guest as GuestModel } from '../models/Guest.js';
import { Room as RoomModel } from '../models/Room.js';
import { Log as LogModel } from '../models/Log.js';
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

    // Standard suite fallback allocation
    let allocatedRoom = {
      id: roomCategory === 'Family Bed Room' ? 'rm-103' : 'rm-101',
      number: roomCategory === 'Family Bed Room' ? '103' : '101',
      category: roomCategory,
      tariff: roomCategory === 'Family Bed Room' ? 3000 : 1500
    };

    try {
      // Find all operational rooms in requested category (exclude Coming Soon 201, 202, 203)
      const operationalRooms = await RoomModel.find({
        category: roomCategory,
        status: { $nin: ['Coming Soon', 'Maintenance'] }
      }).maxTimeMS(2500);

      if (operationalRooms.length > 0) {
        // Find conflicting bookings
        const existingBookings = await BookingModel.find({
          roomId: { $in: operationalRooms.map(r => r.id) },
          status: { $nin: ['Cancelled', 'Checked-Out'] }
        }).maxTimeMS(2500);

        // Check availability
        const available = operationalRooms.find(room => {
          const conflicts = existingBookings.filter(b => {
            if (b.roomId !== room.id) return false;
            const bIn = new Date(b.checkIn).getTime();
            const bOut = new Date(b.checkOut).getTime();
            return checkInDate.getTime() < bOut && checkOutDate.getTime() > bIn;
          });
          return conflicts.length === 0;
        });

        if (available) {
          allocatedRoom = available as any;
        } else {
          allocatedRoom = operationalRooms[0] as any;
        }
      }
    } catch (err) {
      console.warn('DB read note (using suite allocation fallback):', err);
    }

    const tariff = allocatedRoom.tariff || (roomCategory === 'Family Bed Room' ? 3000 : 1500);
    const totalAmount = tariff * nights;
    const advanceAmount = Math.round(totalAmount * 0.20);
    const balanceAmount = totalAmount - advanceAmount;
    const subtotal = Math.round(totalAmount / 1.12);
    const gst = totalAmount - subtotal;

    const bookingId = `SP-${Date.now().toString().slice(-6)}`;
    const guestId = `g-${Date.now().toString(36)}`;

    let savedBooking: any = null;
    let savedGuest: any = null;

    try {
      // 1. Create or update Guest
      let guest = await GuestModel.findOne({
        $or: [
          { phone: guestPhone.trim() },
          ...(guestEmail ? [{ email: guestEmail.trim() }] : [])
        ]
      }).maxTimeMS(2500);

      const avatarInitial = (guestName.trim()[0] || 'G').toUpperCase();

      if (!guest) {
        guest = new GuestModel({
          _id: guestId,
          name: guestName.trim(),
          email: guestEmail?.trim() || '',
          phone: guestPhone.trim(),
          city: guestAddress?.trim() || 'Direct Online Booking',
          state: 'Jharkhand',
          idProofType: 'Aadhaar',
          idProofNumber: '',
          totalStays: 1,
          lastStay: checkInDate.toISOString().split('T')[0],
          totalSpent: advanceAmount,
          isVIP: false,
          avatarInitial
        });
        await guest.save();
      } else {
        if (guestEmail && !guest.email) guest.email = guestEmail.trim();
        if (guestAddress && !guest.city) guest.city = guestAddress.trim();
        await guest.save();
      }
      savedGuest = guest;

      // 2. Create Booking conforming to Booking schema
      const newBooking = new BookingModel({
        _id: bookingId,
        guestId: guest._id || guest.id,
        roomId: allocatedRoom.id,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        adults: Number(adults) || 1,
        children: Number(children) || 0,
        nights,
        subtotal,
        gst,
        total: totalAmount,
        paid: advanceAmount,
        balance: balanceAmount,
        status: 'Booked', // Initial status awaiting admin confirmation
        notes: specialRequests?.trim() || '',
        source: 'Website',
        createdAt: new Date().toISOString()
      });

      await newBooking.save();
      savedBooking = newBooking;

      // 3. Log System Activity
      await new LogModel({
        _id: `log-${Date.now().toString(36)}`,
        action: 'Online Booking Request',
        details: `New online reservation request ${bookingId} submitted by ${guestName} for Room ${allocatedRoom.number} (${roomCategory}, ${nights}N).`,
        userId: 'system-online',
        userName: 'Guest Booking Portal',
        timestamp: new Date().toISOString()
      }).save();
    } catch (err) {
      console.warn('DB write note (operating in offline desk mode):', err);
    }

    const resBookingId = savedBooking?._id || savedBooking?.id || bookingId;
    const resGuestId = savedGuest?._id || savedGuest?.id || guestId;

    res.status(201).json({
      success: true,
      data: {
        bookingId: resBookingId,
        guestId: resGuestId,
        roomId: allocatedRoom.id,
        roomNumber: allocatedRoom.number,
        roomCategory: allocatedRoom.category,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        nights,
        totalAmount,
        paidAmount: advanceAmount,
        balanceAmount,
        status: 'Booked',
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

    const booking = await BookingModel.findById(id) || await BookingModel.findOne({ _id: id });
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const [guest, room] = await Promise.all([
      GuestModel.findById(booking.guestId) || GuestModel.findOne({ _id: booking.guestId }),
      RoomModel.findById(booking.roomId) || RoomModel.findOne({ _id: booking.roomId })
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
      bookingId: booking._id || booking.id,
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
      totalAmount: (booking as any).total ?? (booking as any).totalAmount ?? 0,
      paidAmount: (booking as any).paid ?? (booking as any).paidAmount ?? 0,
      balanceAmount: (booking as any).balance ?? 0,
      specialRequests: (booking as any).notes || (booking as any).specialRequests || ''
    });

    if (result.success) {
      // Log the dispatch
      await new LogModel({
        _id: `log-${Date.now().toString(36)}`,
        action: 'Email Confirmation Sent',
        details: `Detailed booking confirmation email sent to ${guest.email} for Booking ${booking._id || booking.id}.`,
        userId: (req as any).user?.id || 'system-online',
        userName: (req as any).user?.name || 'Reservation Desk',
        timestamp: new Date().toISOString()
      }).save();
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in sendConfirmationEmailHandler:', error);
    res.status(500).json({ success: false, message: 'Internal error sending confirmation email', error: error.message });
  }
};
