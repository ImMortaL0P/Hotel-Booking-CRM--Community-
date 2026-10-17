import { Request, Response } from 'express';
import { EmailImport } from '../models/EmailImport.js';
import { getInboxProvider, addDummyTestEmail } from '../services/emailInbox/index.js';
import { syncInbox, reprocessImport, getLastSync, syncIntervalMinutes } from '../services/emailImportService.js';

// GET /api/email-import/status
export const getEmailImportStatus = async (req: Request, res: Response) => {
  try {
    const provider = getInboxProvider();
    const [records, countsAgg] = await Promise.all([
      EmailImport.find().sort({ receivedAt: -1 }).limit(200),
      EmailImport.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    ]);
    res.json({
      provider: { id: provider.id, label: provider.label, isDummy: provider.id === 'dummy' },
      autoSyncMinutes: syncIntervalMinutes(),
      lastSync: getLastSync(),
      counts: Object.fromEntries(countsAgg.map(c => [c._id, c.n])),
      records: records.map(r => r.toJSON())
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/email-import/sync
export const runEmailSync = async (req: Request, res: Response) => {
  try {
    const summary = await syncInbox('manual');
    if (summary.error) return res.status(502).json({ error: `Could not read the inbox: ${summary.error}`, summary });
    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/email-import/:id/reprocess
export const reprocessEmail = async (req: Request, res: Response) => {
  try {
    const record = await reprocessImport(String(req.params.id));
    res.json({ success: true, record: record.toJSON() });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// POST /api/email-import/dummy/test-email — drops a random OTA email into the dummy inbox
export const addTestEmail = async (req: Request, res: Response) => {
  if (getInboxProvider().id !== 'dummy') {
    return res.status(400).json({ error: 'Test emails can only be added to the dummy inbox' });
  }
  const msg = addDummyTestEmail();
  res.json({ success: true, message: { subject: msg.subject, from: msg.from } });
};
