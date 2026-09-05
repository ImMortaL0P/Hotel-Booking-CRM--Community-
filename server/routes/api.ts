import express from 'express';
import { saveInvoiceFile } from '../controllers/invoiceArchiveController.js';
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
  addInvoice
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

export default router;

// Save invoice file (HTML to github folder)
router.post('/save-invoice-file', saveInvoiceFile);
