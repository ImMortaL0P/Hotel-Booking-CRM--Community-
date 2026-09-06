import React, { useState, useEffect } from 'react';
import { useData } from '../data/DataContext';
import { IDProofType, PaymentMode, RoomCategory } from '../data/types';
import { formatCurrency, generateId } from '../lib/utils';
import { X, Calendar, User, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRoomId?: string;
  defaultDate?: string;
  defaultCheckOut?: string;
}

export function NewBookingModal({ isOpen, onClose, defaultRoomId, defaultDate, defaultCheckOut }: NewBookingModalProps) {
  const { rooms, guests, bookings, addGuest, updateGuest, addBooking, addPayment } = useData();

  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idProofType, setIdProofType] = useState<IDProofType>('Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Room details
  const [roomType, setRoomType] = useState<RoomCategory>('Deluxe Double');
  const [selectedRoomId, setSelectedRoomId] = useState(defaultRoomId || '');
  const [checkInDate, setCheckInDate] = useState(() => {
    if (defaultDate && defaultDate.includes('T')) return defaultDate;
    if (defaultDate) return `${defaultDate}T11:00`;
    return '2026-09-05T11:00';
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    if (defaultCheckOut) return defaultCheckOut;
    return '2026-09-07T11:00';
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Payment
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [notes, setNotes] = useState('');

  // Autofill if guest matches phone
  useEffect(() => {
    if (phone.length >= 10) {
      const match = guests.find(g => g.phone.includes(phone) || phone.includes(g.phone.replace(/\s+/g, '')));
      if (match) {
        setGuestName(match.name);
        setEmail(match.email === '-' ? '' : match.email);
        setIdProofType(match.idProofType);
        setIdProofNumber(match.idProofNumber);
        setCity(match.city);
        setState(match.state);
        toast.info(`Autofilled details for existing guest: ${match.name}`);
      }
    }
  }, [phone, guests]);

  // Available rooms calculation based on selected type and dates
  const availableRooms = rooms.filter(r => r.category === roomType);

  useEffect(() => {
    if (availableRooms.length > 0 && !availableRooms.find(r => r.id === selectedRoomId)) {
      setSelectedRoomId(availableRooms[0].id);
    }
  }, [roomType, availableRooms, selectedRoomId]);

  // Compute stay details
  const calculateNights = () => {
    // Just compare dates regardless of time for night calculation
    const start = new Date(checkInDate.split('T')[0]);
    const end = new Date(checkOutDate.split('T')[0]);
    const diff = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    return diff > 0 ? diff : 1;
  };

  const nights = calculateNights();
  const currentRoom = rooms.find(r => r.id === selectedRoomId);
  const tariff = currentRoom ? currentRoom.tariff : 1200;
  const subtotal = tariff * nights;
  const gst = subtotal * 0.12;
  const total = subtotal + gst;
  const balance = total - advancePaid;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone || !selectedRoomId) {
      toast.error('Please fill all required fields');
      return;
    }
    if (new Date(checkInDate).getTime() >= new Date(checkOutDate).getTime()) {
      toast.error('Check-out must be after check-in time');
      return;
    }

    const isConflict = bookings.some(b => {
      if (b.roomId !== selectedRoomId) return false;
      if (b.status === 'Checked-Out' || b.status === 'Cancelled') return false;
      const start1 = new Date(checkInDate).getTime();
      const end1 = new Date(checkOutDate).getTime();
      const start2 = new Date(b.checkIn).getTime();
      const end2 = new Date(b.checkOut).getTime();
      return start1 < end2 && end1 > start2;
    });

    if (isConflict) {
      toast.error('Room is already booked for these dates.');
      return;
    }

    // Check if guest exists or create new
    let guest = guests.find(g => g.phone === phone);
    let guestId = guest ? guest.id : generateId('guest');

    if (!guest) {
      guest = {
        id: guestId,
        name: guestName,
        phone,
        email: email || '-',
        city: city || 'Deoghar',
        state: state || 'Jharkhand',
        idProofType,
        idProofNumber: idProofNumber || 'N/A',
        totalStays: 1,
        lastStay: checkInDate,
        totalSpent: advancePaid,
        isVIP: false,
        avatarInitial: guestName.charAt(0).toUpperCase()
      };
      addGuest(guest);
    } else {
      updateGuest({
        ...guest,
        totalStays: guest.totalStays + 1,
        lastStay: checkInDate
      });
    }

    const bookingId = `SP-2026-${Math.floor(100 + Math.random() * 900)}`;
    
    addBooking({
      id: bookingId,
      guestId,
      roomId: selectedRoomId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      adults,
      children,
      nights,
      subtotal,
      gst,
      total,
      paid: advancePaid,
      balance,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
      notes
    });

    if (advancePaid > 0) {
      addPayment({
        id: generateId('RCPT'),
        bookingId,
        guestId,
        date: checkInDate,
        mode: paymentMode,
        amount: advancePaid,
        status: 'Completed'
      });
    }

    toast.success(`Booking ${bookingId} created successfully!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 bg-[#FAF6F0] border-b border-[#e6dfd8] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2d1b1c]">New Booking</h2>
            <p className="text-xs text-gray-500">Create a new guest booking at Sharda Palace</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Guest Information */}
          <div>
            <h3 className="text-sm font-semibold text-[#7B1E22] flex items-center gap-2 mb-3">
              <User className="w-4 h-4" /> 1. Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Guest Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="e.g. Amit Singh"
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                <input 
                  type="text" 
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID Proof Type *</label>
                <select 
                  value={idProofType}
                  onChange={e => setIdProofType(e.target.value as IDProofType)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Driving Licence">Driving Licence</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ID Number *</label>
                <input 
                  type="text" 
                  required
                  value={idProofNumber}
                  onChange={e => setIdProofNumber(e.target.value)}
                  placeholder="Enter ID number"
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
            </div>
          </div>

          {/* 2. Room & Stay Details */}
          <div>
            <h3 className="text-sm font-semibold text-[#7B1E22] flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" /> 2. Room & Stay Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room Category *</label>
                <select
                  value={roomType}
                  onChange={e => setRoomType(e.target.value as RoomCategory)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                >
                  <option value="Deluxe Double">Deluxe Double (₹1,500/night)</option>
                  <option value="Family Suite">Family Suite (₹3,000/night)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Room Number *</label>
                <select 
                  value={selectedRoomId}
                  onChange={e => setSelectedRoomId(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                >
                  {availableRooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.number} ({r.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check-in Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={checkInDate}
                  onChange={e => setCheckInDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check-out Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={checkOutDate}
                  onChange={e => setCheckOutDate(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Adults</label>
                <input 
                  type="number" 
                  min="1"
                  max="6"
                  value={adults}
                  onChange={e => setAdults(parseInt(e.target.value) || 1)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Children (Below 12 yrs)</label>
                <input 
                  type="number" 
                  min="0"
                  max="4"
                  value={children}
                  onChange={e => setChildren(parseInt(e.target.value) || 0)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
            </div>
          </div>

          {/* 3. Payment & Live Pricing Summary */}
          <div>
            <h3 className="text-sm font-semibold text-[#7B1E22] flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4" /> 3. Payment Details
            </h3>
            
            {/* Live Pricing Summary Box */}
            <div className="bg-[#FAF6F0] p-4 rounded-lg border border-[#e6dfd8] mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Nights:</span>
                <span className="font-semibold text-gray-800">{nights} night(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Room Subtotal:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (12%):</span>
                <span className="font-semibold text-gray-800">{formatCurrency(gst)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-[#e6dfd8]">
                <span className="text-[#7B1E22]">Total Amount:</span>
                <span className="text-[#7B1E22]">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Advance Payment (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  max={total}
                  value={advancePaid}
                  onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Payment Mode</label>
                <select 
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Bank Transfer">Bank Transfer / NetBanking</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Special Requests / Notes</label>
                <textarea 
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Late check-in, extra bedding"
                  className="w-full text-sm px-3 py-2 border border-[#e6dfd8] rounded-md focus:ring-1 focus:ring-[#7B1E22]"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e6dfd8] flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm border border-[#e6dfd8] rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2 text-sm bg-[#7B1E22] text-white rounded-md hover:bg-[#8C1D24] font-medium"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
