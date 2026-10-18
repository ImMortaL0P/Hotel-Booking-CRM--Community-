import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { saveInvoiceFile } from '../controllers/invoiceArchiveController.js';
import { saveDocument, searchDocuments, deleteDocument } from '../controllers/documentController.js';
import {
  initializeData,
  syncData,
  updateRoom,
  addGuest,
  updateGuest,
  deleteGuest,
  addBooking,
  updateBooking,
  deleteBooking,
  confirmChannelBooking,
  rejectChannelBooking,
  addPayment,
  deletePayment,
  addComm,
  addInvoice,
  addExpense,
  deleteExpense,
  addStoredInvoice,
  addLog
} from '../controllers/dataController.js';
import { getEmailImportStatus, runEmailSync, reprocessEmail, addTestEmail } from '../controllers/emailImportController.js';
import {
  getChannelConfig,
  updateChannelConfig,
  testChannelConnection,
  triggerFullSync
} from '../controllers/channelController.js';
import {
  submitPublicBooking,
  sendConfirmationEmailHandler
} from '../controllers/publicBookingController.js';

const router = express.Router();

// Public unauthenticated customer booking endpoint
router.post('/public/booking-request', submitPublicBooking);

// Secure all subsequent API routes
router.use(requireAuth);

router.get('/initialize', initializeData);
router.get('/sync', syncData);

// Rooms
router.put('/rooms/:id', updateRoom);

// Guests
router.post('/guests', addGuest);
router.put('/guests/:id', updateGuest);
router.delete('/guests/:id', deleteGuest);

// Bookings
router.post('/bookings', addBooking);
router.put('/bookings/:id', updateBooking);
router.delete('/bookings/:id', deleteBooking);
router.post('/bookings/:id/confirm-channel', confirmChannelBooking);
router.post('/bookings/:id/reject-channel', rejectChannelBooking);
router.post('/bookings/:id/send-confirmation-email', sendConfirmationEmailHandler);

// Payments
router.post('/payments', addPayment);
router.delete('/payments/:id', deletePayment);

// Comms
router.post('/comms', addComm);

// Invoices
router.post('/invoices', addInvoice);
router.post('/stored-invoices', addStoredInvoice);

// Expenses
router.post('/expenses', addExpense);
router.delete('/expenses/:id', deleteExpense);

// Logs
router.post('/logs', addLog);


// Channel Manager
router.get('/channel/config', getChannelConfig);
router.put('/channel/config', updateChannelConfig);
router.post('/channel/test', testChannelConnection);
router.post('/channel/full-sync', triggerFullSync);

// Email booking import (stands in for the OTA channel-manager API)
router.get('/email-import/status', getEmailImportStatus);
router.post('/email-import/sync', runEmailSync);
router.post('/email-import/dummy/test-email', addTestEmail);
router.post('/email-import/:id/reprocess', reprocessEmail);

// Save invoice file (HTML to github folder) // Keeping for backwards compatibility
router.post('/save-invoice-file', saveInvoiceFile);

// New Document (PDF to Drive) endpoints
router.post('/documents/save', saveDocument);
router.get('/documents/search', searchDocuments);
router.delete('/documents/:id', deleteDocument);

export default router;
