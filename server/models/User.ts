import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // userId/username
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['superadmin', 'owner', 'front-desk', 'Manager', 'Front Desk'] },
  avatar: { type: String }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
    }
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model('User', userSchema);
