import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { saveInvoiceFile } from '../controllers/invoiceArchiveController.js';
import { saveDocument, searchDocuments } from '../controllers/documentController.js';
import {
  initializeData,
  updateRoom,
  addGuest,
  updateGuest,
  addBooking,
  updateBooking,
  deleteBooking,
  confirmChannelBooking,
  rejectChannelBooking,
  addPayment,
  addComm,
  addInvoice,
  addExpense,
  deleteExpense,
  addStoredInvoice,
  addLog
} from '../controllers/dataController.js';
import {
  getChannelConfig,
  updateChannelConfig,
  testChannelConnection,
  triggerFullSync
} from '../controllers/channelController.js';

const router = express.Router();

// Secure all API routes
router.use(requireAuth);

router.get('/initialize', initializeData);

// Rooms
router.put('/rooms/:id', updateRoom);

// Guests
router.post('/guests', addGuest);
router.put('/guests/:id', updateGuest);

// Bookings
router.post('/bookings', addBooking);
router.put('/bookings/:id', updateBooking);
router.delete('/bookings/:id', deleteBooking);
router.post('/bookings/:id/confirm-channel', confirmChannelBooking);
router.post('/bookings/:id/reject-channel', rejectChannelBooking);

// Payments
router.post('/payments', addPayment);

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

// Save invoice file (HTML to github folder) // Keeping for backwards compatibility
router.post('/save-invoice-file', saveInvoiceFile);

// New Document (PDF to Drive) endpoints
router.post('/documents/save', saveDocument);
router.get('/documents/search', searchDocuments);

export default router;
