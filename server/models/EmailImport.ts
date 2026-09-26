import mongoose from 'mongoose';

/**
 * One row per inbox email the importer has looked at. The unique messageId
 * makes syncing idempotent: an email is never imported twice, however often
 * the inbox is polled.
 */
const emailImportSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  provider: { type: String, required: true },
  messageId: { type: String, required: true, unique: true },
  from: { type: String, default: '' },
  subject: { type: String, default: '' },
  receivedAt: { type: String, required: true, index: true },
  status: {
    type: String,
    required: true,
    enum: ['imported', 'updated', 'cancelled', 'duplicate', 'needs_review', 'ignored', 'failed'],
    index: true
  },
  action: { type: String, enum: ['NEW', 'MODIFY', 'CANCEL', null], default: null },
  source: { type: String, default: null },
  channelBookingId: { type: String, default: null, index: true },
  bookingIds: [{ type: String }],
  guestId: { type: String, default: null },
  paymentIds: [{ type: String }],
  expenseIds: [{ type: String }],
  /** Human-readable outcome, e.g. "Assigned Room 102" or "Missing check-out date" */
  message: { type: String, default: '' },
  parsed: { type: mongoose.Schema.Types.Mixed, default: null },
  /** Kept (truncated) so an email can be re-processed or inspected later */
  rawText: { type: String, default: '' },
  processedAt: { type: String, required: true }
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

export const EmailImport = mongoose.model('EmailImport', emailImportSchema);
