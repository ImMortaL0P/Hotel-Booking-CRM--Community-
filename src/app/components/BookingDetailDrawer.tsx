import { X, FileText, CreditCard, Globe } from 'lucide-react';
import { Booking } from '../data/types';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import { PaymentMode } from '../data/types';

interface Props {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingDetailDrawer({ booking: initialBooking, isOpen, onClose }: Props) {
  const { guests, rooms, bookings, updateBooking, addPayment } = useData();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Extra charge form state
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeReason, setChargeReason] = useState('');

  if (!isOpen || !initialBooking) return null;

  const booking = bookings.find(b => b.id === initialBooking.id) || initialBooking;

  const guest = guests.find(g => g.id === booking.guestId);
  const room = rooms.find(r => r.id === booking.roomId);

  const handleStatusChange = (newStatus: Booking['status']) => {
    let updates = { ...booking, status: newStatus };
    if (newStatus === 'Checked-Out') {
      updates.paid = updates.total;
      updates.balance = 0;
    } else if (newStatus === 'Cancelled' || newStatus === 'No Show') {
      updates.paid = 0;
      updates.total = 0;
      updates.balance = 0;
      updates.commission = 0;
      updates.netRevenue = 0;
      updates.subtotal = 0;
    }
    updateBooking(updates);
  };

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(chargeAmount);
    if (isNaN(amount) || amount <= 0 || !chargeReason.trim()) return;

    const newCharge = {
      amount,
      reason: chargeReason.trim(),
      date: new Date().toISOString()
    };

    const newExtraCharges = [...(booking.extraCharges || []), newCharge];

    // We base the new total directly off subtotal + gst + any extra charges
    const extraTotal = newExtraCharges.reduce((sum, ch) => sum + ch.amount, 0);
    const newTotal = booking.subtotal + booking.gst + extraTotal;
    const newBalance = newTotal - booking.paid;

    updateBooking({
      ...booking,
      extraCharges: newExtraCharges,
      total: newTotal,
      balance: newBalance
    });

    setChargeAmount('');
    setChargeReason('');
    setShowChargeForm(false);
  };

  const handleRecordPayment = () => {
    setIsPaymentModalOpen(true);
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
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
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

          {(booking.source && booking.source !== 'Direct') && (
            <div className="p-4 bg-card rounded-lg shadow-sm border border-border">
              <h4 className="font-semibold mb-3 flex items-center gap-2 border-b border-border/50 pb-2">
                <Globe className="w-4 h-4" /> Channel Details: {booking.source}
              </h4>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-muted-foreground">Booking ID</div>
                <div className="text-right font-medium">{booking.channelBookingId || '-'}</div>

                <div className="text-muted-foreground">Channel Status</div>
                <div className="text-right font-medium capitalize">{booking.channelStatus?.replace(/_/g, ' ') || '-'}</div>

                <div className="text-muted-foreground">Booked By</div>
                <div className="text-right font-medium">{booking.bookedBy || '-'}</div>

                <div className="text-muted-foreground">Country</div>
                <div className="text-right font-medium uppercase">{booking.bookerCountry || '-'}</div>

                <div className="text-muted-foreground">Device</div>
                <div className="text-right font-medium">{booking.device || '-'}</div>

                <div className="text-muted-foreground">Unit Type</div>
                <div className="text-right font-medium">{booking.unitType || '-'}</div>

                <div className="text-muted-foreground">Commission</div>
                <div className="text-right font-medium">{formatCurrency(booking.commission || 0)}</div>
              </div>
            </div>
          )}

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

              {booking.extraCharges && booking.extraCharges.length > 0 && (
                <div className="pt-2 border-t border-border/20">
                  <div className="text-sm font-semibold mb-1">Extra Charges</div>
                  {booking.extraCharges.map((charge, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span>{charge.reason}</span>
                      <span className="font-medium text-foreground">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

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

            {showChargeForm ? (
              <form onSubmit={handleAddCharge} className="mt-4 p-3 bg-muted rounded-md space-y-3">
                <h5 className="font-semibold text-sm">Add Extra Charge</h5>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Reason</label>
                  <input
                    type="text"
                    value={chargeReason}
                    onChange={e => setChargeReason(e.target.value)}
                    placeholder="e.g. Room Service, Damages"
                    className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Amount</label>
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={e => setChargeAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 bg-primary text-primary-foreground py-1.5 rounded text-sm font-medium">
                    Add Charge
                  </button>
                  <button type="button" onClick={() => setShowChargeForm(false)} className="flex-1 bg-background border border-border text-foreground py-1.5 rounded text-sm font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowChargeForm(true)}
                className="mt-4 w-full bg-secondary text-secondary-foreground border border-border py-2 rounded font-medium transition hover:bg-secondary/80 text-sm"
              >
                + Add Extra Charge
              </button>
            )}

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
      
      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        defaultAmount={booking.balance || 0}
        onSubmit={(amount, mode) => {
          addPayment({
            id: `RCPT-${Math.floor(Math.random() * 9000) + 1000}`,
            bookingId: booking.id,
            guestId: booking.guestId,
            date: new Date().toISOString().split('T')[0],
            mode,
            amount,
            status: 'Completed'
          });
          updateBooking({ ...booking, paid: booking.paid + amount, balance: booking.balance - amount });
        }}
      />
    </div>
  );
}
