import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { Booking } from './models/Booking.js';

dotenv.config();

const fixBalances = async () => {
    try {
        await connectDB();
        const bookings = await Booking.find({});
        
        let checkedOutCount = 0;
        let zeroBalanceCount = 0;
        let today = new Date();

        for (const booking of bookings) {
            let changed = false;
            
            let checkOutDate = new Date(booking.checkOut);
            
            if (booking.status === 'Confirmed' && checkOutDate < today) {
                booking.status = 'Checked-Out';
                changed = true;
            }

            if (booking.status === 'Checked-Out') {
                if (booking.paid !== booking.total) {
                    booking.paid = booking.total;
                    booking.balance = 0;
                    changed = true;
                    checkedOutCount++;
                }
            }

            if (booking.status === 'Cancelled' || booking.status === 'No Show') {
                if (booking.balance !== 0 || booking.total !== 0 || booking.paid !== 0) {
                    booking.paid = 0;
                    booking.total = 0;
                    booking.balance = 0;
                    booking.commission = 0;
                    booking.netRevenue = 0;
                    booking.subtotal = 0;
                    changed = true;
                    zeroBalanceCount++;
                }
            }

            if (changed) {
                await booking.save();
            }
        }

        console.log("Successfully fixed " + checkedOutCount + " checked-out balances and " + zeroBalanceCount + " cancelled/no-show balances.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixBalances();
