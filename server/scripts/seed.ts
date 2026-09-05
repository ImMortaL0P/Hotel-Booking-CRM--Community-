import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../db.js';
import { Room } from '../models/Room.js';
import { Guest } from '../models/Guest.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { CommRecord } from '../models/CommRecord.js';

import {
  INITAL_ROOMS,
  INITAL_GUESTS,
  INITAL_BOOKINGS,
  INITAL_PAYMENTS,
  INITAL_COMMS
} from '../../src/app/data/seedData.ts';

dotenv.config();

const seed = async () => {
  try {
    await connectDB();
    console.log('Upserting seed data to prevent destructive drops...');

    const validRoomIds = ['rm-101', 'rm-102', 'rm-103'];

    // Remove individual excess rooms manually
    for (let i = 104; i <= 404; i++) {
        await Room.findByIdAndDelete(`rm-${i}`);
    }

    for (const room of INITAL_ROOMS) {
      await Room.findByIdAndUpdate(room.id, { ...room, _id: room.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    for (const guest of INITAL_GUESTS) {
      await Guest.findByIdAndUpdate(guest.id, { ...guest, _id: guest.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    const validBookings = INITAL_BOOKINGS.filter(b => validRoomIds.includes(b.roomId));

    for (const booking of validBookings) {
      await Booking.findByIdAndUpdate(booking.id, { ...booking, _id: booking.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    const validBookingIds = validBookings.map(b => b.id);
    const validPayments = INITAL_PAYMENTS.filter(p => validBookingIds.includes(p.bookingId));

    for (const payment of validPayments) {
      await Payment.findByIdAndUpdate(payment.id, { ...payment, _id: payment.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    for (const comm of INITAL_COMMS) {
      await CommRecord.findByIdAndUpdate(comm.id, { ...comm, _id: comm.id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    console.log('Database Seeding/Upsert Completed Successfully! ✅');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
