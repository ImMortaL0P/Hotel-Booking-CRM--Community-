import dotenv from 'dotenv';
import { connectDB } from '../db.js';
import { Room } from '../models/Room.js';
import { Booking } from '../models/Booking.js';

dotenv.config();

const run = async () => {
  try {
    await connectDB();
    console.log('Marking all rooms Available in database...');
    const roomResult = await Room.updateMany({}, { $set: { status: 'Available' } });
    console.log(`Updated ${roomResult.modifiedCount} rooms to Available.`);

    const bookingResult = await Booking.updateMany(
      { status: 'Checked-In' },
      { $set: { status: 'Checked-Out' } }
    );
    console.log(`Updated ${bookingResult.modifiedCount} checked-in bookings to Checked-Out.`);

    console.log('Done! All rooms are now Available ✅');
    process.exit(0);
  } catch (err) {
    console.error('Failed to mark all rooms available:', err);
    process.exit(1);
  }
};

run();
