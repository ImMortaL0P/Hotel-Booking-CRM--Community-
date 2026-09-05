import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  number: { type: String, required: true },
  category: { type: String, required: true, enum: ['Standard', 'Deluxe', 'AC Deluxe', 'Family Suite'] },
  status: { type: String, required: true, enum: ['Available', 'Occupied', 'Maintenance', 'Cleaning'] },
  tariff: { type: Number, required: true },
  floor: { type: Number, required: true },
  amenities: [{ type: String }]
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

export const Room = mongoose.model('Room', roomSchema);
