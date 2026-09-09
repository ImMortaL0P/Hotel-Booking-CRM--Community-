import mongoose from 'dotenv';
import { connectDB } from './db.js';
import { Booking } from './models/Booking.js';
import dotenv from 'dotenv';

dotenv.config();

const count = async () => {
    await connectDB();
    const all = await Booking.find({});
    
    let checkedOut = 0;
    let confirmed = 0;
    let cancelled = 0;
    let noShow = 0;
    
    for (const b of all) {
        if (b.status === 'Checked-Out') checkedOut++;
        else if (b.status === 'Confirmed') confirmed++;
        else if (b.status === 'Cancelled') cancelled++;
        else if (b.status === 'No Show') noShow++;
    }
    
    console.log(`Total: ${all.length}`);
    console.log(`Checked-Out: ${checkedOut}`);
    console.log(`Confirmed: ${confirmed}`);
    console.log(`Cancelled: ${cancelled}`);
    console.log(`No Show: ${noShow}`);
    
    process.exit(0);
}

count();
