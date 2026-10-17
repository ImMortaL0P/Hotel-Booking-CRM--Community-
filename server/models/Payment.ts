import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  bookingId: { type: String, default: '-' },
  guestId: { type: String, default: '-' },
  date: { type: String, required: true },
  mode: { type: String, required: true, enum: ['Cash', 'UPI', 'Card', 'Bank Transfer'] },
  amount: { type: Number, required: true },
  status: { type: String, required: true, enum: ['Completed', 'Pending', 'Failed', 'Refunded'] },
  description: { type: String, default: '' },
  roomId: { type: String, default: null }
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

// Incremental sync (/api/sync) reads rows changed since a timestamp
paymentSchema.index({ updatedAt: 1 });
paymentSchema.index({ bookingId: 1 });

export const Payment = mongoose.model('PaymentTransaction', paymentSchema);
