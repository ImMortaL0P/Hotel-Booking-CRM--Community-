import mongoose from 'mongoose';
const paymentSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    bookingId: { type: String, required: true },
    guestId: { type: String, required: true },
    date: { type: String, required: true },
    mode: { type: String, required: true, enum: ['Cash', 'UPI', 'Card', 'Bank Transfer'] },
    amount: { type: Number, required: true },
    status: { type: String, required: true, enum: ['Completed', 'Pending', 'Failed', 'Refunded'] }
}, {
    timestamps: true,
    toJSON: {
        transform: (doc, ret) => {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
        }
    }
});
export const Payment = mongoose.model('PaymentTransaction', paymentSchema);
