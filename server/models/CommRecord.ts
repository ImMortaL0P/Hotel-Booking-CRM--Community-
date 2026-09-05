import mongoose from 'mongoose';

const commSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  guestId: { type: String, required: true },
  channel: { type: String, required: true, enum: ['WhatsApp', 'SMS', 'Email'] },
  template: { type: String, required: true },
  timestamp: { type: String, required: true },
  status: { type: String, required: true, enum: ['Delivered', 'Sent', 'Failed', 'Scheduled'] }
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

export const CommRecord = mongoose.model('CommRecord', commSchema);
