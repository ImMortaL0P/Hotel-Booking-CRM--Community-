import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  timestamp: { type: String, required: true, index: true },
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

// Incremental sync polls logs by creation time
logSchema.index({ createdAt: 1 });

export const Log = mongoose.model('Log', logSchema);
