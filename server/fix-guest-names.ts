import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { Guest } from './models/Guest.js';

dotenv.config();

function titleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const fixNames = async () => {
    try {
        await connectDB();
        const guests = await Guest.find({});
        let updatedCount = 0;

        for (const guest of guests) {
            const oldName = guest.name;
            const newName = titleCase(oldName);

            if (oldName !== newName) {
                guest.name = newName;
                await guest.save();
                updatedCount++;
            }
        }

        console.log(`Successfully fixed ${updatedCount} guest names.`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixNames();
