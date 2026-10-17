import { X, FileText, CreditCard, Globe } from 'lucide-react';
import { Booking } from '../data/types';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
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

  // Parse a stay datetime, treating a midnight (00:00) value as "no time given"
  // and applying house defaults: 12:00 PM check-in, 11:00 AM check-out.
  const formatStayDateTime = (dtStr: string, defaultHour: number) => {
    if (dtStr.includes('T')) {
      const [datePart, timePart] = dtStr.split('T');
      const [h, min] = timePart.split(':');
      const isMidnight = h === '00' && (min === '00' || !min);
      const hour = isMidnight ? defaultHour : Number(h);
      return new Date(`${datePart}T${String(hour).padStart(2, '0')}:${isMidnight ? '00' : min}:00`).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    return formatDate(dtStr);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Folio</span>
            <h2 className="text-lg font-bold font-mono text-primary">{booking.id}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 bg-secondary hover:bg-muted text-foreground rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-sm border border-border">
            <div className="w-11 h-11 bg-foreground text-background rounded-full flex items-center justify-center text-lg font-bold font-mono">
              {guest?.avatarInitial || 'G'}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{guest?.name}</h3>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{guest?.phone} · {guest?.city}</p>
            </div>
          </div>

          <div className="p-4 bg-card rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-3">
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-primary" /> Stay Summary
              </h4>
              <select
                value={booking.status}
                onChange={(e) => handleStatusChange(e.target.value as Booking['status'])}
                className="text-xs font-mono border border-border rounded-full px-3 py-1 bg-background text-foreground focus:outline-none focus:border-primary font-medium"
              >
                <option value="Booked">Booked (Pending)</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Checked-In">Checked-In</option>
                <option value="Checked-Out">Checked-Out</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No Show">No Show</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-y-3 text-xs font-mono">
              <div className="text-muted-foreground">Room</div>
              <div className="text-right font-medium text-foreground">Room {room?.number} ({room?.category})</div>

              <div className="text-muted-foreground">Check-in</div>
              <div className="text-right font-medium text-foreground">
                {formatStayDateTime(booking.checkIn, 12)}
              </div>

              <div className="text-muted-foreground">Check-out</div>
              <div className="text-right font-medium text-foreground">
                {formatStayDateTime(booking.checkOut, 11)}
              </div>

              <div className="text-muted-foreground">Occupancy</div>
              <div className="text-right font-medium text-foreground">{booking.adults} Adults, {booking.children} Children</div>
            </div>
          </div>

          {(booking.source && booking.source !== 'Direct') && (
            <div className="p-4 bg-card rounded-xl shadow-sm border border-border">
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 border-b border-border pb-2">
                <Globe className="w-3.5 h-3.5 text-primary" /> Channel Details · {booking.source}
              </h4>
              <div className="grid grid-cols-2 gap-y-3 text-xs font-mono">
                <div className="text-muted-foreground">Booking ID</div>
                <div className="text-right font-medium text-foreground">{booking.channelBookingId || '—'}</div>

                <div className="text-muted-foreground">Channel Status</div>
                <div className="text-right font-medium capitalize text-foreground">{booking.channelStatus?.replace(/_/g, ' ') || '—'}</div>

                <div className="text-muted-foreground">Booked By</div>
                <div className="text-right font-medium text-foreground">{booking.bookedBy || '—'}</div>

                <div className="text-muted-foreground">Country</div>
                <div className="text-right font-medium uppercase text-foreground">{booking.bookerCountry || '—'}</div>

                <div className="text-muted-foreground">Device</div>
                <div className="text-right font-medium text-foreground">{booking.device || '—'}</div>

                <div className="text-muted-foreground">Unit Type</div>
                <div className="text-right font-medium text-foreground">{booking.unitType || '—'}</div>

                <div className="text-muted-foreground">Commission</div>
                <div className="text-right font-medium text-foreground">{formatCurrency(booking.commission || 0)}</div>
              </div>
            </div>
          )}

          <div className="p-4 bg-card rounded-xl shadow-sm border border-border">
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 border-b border-border pb-2">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Guest Folio
            </h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room Tariff ({booking.nights} nights)</span>
                <span className="font-medium text-foreground">{formatCurrency(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST (12%)</span>
                <span className="font-medium text-foreground">{formatCurrency(booking.gst)}</span>
              </div>

              {booking.extraCharges && booking.extraCharges.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <div className="text-xs font-mono uppercase text-muted-foreground mb-1">Extra Charges</div>
                  {booking.extraCharges.map((charge, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground">
                      <span>{charge.reason}</span>
                      <span className="font-medium text-foreground">{formatCurrency(charge.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between border-t border-border pt-2 font-bold text-sm">
                <span>Total</span>
                <span>{formatCurrency(booking.total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Paid</span>
                <span>- {formatCurrency(booking.paid)}</span>
              </div>
              <div className={`flex justify-between border-t border-border mt-2 pt-2 font-bold text-sm ${booking.balance > 0 ? 'text-primary' : 'text-foreground'}`}>
                <span>Balance Due</span>
                <span>{formatCurrency(booking.balance)}</span>
              </div>
            </div>

            {showChargeForm ? (
              <form onSubmit={handleAddCharge} className="mt-4 p-3 bg-secondary/50 border border-border rounded-lg space-y-3">
                <h5 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Add Extra Charge</h5>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-mono">Reason</label>
                  <input
                    type="text"
                    value={chargeReason}
                    onChange={e => setChargeReason(e.target.value)}
                    placeholder="e.g. Room Service, Damages"
                    className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-primary text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1 font-mono">Amount</label>
                  <input
                    type="number"
                    value={chargeAmount}
                    onChange={e => setChargeAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary text-foreground"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="pill-vermilion flex-1 justify-center text-xs py-2">
                    Add Charge
                  </button>
                  <button type="button" onClick={() => setShowChargeForm(false)} className="chip flex-1 justify-center py-2">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowChargeForm(true)}
                className="mt-4 w-full chip justify-center py-2 hover:border-foreground transition-all cursor-pointer text-xs"
              >
                + Add Extra Charge
              </button>
            )}

            {booking.balance > 0 && (
              <button
                onClick={handleRecordPayment}
                className="pill-vermilion mt-3 w-full justify-center h-10 text-xs cursor-pointer"
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
            id: generateId('RCPT'),
            bookingId: booking.id,
            guestId: booking.guestId,
            date: new Date().toISOString().split('T')[0],
            mode,
            amount,
            status: 'Completed'
          }); // the server applies it to the booking balance and returns the updated booking
        }}
      />
    </div>
  );
}
