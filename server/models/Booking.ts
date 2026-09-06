import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  guestId: { type: String, required: true, index: true },
  roomId: { type: String, required: true, index: true },
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  adults: { type: Number, required: true },
  children: { type: Number, required: true },
  nights: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  gst: { type: Number, required: true },
  total: { type: Number, required: true },
  paid: { type: Number, required: true, default: 0 },
  balance: { type: Number, required: true },
  status: { type: String, required: true, enum: ['Booked', 'Confirmed', 'Checked-In', 'Checked-Out'], index: true },
  createdAt: { type: String, required: true },
  notes: { type: String }
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

// Compound index for timeline collision queries
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);
