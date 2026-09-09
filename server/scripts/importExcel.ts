import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import path from 'path';
import { connectDB } from '../db.js';
import { Room } from '../models/Room.js';
import { Guest } from '../models/Guest.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { CommRecord } from '../models/CommRecord.js';

dotenv.config();

const EXCEL_PATH = "/Users/mangalam/Downloads/APFO/Check-in 2026-02-01 to 2026-09-10.xls";

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

const importExcel = async () => {
    try {
        await connectDB();
        console.log('Clearing existing bookings, guests, payments and comm records...');
        try { await Booking.collection.drop(); } catch (e) {}
        try { await Guest.collection.drop(); } catch (e) {}
        try { await Payment.collection.drop(); } catch (e) {}
        try { await CommRecord.collection.drop(); } catch (e) {}

        console.log('Reading Excel file...');
        const wb = xlsx.readFile(EXCEL_PATH);
        const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

        console.log(`Found ${data.length} records. Importing...`);

        let rooms = await Room.find({});
        if (rooms.length === 0) {
            console.log("No rooms found, creating dummy rooms...");
            const dummyRooms = [
                { _id: 'rm-101', number: '101', category: 'Double Bed Room', status: 'Available', tariff: 1000, floor: 1, amenities: [] },
                { _id: 'rm-102', number: '102', category: 'Double Bed Room', status: 'Available', tariff: 1000, floor: 1, amenities: [] },
                { _id: 'rm-103', number: '103', category: 'Family Bed Room', status: 'Available', tariff: 1500, floor: 1, amenities: [] }
            ];
            await Room.insertMany(dummyRooms);
            rooms = await Room.find({});
        }

        let doubleRoomIndex = 0;

        for (const row of data as any[]) {
            // Guest processing
            let rawName = row['Guest Name(s)'] || row['Booked by'] || 'Unknown Guest';
            const normalizedName = rawName.trim().toLowerCase();

            let guest = await Guest.findOne({ name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } });

            if (!guest) {
                guest = new Guest({
                    _id: generateId('gst'),
                    name: rawName,
                    totalStays: 0,
                    totalSpent: 0
                });
            }

            let priceStr = row['Price'] || '0';
            const price = parseFloat(String(priceStr).replace(/[^0-9.]/g, '')) || 0;

            let commissionStr = row['Commission Amount'] || '0';
            const commission = parseFloat(String(commissionStr).replace(/[^0-9.]/g, '')) || 0;

            const nights = parseInt(row['Duration (nights)']) || 1;

            guest.totalStays += 1;
            guest.totalSpent += price;
            guest.lastStay = new Date(row['Check-in']).toISOString();

            await guest.save();

            const channelStatus = row['Status'];
            let status = 'Confirmed';
            if (channelStatus === 'cancelled_by_guest') status = 'Cancelled';
            else if (channelStatus === 'no_show') status = 'No Show';

            const room = rooms[roomIndex % rooms.length];
            roomIndex++;

            const bookedOnStr = row['Booked on'];
            const createdAt = bookedOnStr ? new Date(bookedOnStr).toISOString() : new Date().toISOString();

            const checkInD = new Date(row['Check-in']);
            const checkOutD = new Date(row['Check-out']);

            const booking = new Booking({
                _id: generateId('bk'),
                guestId: guest._id,
                roomId: room._id,
                checkIn: checkInD.toISOString(),
                checkOut: checkOutD.toISOString(),
                adults: parseInt(row['Adults']) || 2,
                children: parseInt(row['Children']) || 0,
                nights: nights,
                subtotal: price,
                gst: 0,
                total: price,
                paid: 0,
                balance: price,
                status: status,
                createdAt: createdAt,
                source: 'Booking.com',
                channelBookingId: (row['Book Number'] || '').toString(),
                channelStatus: channelStatus,
                commission: commission,
                netRevenue: price - commission,
                bookedBy: row['Booked by'],
                bookerCountry: row['Booker country'],
                device: row['Device'],
                unitType: row['Unit type'],
                channelRoomsCount: row['Rooms'] || 1,
                notes: `Travel purpose: ${row['Travel purpose'] || 'N/A'}, Remarks: ${row['Remarks'] || 'None'}`
            });

            await booking.save();
        }

        console.log('Import successfully completed!');
        process.exit(0);
    } catch (err) {
        console.error('Import failed:', err);
        process.exit(1);
    }
};

importExcel();