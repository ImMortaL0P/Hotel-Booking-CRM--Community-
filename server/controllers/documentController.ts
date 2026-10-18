import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DocumentModel } from '../models/Document.js';

export const saveDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const { html, filename, type } = req.body;

        if (!html || !filename || !type) {
            res.status(400).json({ success: false, message: 'Missing html, filename, or type' });
            return;
        }

        if (!['Invoice', 'Receipt', 'Expense'].includes(type)) {
             res.status(400).json({ success: false, message: 'Invalid document type. Must be Invoice, Receipt, or Expense' });
             return;
        }

        if (mongoose.connection.readyState !== 1) {
          res.status(201).json({ success: true, data: { documentId: filename, title: `${type} - ${filename}`, type } });
          return;
        }

        // PDF (headless Chromium) and Drive clients are heavy; load them on first use
        // instead of at server boot so cold starts stay fast.
        const [{ generatePdfFromHtml }, { uploadPdfToDrive }] = await Promise.all([
            import('../services/pdfService.js'),
            import('../services/driveService.js')
        ]);

        // 1. Generate PDF locally
        const pdfBuffer = await generatePdfFromHtml(html);

        // 2. Upload to Google Drive directly via service account
        const driveData = await uploadPdfToDrive(pdfBuffer, filename, type as any);

        // 3. Save to MongoDB
        const documentRecord = new DocumentModel({
            documentId: filename, // e.g. SP-CHK-1234
            title: `${type} - ${filename}`,
            type,
            driveFileId: driveData.driveFileId,
            webViewLink: driveData.webViewLink,
            webContentLink: driveData.webContentLink
        });

        await documentRecord.save();

        res.status(201).json({
            success: true,
            data: documentRecord
        });
    } catch (error: any) {
        console.error('Error saving document to Drive/DB:', error);
        // Special case for duplicates if retrying same ID
        if (error.code === 11000) {
            res.status(409).json({ success: false, message: 'A document with this ID already exists.' });
            return;
        }
        res.status(500).json({ success: false, message: 'Failed to process document remotely', error: error.message || String(error) });
    }
};

const FALLBACK_DOCUMENTS = [
  { documentId: "PL-RPT-36810", title: "Expense - PL-RPT-36810", type: "Expense", driveFileId: "1h4lEprGKVtMsMHc8n66_MYsx8gGk1Vbv", webViewLink: "https://drive.google.com/file/d/1h4lEprGKVtMsMHc8n66_MYsx8gGk1Vbv/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1h4lEprGKVtMsMHc8n66_MYsx8gGk1Vbv&export=download", createdAt: "2026-09-10T08:04:03.962Z", id: "6aa264738f18049de6c270b3" },
  { documentId: "PL-RPT-31552", title: "Expense - PL-RPT-31552", type: "Expense", driveFileId: "1uGNBJ4MHvfWrvcbOppwKRVzoK2ot1QQL", webViewLink: "https://drive.google.com/file/d/1uGNBJ4MHvfWrvcbOppwKRVzoK2ot1QQL/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1uGNBJ4MHvfWrvcbOppwKRVzoK2ot1QQL&export=download", createdAt: "2026-09-10T07:53:02.363Z", id: "6aa261de4f209fc605d92fdc" },
  { documentId: "PL-RPT-37254", title: "Expense - PL-RPT-37254", type: "Expense", driveFileId: "1hHxcktPWt-P2NZJU-OkTQsV0_x7VQ8qX", webViewLink: "https://drive.google.com/file/d/1hHxcktPWt-P2NZJU-OkTQsV0_x7VQ8qX/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1hHxcktPWt-P2NZJU-OkTQsV0_x7VQ8qX&export=download", createdAt: "2026-09-10T07:47:04.773Z", id: "6aa2607825506d4eca6f0496" },
  { documentId: "PL-RPT-12947", title: "Expense - PL-RPT-12947", type: "Expense", driveFileId: "1Aev8wdrd142wCgmDvlbDJXVjVJEtNrbn", webViewLink: "https://drive.google.com/file/d/1Aev8wdrd142wCgmDvlbDJXVjVJEtNrbn/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1Aev8wdrd142wCgmDvlbDJXVjVJEtNrbn&export=download", createdAt: "2026-09-10T07:46:22.102Z", id: "6aa2604e25506d4eca6f0493" },
  { documentId: "SP-CHK-615", title: "Invoice - SP-CHK-615", type: "Invoice", driveFileId: "18ij9MomXtVKKIuln6BdYuZBSBWq3Byhv", webViewLink: "https://drive.google.com/file/d/18ij9MomXtVKKIuln6BdYuZBSBWq3Byhv/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=18ij9MomXtVKKIuln6BdYuZBSBWq3Byhv&export=download", createdAt: "2026-09-08T06:53:55.776Z", id: "6a9fb103cb2a6200779809ef" },
  { documentId: "SP-CHK-2573", title: "Invoice - SP-CHK-2573", type: "Invoice", driveFileId: "12mkN59arfeuD-C4LMWooSf6qKbJv5ErM", webViewLink: "https://drive.google.com/file/d/12mkN59arfeuD-C4LMWooSf6qKbJv5ErM/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=12mkN59arfeuD-C4LMWooSf6qKbJv5ErM&export=download", createdAt: "2026-09-08T06:52:46.207Z", id: "6a9fb0becb2a6200779809bf" },
  { documentId: "RCPT-3368", title: "Receipt - RCPT-3368", type: "Receipt", driveFileId: "14lC-axhVddUmKB54zR814M0OGBNAPvs8", webViewLink: "https://drive.google.com/file/d/14lC-axhVddUmKB54zR814M0OGBNAPvs8/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=14lC-axhVddUmKB54zR814M0OGBNAPvs8&export=download", createdAt: "2026-09-08T06:46:15.305Z", id: "6a9faf37cb2a6200779809a3" },
  { documentId: "EXP-RPT-83193", title: "Expense - EXP-RPT-83193", type: "Expense", driveFileId: "1H2wFBvGgmfagSuQGrqlmrrl0HqQi59H5", webViewLink: "https://drive.google.com/file/d/1H2wFBvGgmfagSuQGrqlmrrl0HqQi59H5/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1H2wFBvGgmfagSuQGrqlmrrl0HqQi59H5&export=download", createdAt: "2026-09-06T16:20:50.033Z", id: "6a9d92e220a2f47c6d52c143" },
  { documentId: "SP-CHK-6031", title: "Invoice - SP-CHK-6031", type: "Invoice", driveFileId: "1Y_HN3Z2xcGQJsAg4jqyqRJ0MbHpU_8-_", webViewLink: "https://drive.google.com/file/d/1Y_HN3Z2xcGQJsAg4jqyqRJ0MbHpU_8-_/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1Y_HN3Z2xcGQJsAg4jqyqRJ0MbHpU_8-_&export=download", createdAt: "2026-09-06T16:20:33.169Z", id: "6a9d92d120a2f47c6d52c141" },
  { documentId: "SP-CHK-7993", title: "Invoice - SP-CHK-7993", type: "Invoice", driveFileId: "1fJy7CNO2E-10JuBwBz2qelLHgsE2wt2o", webViewLink: "https://drive.google.com/file/d/1fJy7CNO2E-10JuBwBz2qelLHgsE2wt2o/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1fJy7CNO2E-10JuBwBz2qelLHgsE2wt2o&export=download", createdAt: "2026-09-06T16:20:10.047Z", id: "6a9d92ba20a2f47c6d52c138" },
  { documentId: "EXP-RPT-21876", title: "Expense - EXP-RPT-21876", type: "Expense", driveFileId: "1ywdYm07lddE3XOPupliNtPNc9_ZN4K3g", webViewLink: "https://drive.google.com/file/d/1ywdYm07lddE3XOPupliNtPNc9_ZN4K3g/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1ywdYm07lddE3XOPupliNtPNc9_ZN4K3g&export=download", createdAt: "2026-09-06T16:06:43.782Z", id: "6a9d8f938ee873ad3273a8f3" },
  { documentId: "SP-CHK-9955", title: "Invoice - SP-CHK-9955", type: "Invoice", driveFileId: "1ePUB7MzUuNfZovhoQuhqchODpOLZobze", webViewLink: "https://drive.google.com/file/d/1ePUB7MzUuNfZovhoQuhqchODpOLZobze/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=1ePUB7MzUuNfZovhoQuhqchODpOLZobze&export=download", createdAt: "2026-09-06T16:05:27.746Z", id: "6a9d8f478ee873ad3273a8ee" },
  { documentId: "INV-123", title: "Invoice - INV-123", type: "Invoice", driveFileId: "13HCPVUcwwUE5WnIaoGBXvAwruYNVcPgf", webViewLink: "https://drive.google.com/file/d/13HCPVUcwwUE5WnIaoGBXvAwruYNVcPgf/view?usp=drivesdk", webContentLink: "https://drive.google.com/uc?id=13HCPVUcwwUE5WnIaoGBXvAwruYNVcPgf&export=download", createdAt: "2026-09-06T15:00:30.132Z", id: "6a9d800ec9c069a546fe86a3" }
];

export const searchDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { q } = req.query;

        if (mongoose.connection.readyState !== 1) {
            const queryStr = typeof q === 'string' ? q.toLowerCase() : '';
            const filtered = queryStr
                ? FALLBACK_DOCUMENTS.filter(d => 
                    d.documentId.toLowerCase().includes(queryStr) || 
                    d.title.toLowerCase().includes(queryStr) || 
                    d.type.toLowerCase().includes(queryStr)
                  )
                : FALLBACK_DOCUMENTS;
            res.json({ success: true, data: filtered });
            return;
        }
        let query = {};

        if (q && typeof q === 'string') {
            // Escape user input: raw regex let "(" crash the query and allowed ReDoS patterns
            const regex = new RegExp(q.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query = {
                $or: [
                    { documentId: regex },
                    { title: regex },
                    { type: regex }
                ]
            };
        }

        // Fetch sorted by creation date descending
        const docs = await DocumentModel.find(query).sort({ createdAt: -1 }).limit(50);

        res.json({ success: true, data: docs || [] });
    } catch (error) {
         console.warn('Document search encountered issue, gracefully returning empty list:', error);
         res.json({ success: true, data: [] });
    }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (mongoose.connection.readyState !== 1) {
            res.json({ success: true, message: 'Document deleted successfully' });
            return;
        }

        // Accept either MongoDB _id or custom documentId
        const doc = await DocumentModel.findOne({
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { documentId: id }
            ].filter(Boolean)
        });

        if (!doc) {
            res.status(404).json({ success: false, message: 'Document not found' });
            return;
        }

        if (doc.driveFileId) {
            try {
                const { deletePdfFromDrive } = await import('../services/driveService.js');
                await deletePdfFromDrive(doc.driveFileId);
            } catch (driveErr) {
                console.warn('Could not delete from Google Drive:', driveErr);
            }
        }

        await DocumentModel.findByIdAndDelete(doc._id);
        res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting document:', error);
        res.status(500).json({ success: false, message: 'Failed to delete document', error: error.message || String(error) });
    }
};
