import mongoose from 'mongoose';

/**
 * Records deletions so incremental sync (/api/sync?since=) can tell clients
 * to drop rows they have cached. Expire after 60 days — a client that has been
 * offline longer does a full reload instead.
 */
const tombstoneSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // `${collection}:${docId}`
  collectionName: { type: String, required: true },
  docId: { type: String, required: true },
  deletedAt: { type: Date, required: true, default: () => new Date() }
});
tombstoneSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 60 * 86400 });

export const Tombstone = mongoose.model('Tombstone', tombstoneSchema);

export type SyncedCollection = 'bookings' | 'expenses' | 'payments' | 'guests' | 'rooms' | 'comms' | 'invoices' | 'storedInvoices';

export async function recordDeletion(collectionName: SyncedCollection, docIds: string | string[]) {
  const ids = Array.isArray(docIds) ? docIds : [docIds];
  if (!ids.length) return;
  const now = new Date();
  await Tombstone.bulkWrite(ids.map(docId => ({
    updateOne: {
      filter: { _id: `${collectionName}:${docId}` },
      update: { $set: { collectionName, docId, deletedAt: now } },
      upsert: true
    }
  })), { ordered: false });
}
