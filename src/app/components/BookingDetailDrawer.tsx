import { X, FileText, CreditCard } from 'lucide-react';
import { Booking } from '../data/types';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { useState } from 'react';

interface Props {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingDetailDrawer({ booking: initialBooking, isOpen, onClose }: Props) {
  const { guests, rooms, bookings, updateBooking, addPayment } = useData();

  if (!isOpen || !initialBooking) return null;

  const booking = bookings.find(b => b.id === initialBooking.id) || initialBooking;

  const guest = guests.find(g => g.id === booking.guestId);
  const room = rooms.find(r => r.id === booking.roomId);

  const handleStatusChange = (newStatus: Booking['status']) => {
    updateBooking({ ...booking, status: newStatus });
  };

  const handleRecordPayment = () => {
    const amount = parseFloat(window.prompt('Enter amount to collect:', String(booking.balance)) || '0');
    if (amount > 0) {
      addPayment({
        id: `RCPT-${Math.floor(Math.random() * 9000) + 1000}`,
        bookingId: booking.id,
        guestId: booking.guestId,
        date: new Date().toISOString().split('T')[0],
        mode: 'UPI',
        amount,
        status: 'Completed'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-background h-full shadow-sm flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-primary">{booking.id}</h2>
          <button onClick={onClose} className="p-2 bg-muted hover:bg-muted/80 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-card rounded-lg shadow-sm border border-border">
            <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xl font-bold">
              {guest?.avatarInitial || 'G'}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{guest?.name}</h3>
              <p className="text-sm text-muted-foreground">{guest?.phone} · {guest?.city}</p>
            </div>
          </div>

          <div className="p-4 bg-card rounded-lg shadow-sm border border-border">
            <div className="flex justify-between items-center border-b border-border/50 pb-3 mb-3">
              <h4 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" /> Stay Summary
              </h4>
              <select
                value={booking.status}
                onChange={(e) => handleStatusChange(e.target.value as Booking['status'])}
                className="text-sm border border-border rounded-md px-2 py-1 bg-card focus:outline-none focus:border-primary font-semibold"
              >
                <option value="Booked">Booked (Pending)</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Checked-Out">Checked-Out</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="text-muted-foreground">Room</div>
              <div className="text-right font-medium">Room {room?.number} ({room?.category})</div>

              <div className="text-muted-foreground">Check-in</div>
              <div className="text-right font-medium">
                {booking.checkIn.includes('T') ? new Date(booking.checkIn).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : formatDate(booking.checkIn)}
              </div>

              <div className="text-muted-foreground">Check-out</div>
              <div className="text-right font-medium">
                {booking.checkOut.includes('T') ? new Date(booking.checkOut).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : formatDate(booking.checkOut)}
              </div>

              <div className="text-muted-foreground">Occupancy</div>
              <div className="text-right font-medium">{booking.adults} Adults, {booking.children} Children</div>
            </div>
          </div>

          <div className="p-4 bg-card rounded-lg shadow-sm border border-border">
            <h4 className="font-semibold mb-3 flex items-center gap-2 border-b border-border/50 pb-2">
              <CreditCard className="w-4 h-4" /> Folio
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room Tariff ({booking.nights} nights)</span>
                <span className="font-medium">{formatCurrency(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (12%)</span>
                <span className="font-medium">{formatCurrency(booking.gst)}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2 font-bold pb-2">
                <span>Total</span>
                <span>{formatCurrency(booking.total)}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Paid</span>
                <span>- {formatCurrency(booking.paid)}</span>
              </div>
              <div className={`flex justify-between border-t border-border/50 mt-2 pt-2 font-bold ${booking.balance > 0 ? 'text-red-600' : 'text-foreground'}`}>
                <span>Balance Due</span>
                <span>{formatCurrency(booking.balance)}</span>
              </div>
            </div>

            {booking.balance > 0 && (
              <button
                onClick={handleRecordPayment}
                className="mt-4 w-full bg-primary hover:opacity-90 text-primary-foreground py-2 rounded font-medium transition"
              >
                Record Payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
