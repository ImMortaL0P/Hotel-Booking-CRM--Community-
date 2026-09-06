import mongoose from 'mongoose';

const storedInvoiceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  invoiceId: { type: String, required: true },
  date: { type: String, required: true },
  billedTo: {
    name: { type: String },
    address: { type: String },
    cityState: { type: String },
    phone: { type: String },
    idPrefix: { type: String }
  },
  checkIn: { type: String },
  checkOut: { type: String },
  roomPlan: { type: String },
  paymentStatus: { type: String },
  items: [{
    id: { type: Number },
    description: { type: String },
    unitPrice: { type: Number },
    qty: { type: Number },
    discount: { type: Number },
    gstPct: { type: Number },
    amount: { type: Number }
  }],
  subtotal: { type: Number },
  gstTotal: { type: Number },
  total: { type: Number },
  staySummary: {
    nights: { type: Number },
    adults: { type: Number },
    children: { type: Number },
    room: { type: String },
    paymentMode: { type: String },
    amountReceived: { type: Number },
    balance: { type: Number }
  }
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

export const StoredInvoice = mongoose.model('StoredInvoice', storedInvoiceSchema);
