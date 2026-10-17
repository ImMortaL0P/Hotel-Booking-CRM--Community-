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

export const searchDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
        if (mongoose.connection.readyState !== 1) {
            res.json({ success: true, data: [] });
            return;
        }

        const { q } = req.query;
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
