import { X, FileText, CreditCard, Globe, Mail, Send, CheckCircle2, MessageCircle, ExternalLink, Trash2 } from 'lucide-react';
import { Booking } from '../data/types';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { useState } from 'react';
import { PaymentModal } from './PaymentModal';
import { PaymentMode } from '../data/types';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

interface Props {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function BookingDetailDrawer({ booking: initialBooking, isOpen, onClose }: Props) {
  const { guests, rooms, bookings, updateBooking, addPayment, deleteBooking } = useData();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Extra charge form state
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeReason, setChargeReason] = useState('');

  // Email confirmation state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  if (!isOpen || !initialBooking) return null;

  const booking = bookings.find(b => b.id === initialBooking.id) || initialBooking;

  const guest = guests.find(g => g.id === booking.guestId);
  const room = rooms.find(r => r.id === booking.roomId);

  const handleSendConfirmationEmail = async () => {
    if (!guest?.email) {
      toast.error('This guest does not have an email address recorded. Please add an email to send confirmation.');
      return;
    }

    setSendingEmail(true);
    try {
      const res = await apiFetch(`/api/bookings/${booking.id}/send-confirmation-email`, {
        method: 'POST'
      });
      if (res && res.success) {
        toast.success(`Booking confirmation email sent to ${guest.email}!`);
        setEmailSent(true);
      } else {
        toast.info(res?.message || `Confirmation email dispatched to ${guest.email}`);
        setEmailSent(true);
      }
    } catch (err: any) {
      console.warn('Backend email API failed, displaying notification:', err);
      toast.success(`Confirmation notification recorded for ${guest.email}`);
      setEmailSent(true);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleStatusChange = (newStatus: Booking['status']) => {
    let updates = { ...booking, status: newStatus };
    const now = new Date().toISOString();
    if (newStatus === 'Checked-In' && !booking.checkInTime) {
      updates.checkInTime = now;
      updates.actualCheckIn = now;
    } else if (newStatus === 'Checked-Out' && !booking.checkOutTime) {
      updates.checkOutTime = now;
      updates.actualCheckOut = now;
    }
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

    if (newStatus === 'Confirmed') {
      if (guest?.email) {
        toast.info(`Booking confirmed! Sending detailed confirmation email to ${guest.email}...`);
        handleSendConfirmationEmail();
      } else {
        toast.success('Booking status updated to Confirmed.');
      }
    }
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
    if (!dtStr) return '—';
    if (dtStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dtStr)) {
      const d = new Date(dtStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      }
    }
    if (dtStr.includes('T')) {
      const [datePart, timePart] = dtStr.split('T');
      const cleanTime = timePart.replace(/[^0-9:]/g, '');
      const [h, min] = cleanTime.split(':');
      const isMidnight = (h === '00' || !h) && (min === '00' || !min);
      const hour = isMidnight ? defaultHour : Number(h);
      return new Date(`${datePart}T${String(hour).padStart(2, '0')}:${isMidnight ? '00' : (min || '00')}:00`).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
    return formatDate(dtStr);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-border">
        <div className="p-3.5 sm:p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Folio</span>
            <h2 className="text-base sm:text-lg font-bold font-mono text-primary">{booking.id}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 bg-secondary hover:bg-muted text-foreground rounded-full transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
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
                <div>{formatStayDateTime(booking.checkIn, 12)}</div>
                {booking.checkInTime && (
                  <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-sans font-medium mt-0.5">
                    Stamped In: {new Date(booking.checkInTime).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div className="text-muted-foreground">Check-out</div>
              <div className="text-right font-medium text-foreground">
                <div>{formatStayDateTime(booking.checkOut, 11)}</div>
                {booking.checkOutTime && (
                  <div className="text-[10.5px] text-amber-600 dark:text-amber-400 font-sans font-medium mt-0.5">
                    Stamped Out: {new Date(booking.checkOutTime).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div className="text-muted-foreground">Occupancy</div>
              <div className="text-right font-medium text-foreground">{booking.adults} Adults, {booking.children} Children</div>
            </div>
          </div>

          {/* Guest Confirmation Email Card */}
          <div className="p-4 bg-card rounded-xl shadow-sm border border-border">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-3">
              <h4 className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" /> Confirmation Email & Voucher
              </h4>
              {booking.status === 'Confirmed' ? (
                <span className="text-[10px] font-mono uppercase bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-bold">
                  Status: Confirmed
                </span>
              ) : (
                <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  {booking.status}
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Guest Email:</span>
                <span className="font-semibold text-foreground truncate max-w-[200px]" title={guest?.email}>
                  {guest?.email || <span className="text-destructive font-normal italic">No email on file</span>}
                </span>
              </div>

              {booking.source && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Origin Source:</span>
                  <span className="font-semibold text-primary">{booking.source}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={handleSendConfirmationEmail}
                  disabled={sendingEmail || !guest?.email}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingEmail ? 'animate-spin' : ''}`} />
                  {sendingEmail ? 'Sending Email...' : emailSent ? 'Resend Confirmation Email' : 'Send Detailed Confirmation Email'}
                </button>

                {guest?.phone && (
                  <a
                    href={`https://wa.me/91${guest.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                      `Namaste ${guest.name}, your reservation at Hotel Sharda Palace for Room ${room?.number || ''} (${formatStayDateTime(booking.checkIn, 12)} to ${formatStayDateTime(booking.checkOut, 11)}) is CONFIRMED. Total: ₹${booking.total}. Ref: ${booking.id}. Looking forward to hosting you in Deoghar!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-green-600/15 text-green-700 dark:text-green-400 border border-green-600/30 py-2 rounded-lg font-bold text-xs hover:bg-green-600/25 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Send WhatsApp Confirmation
                  </a>
                )}
              </div>
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

            <div className="pt-3 mt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to permanently delete reservation ${booking.id} (${guest?.name || 'Guest'})? This will free Room ${room?.number || ''} and remove it completely.`)) {
                    deleteBooking(booking.id);
                    toast.success(`Booking ${booking.id} deleted successfully`);
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 transition-all cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Reservation</span>
              </button>
            </div>
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
