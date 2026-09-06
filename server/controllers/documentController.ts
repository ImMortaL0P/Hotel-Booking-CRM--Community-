import { Request, Response } from 'express';
import { generatePdfFromHtml } from '../services/pdfService.js';
import { uploadPdfToDrive } from '../services/driveService.js';
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
        const { q } = req.query;
        let query = {};

        if (q && typeof q === 'string') {
            const regex = new RegExp(q, 'i');
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

        res.json({ success: true, data: docs });
    } catch (error) {
         console.error('Error searching documents:', error);
         res.status(500).json({ success: false, message: 'Failed to search documents' });
    }
};
