import mongoose from 'mongoose';

const standaloneInvoiceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  gst: { type: Number, required: true },
  total: { type: Number, required: true },
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

export const StandaloneInvoice = mongoose.model('StandaloneInvoice', standaloneInvoiceSchema);
