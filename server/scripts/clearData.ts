import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Booking } from '../models/Booking.js';
import { Guest } from '../models/Guest.js';
import { Log } from '../models/Log.js';
import { Room } from '../models/Room.js';

dotenv.config();

const clearData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB Atlas.');

    await Booking.deleteMany({});
    console.log('Bookings cleared.');

    await Guest.deleteMany({});
    console.log('Guests cleared.');

    await Log.deleteMany({});
    console.log('Logs cleared.');

    // Clear out active status from rooms
    await Room.updateMany({}, { status: 'Available' });
    console.log('Rooms reset to Available.');

    console.log('All requested collections cleared successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

clearData();
