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
  INITIAL_GUESTS,
  INITIAL_BOOKINGS,
  INITIAL_PAYMENTS,
  INITIAL_COMMS
} from '../../src/app/data/seedData';

dotenv.config();

const seed = async () => {
  try {
    await connectDB();
    console.log('Clearing existing data...');
    await Room.deleteMany();
    await Guest.deleteMany();
    await Booking.deleteMany();
    await Payment.deleteMany();
    await CommRecord.deleteMany();

    console.log('Inserting seed data...');
    await Room.insertMany(INITAL_ROOMS.map(x => ({...x, _id: x.id})));
    await Guest.insertMany(INITIAL_GUESTS.map(x => ({...x, _id: x.id})));
    await Booking.insertMany(INITIAL_BOOKINGS.map(x => ({...x, _id: x.id})));
    await Payment.insertMany(INITIAL_PAYMENTS.map(x => ({...x, _id: x.id})));
    await CommRecord.insertMany(INITIAL_COMMS.map(x => ({...x, _id: x.id})));

    console.log('Database Seeding Completed Successfully! ✅');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
