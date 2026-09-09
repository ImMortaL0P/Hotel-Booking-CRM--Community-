import mongoose from 'mongoose';
import dotenv from 'dotenv';
import xlsx from 'xlsx';
import { connectDB } from '../db.js';
import { Room } from '../models/Room.js';
import { Guest } from '../models/Guest.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';

dotenv.config();

const EXCEL_PATH = "/Users/mangalam/Downloads/APFO/Check-in 2026-02-01 to 2026-09-10.xls";
const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

const addLedgerRecords = async () => {
    try {
        await connectDB();
        console.log('Connected to DB. Checking existing data...');

        const rooms = await Room.find({});
        const room101 = rooms.find(r => r.number === '101');
        const room102 = rooms.find(r => r.number === '102');
        const room103 = rooms.find(r => r.number === '103');

        if (!room101 || !room102 || !room103) {
            console.error('Rooms 101, 102, 103 not found. Please run seed first.');
            process.exit(1);
        }

        // Count existing records
        const existingPayments = await Payment.countDocuments();
        const existingExpenses = await Expense.countDocuments();
        console.log(`Existing: ${existingPayments} payments, ${existingExpenses} expenses`);

        // Read Excel
        console.log('Reading Excel file...');
        const wb = xlsx.readFile(EXCEL_PATH);
        const data = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        console.log(`Found ${data.length} rows in sheet`);

        // Get existing bookings to match
        const bookings = await Booking.find({});
        const bookingMap = new Map<string, any>();
        bookings.forEach(b => {
            if (b.channelBookingId) {
                bookingMap.set(b.channelBookingId, b);
            }
        });

        // Get existing payment booking IDs to skip
        const existingPaymentBookingIds = new Set(
            (await Payment.find({}).select('bookingId')).map(p => p.bookingId)
        );

        let paymentCount = 0;
        let expenseCount = 0;
        let skipped = 0;
        let skippedPayment = 0;
        let skippedExpense = 0;

        for (const row of data as any[]) {
            const bookNumber = String(row['Book Number'] || '');
            const booking = bookingMap.get(bookNumber);

            if (!booking) {
                skipped++;
                continue;
            }

            const channelStatus = row['Status'];
            const price = parseFloat(String(row['Price'] || '0').replace(/[^0-9.]/g, '')) || 0;
            const commission = parseFloat(String(row['Commission Amount'] || '0').replace(/[^0-9.]/g, '')) || 0;
            const checkInDate = new Date(row['Check-in']).toISOString();

            // Assign room based on unit type
            const unitType = (row['Unit type'] || '').toLowerCase();
            let assignedRoom = room101;
            if (unitType.includes('family') && !unitType.includes('double')) {
                assignedRoom = room103;
            } else if (unitType.includes('double')) {
                assignedRoom = booking.roomId === room103._id ? room101 : booking.roomId === room102._id ? room102 : room101;
            }

            // Create Payment for confirmed bookings (ok status)
            if (channelStatus === 'ok' && price > 0) {
                if (!existingPaymentBookingIds.has(booking._id)) {
                    const payment = new Payment({
                        _id: generateId('RCPT'),
                        bookingId: booking._id,
                        guestId: booking.guestId,
                        date: checkInDate,
                        mode: 'Cash',
                        amount: price,
                        status: 'Completed'
                    });
                    await payment.save();
                    existingPaymentBookingIds.add(booking._id);
                    paymentCount++;
                } else {
                    skippedPayment++;
                }
            }

            // Create Expense for commission
            if (commission > 0) {
                const guest = await Guest.findById(booking.guestId);
                const expenseExists = await Expense.exists({
                    $or: [
                        { description: { $regex: bookNumber } },
                        { _id: { $regex: `^EXP.*${bookNumber}` } }
                    ]
                });
                if (!expenseExists) {
                    const newId = generateId('EXP');
                    await mongoose.connection.collection('expenses').insertOne({
                        _id: newId,
                        id: newId,
                        date: checkInDate.split('T')[0],
                        amount: commission,
                        category: 'Commission',
                        description: `Booking.com commission #${bookNumber} (${guest?.name || 'Unknown'}, Room ${assignedRoom.number})`,
                        roomId: assignedRoom._id,
                        recordedBy: 'System Import',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    expenseCount++;
                } else {
                    skippedExpense++;
                }
            }
        }

        console.log(`\nDone!`);
        console.log(`- Added ${paymentCount} payment records (income)`);
        console.log(`- Added ${expenseCount} expense records (commissions)`);
        console.log(`- Skipped ${skipped} rows (booking not found)`);
        console.log(`- Skipped ${skippedPayment} payments (already exist)`);
        console.log(`- Skipped ${skippedExpense} expenses (already exist)`);
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    }
};

addLedgerRecords();
