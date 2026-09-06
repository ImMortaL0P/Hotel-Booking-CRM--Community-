import express from 'express';
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
  addPayment,
  addComm,
  addInvoice,
  addExpense,
  deleteExpense,
  addStoredInvoice
} from '../controllers/dataController.js';

const router = express.Router();

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

// Save invoice file (HTML to github folder) // Keeping for backwards compatibility
router.post('/save-invoice-file', saveInvoiceFile);

// New Document (PDF to Drive) endpoints
router.post('/documents/save', saveDocument);
router.get('/documents/search', searchDocuments);

export default router;
