import mongoose from 'mongoose';
const guestSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    idProofType: { type: String, enum: ['Aadhaar', 'Voter ID', 'PAN', 'Driving Licence', 'Passport'] },
    idProofNumber: { type: String },
    city: { type: String },
    state: { type: String },
    totalStays: { type: Number, default: 0 },
    lastStay: { type: String },
    totalSpent: { type: Number, default: 0 },
    isVIP: { type: Boolean, default: false },
    avatarInitial: { type: String }
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
export const Guest = mongoose.model('Guest', guestSchema);
