import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const archivePath = path.resolve(__dirname, '../../invoices_archive');

export const saveInvoiceFile = async (req: Request, res: Response) => {
  try {
    const { html, filename } = req.body;
    
    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath, { recursive: true });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.html';
    const filePath = path.join(archivePath, safeFilename);
    
    fs.writeFileSync(filePath, html);
    
    res.json({ success: true, path: filePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
