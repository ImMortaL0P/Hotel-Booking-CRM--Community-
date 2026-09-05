import express from 'express';
import { initializeData, updateRoom, addGuest, updateGuest, addBooking, updateBooking, deleteBooking, addPayment, addComm } from '../controllers/dataController.js';
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
export default router;
