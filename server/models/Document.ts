import mongoose, { Document, Schema } from 'mongoose';

export interface IDocument extends Document {
  documentId: string;
  title: string;
  type: 'Invoice' | 'Receipt' | 'Expense';
  driveFileId: string;
  webViewLink: string;
  webContentLink: string;
  createdAt: Date;
}

const DocumentSchema: Schema = new Schema({
  documentId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, required: true, enum: ['Invoice', 'Receipt', 'Expense'] },
  driveFileId: { type: String, required: true },
  webViewLink: { type: String, required: true },
  webContentLink: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Explicit JSON transform to stringify object IDs properly
DocumentSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  }
});

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
