import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  guestId: { type: String, required: true },
  roomId: { type: String, required: true },
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
  status: { type: String, required: true, enum: ['Confirmed', 'Pending', 'Checked-In', 'Checked-Out', 'Cancelled'] },
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

export const Booking = mongoose.model('Booking', bookingSchema);
