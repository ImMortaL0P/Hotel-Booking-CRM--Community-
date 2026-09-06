import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  id: { type: String }, // To satisfy legacy unique indexes in MongoDB
  date: { type: String, required: true }, // YYYY-MM-DD
  amount: { type: Number, required: true },
  category: {
    type: String,
    required: true,
    enum: ['Staff Payment', 'Maintenance', 'Furniture', 'Utility', 'Inventory', 'Other']
  },
  description: { type: String },
  roomId: { type: String }, // Optional: If the expense is tied to a specific room
  recordedBy: { type: String, required: true } // User ID or Name
}, { timestamps: true });

// Ensure id maps to _id correctly for JSON responses
expenseSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const Expense = mongoose.model('Expense', expenseSchema);
