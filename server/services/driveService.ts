import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Root folder ID from user
const ROOT_FOLDER_ID = '1QvuBir3YVU9ottO3nxXd09TNhUjADIi2';

// Set up Google Auth using OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// Cache folder IDs to avoid multiple lookups
let invoiceFolderId: string | null = null;
let receiptExpenseFolderId: string | null = null;

async function getOrCreateSubfolder(name: string, parentId: string): Promise<string> {
  // Query to see if it exists
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id!;
  }

  // Create it
  const fileMetadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id'
  });

  return folder.data.id!;
}

export async function ensureFolders() {
  if (!invoiceFolderId) {
    invoiceFolderId = await getOrCreateSubfolder('Invoices', ROOT_FOLDER_ID);
  }
  if (!receiptExpenseFolderId) {
    receiptExpenseFolderId = await getOrCreateSubfolder('Receipts & Expenses', ROOT_FOLDER_ID);
  }
}

export async function uploadPdfToDrive(pdfBuffer: Buffer, filename: string, type: 'Invoice' | 'Receipt' | 'Expense') {
  await ensureFolders();

  const targetFolderId = type === 'Invoice' ? invoiceFolderId! : receiptExpenseFolderId!;

  // Stream stream from buffer
  const bufferStream = new Readable();
  bufferStream.push(pdfBuffer);
  bufferStream.push(null);

  const fileMetadata = {
    name: `${filename}.pdf`,
    parents: [targetFolderId]
  };

  const media = {
    mimeType: 'application/pdf',
    body: bufferStream
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  // Share the file universally so frontend can download directly via link without Drive sign-in
  await drive.permissions.create({
      fileId: file.data.id!,
      requestBody: {
          role: 'reader',
          type: 'anyone',
      }
  });

  return {
    driveFileId: file.data.id!,
    webViewLink: file.data.webViewLink!,
    webContentLink: file.data.webContentLink!
  };
}
