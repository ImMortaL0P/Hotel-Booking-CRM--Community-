import React, { useState, useMemo } from 'react';
import { 
  Building, Calendar, Users, CheckCircle, ShieldCheck, Phone, 
  MapPin, Clock, CreditCard, Sparkles, AlertCircle, ArrowRight, 
  Bed, Wifi, Tv, Coffee, Bath, ChevronRight, Share2, Copy
} from 'lucide-react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { toast } from 'sonner';
import { apiFetch, API_BASE_URL } from '../lib/api';
import { useData } from '../data/DataContext';
import logoUrl from '../../assets/logo.png';

export function CustomerBookingPage() {
  const dataContext = useData();
  const rooms = dataContext?.rooms || [];

  // Date state
  const todayStr = useMemo(() => {
    const d = new Date();
    return format(d, 'yyyy-MM-dd');
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = addDays(new Date(), 1);
    return format(d, 'yyyy-MM-dd');
  }, []);

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'Double Bed Room' | 'Family Bed Room'>('Double Bed Room');

  // Guest details
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestCity, setGuestCity] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Status state
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any | null>(null);

  // Nights calculation
  const nights = useMemo(() => {
    try {
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      const diff = differenceInCalendarDays(d2, d1);
      return diff > 0 ? diff : 1;
    } catch {
      return 1;
    }
  }, [checkIn, checkOut]);

  // Tariff calculation
  const roomTariff = selectedCategory === 'Family Bed Room' ? 3000 : 1500;
  const totalAmount = roomTariff * nights;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!guestName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }

    if (!guestPhone.trim() || guestPhone.trim().length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!guestEmail.trim() || !guestEmail.includes('@')) {
      toast.error('Please provide a valid email address to receive your confirmation voucher.');
      return;
    }

    setSubmitting(true);

    const checkInDateTime = `${checkIn}T12:00:00`;
    const checkOutDateTime = `${checkOut}T11:00:00`;

    const payload = {
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      guestAddress: guestCity.trim() || 'Direct Online Reservation',
      checkIn: checkInDateTime,
      checkOut: checkOutDateTime,
      adults,
      children,
      roomCategory: selectedCategory,
      specialRequests: specialRequests.trim()
    };

    let serverSuccessData: any = null;

    // 1. Try sending to backend server if available
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/booking-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          serverSuccessData = json.data;
        }
      }
    } catch (err) {
      console.warn('Backend server unreachable, saving to client CRM context:', err);
    }

    // 2. Fallback / client CRM integration: always add to DataContext if available
    const generatedRefId = serverSuccessData?.bookingId || `SP-${Date.now().toString().slice(-6)}`;
    
    if (dataContext && dataContext.addBooking) {
      try {
        // Find an operational room in selected category
        const availableRoom = rooms.find(
          r => r.category === selectedCategory && r.status !== 'Coming Soon' && r.status !== 'Maintenance'
        ) || rooms.find(r => r.category === selectedCategory) || rooms[0];

        // Create or find guest
        let guestId = `g-${Date.now().toString(36)}`;
        if (dataContext.addGuest) {
          dataContext.addGuest({
            name: guestName.trim(),
            email: guestEmail.trim(),
            phone: guestPhone.trim(),
            address: guestCity.trim() || 'Online Customer Portal',
            idType: 'Aadhaar',
            idNumber: ''
          });
        }

        dataContext.addBooking({
          guestId,
          roomId: availableRoom ? availableRoom.id : 'rm-101',
          checkIn: checkInDateTime,
          checkOut: checkOutDateTime,
          adults,
          children,
          totalAmount,
          paidAmount: 0,
          balance: totalAmount,
          status: 'Booked',
          source: 'Website / Guest Request',
          paymentStatus: 'Pending',
          specialRequests: specialRequests.trim() ? `${specialRequests.trim()} (Direct Guest Request)` : 'Direct Guest Request'
        });
      } catch (clientErr) {
        console.error('Failed to dispatch booking to client context:', clientErr);
      }
    }

    setSubmitting(false);
    setBookingSuccess({
      refId: generatedRefId,
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      category: selectedCategory,
      checkIn: checkInDateTime,
      checkOut: checkOutDateTime,
      nights,
      adults,
      children,
      totalAmount
    });
    toast.success('Your reservation request has been submitted successfully!');
  };

  const copyRefNumber = () => {
    if (bookingSuccess?.refId) {
      navigator.clipboard.writeText(bookingSuccess.refId);
      toast.success('Booking Reference ID copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#f5f2eb] font-sans antialiased selection:bg-[#a87444] selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-[#12151b] border-b border-[#222730] py-2 px-4 text-center text-xs font-mono text-[#a87444] flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-[#a87444]" />
        <span>Official Hotel Sharda Palace Direct Reservation Desk · Best Rate Guarantee</span>
      </div>

      {/* Main Header */}
      <header className="border-b border-[#1f242d] bg-[#0d1015]/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={logoUrl} 
              alt="Hotel Sharda Palace" 
              className="w-10 h-10 rounded object-cover border border-[#2a2f3b]" 
            />
            <div>
              <h1 className="font-bold text-lg tracking-wider uppercase font-mono text-[#f5f2eb] leading-tight">
                Hotel Sharda Palace
              </h1>
              <p className="text-[11px] text-[#9e978e] font-mono flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#a87444]" /> Deoghar, Jharkhand · Baidyanath Dham
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="tel:+919431131088" 
              className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#f5f2eb] bg-[#161a22] hover:bg-[#1f2530] border border-[#262c37] px-3 py-1.5 rounded-full transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#a87444]" />
              <span>+91 94311 31088</span>
            </a>
          </div>
        </div>
      </header>

      {/* Content Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {bookingSuccess ? (
          /* Confirmation Success Screen */
          <div className="bg-[#12161e] border border-[#2b3340] rounded-2xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full flex items-center justify-center mx-auto text-[#4ade80]">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f5f2eb]">
                Booking Request Submitted!
              </h2>
              <p className="text-sm text-[#9e978e] max-w-lg mx-auto">
                Thank you, <strong className="text-white">{bookingSuccess.guestName}</strong>. Your reservation request has been registered in our hotel system.
              </p>
            </div>

            {/* Reference Badge */}
            <div className="bg-[#181d27] border border-[#2f3847] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#a87444]">
                  Booking Reference Number
                </span>
                <p className="text-2xl font-mono font-bold text-white tracking-wider">
                  {bookingSuccess.refId}
                </p>
              </div>
              <button
                onClick={copyRefNumber}
                className="flex items-center gap-2 text-xs font-mono bg-[#232936] hover:bg-[#2e3748] text-white px-4 py-2 rounded-lg border border-[#3b4557] transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-[#a87444]" /> Copy Ref ID
              </button>
            </div>

            {/* Booking Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
              <div className="bg-[#161a22] p-4 rounded-xl border border-[#222834]">
                <span className="text-xs text-[#9e978e] uppercase block mb-1">Room Category</span>
                <span className="font-semibold text-white text-base">{bookingSuccess.category}</span>
              </div>
              <div className="bg-[#161a22] p-4 rounded-xl border border-[#222834]">
                <span className="text-xs text-[#9e978e] uppercase block mb-1">Stay Duration</span>
                <span className="font-semibold text-white text-base">{bookingSuccess.nights} Night{bookingSuccess.nights > 1 ? 's' : ''} ({bookingSuccess.adults} Adults)</span>
              </div>
              <div className="bg-[#161a22] p-4 rounded-xl border border-[#222834]">
                <span className="text-xs text-[#9e978e] uppercase block mb-1">Check-in</span>
                <span className="font-semibold text-[#4ade80] text-base">
                  {new Date(bookingSuccess.checkIn).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span className="text-xs text-[#9e978e] ml-2">(from 12:00 PM)</span>
                </span>
              </div>
              <div className="bg-[#161a22] p-4 rounded-xl border border-[#222834]">
                <span className="text-xs text-[#9e978e] uppercase block mb-1">Check-out</span>
                <span className="font-semibold text-[#fbbf24] text-base">
                  {new Date(bookingSuccess.checkOut).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <span className="text-xs text-[#9e978e] ml-2">(until 11:00 AM)</span>
                </span>
              </div>
            </div>

            {/* What Happens Next Card */}
            <div className="bg-[#a87444]/10 border border-[#a87444]/30 rounded-xl p-5 space-y-3">
              <h3 className="font-mono text-sm font-bold text-[#a87444] uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> What happens next?
              </h3>
              <p className="text-xs text-[#dcd7cf] leading-relaxed">
                1. Our front desk staff will verify room availability and confirm your reservation inside the CRM.<br />
                2. <strong>Confirmation Email:</strong> Once confirmed by our admin team, an official detailed confirmation email containing your check-in voucher and instructions will be delivered to <strong className="text-white underline">{bookingSuccess.guestEmail}</strong>.<br />
                3. <strong>Payment:</strong> No advance payment is charged today. Full payment (₹{bookingSuccess.totalAmount.toLocaleString('en-IN')}) is accepted at reception during check-in.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://wa.me/919431131088?text=${encodeURIComponent(`Namaste Sharda Palace, I have submitted booking request ${bookingSuccess.refId} for ${bookingSuccess.guestName} (${bookingSuccess.category}, ${bookingSuccess.nights}N). Please confirm availability.`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold text-center py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                Message Reception on WhatsApp
              </a>
              <button
                onClick={() => {
                  setBookingSuccess(null);
                  setGuestName('');
                  setSpecialRequests('');
                }}
                className="bg-[#1e232d] hover:bg-[#282f3c] text-white border border-[#313a4a] text-center py-3 px-4 rounded-xl text-sm font-medium transition-colors"
              >
                Make Another Booking
              </button>
            </div>
          </div>
        ) : (
          /* Single Page Booking Form */
          <div className="space-y-8">
            {/* Hero intro */}
            <div className="text-center space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#a87444] px-3 py-1 rounded-full bg-[#a87444]/10 border border-[#a87444]/30">
                Direct Guest Portal
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f5f2eb]">
                Reserve Your Stay
              </h2>
              <p className="text-sm text-[#9e978e] max-w-lg mx-auto">
                Select your dates, choose your room, and receive confirmation directly from Hotel Sharda Palace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Stay Schedule */}
              <div className="bg-[#12161e] border border-[#222834] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-[#202530] pb-4">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#a87444] flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> 1. Select Dates & Guests
                  </h3>
                  <span className="text-xs font-mono text-[#9e978e]">
                    Standard checkout: 11:00 AM
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Check-In Date
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      value={checkIn}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (new Date(e.target.value) >= new Date(checkOut)) {
                          setCheckOut(format(addDays(new Date(e.target.value), 1), 'yyyy-MM-dd'));
                        }
                      }}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                      required
                    />
                    <span className="text-[10px] text-[#22c55e] font-mono mt-1 block">Check-in from 12:00 PM</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Check-Out Date
                    </label>
                    <input
                      type="date"
                      min={checkIn}
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                      required
                    />
                    <span className="text-[10px] text-[#fbbf24] font-mono mt-1 block">Checkout at 11:00 AM</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Adults (12+ yrs)
                    </label>
                    <select
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                    >
                      {[1, 2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Children (0-11 yrs)
                    </label>
                    <select
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                    >
                      {[0, 1, 2, 3].map(n => (
                        <option key={n} value={n}>{n} Child{n > 1 ? 'ren' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-[#171c25] rounded-xl p-3 text-xs font-mono text-[#a1a1aa] flex items-center justify-between">
                  <span>Selected Stay: <strong className="text-white">{nights} Night{nights > 1 ? 's' : ''}</strong></span>
                  <span className="text-[#a87444]">Daily operational cycle: 11 AM - 11 AM</span>
                </div>
              </div>

              {/* Step 2: Room Selection */}
              <div className="bg-[#12161e] border border-[#222834] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-[#202530] pb-4">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#a87444] flex items-center gap-2">
                    <Bed className="w-4 h-4" /> 2. Choose Room Category
                  </h3>
                  <p className="text-xs text-[#9e978e] mt-1">
                    Select your preferred accommodation type. Non-operational rooms are clearly labeled.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category 1: Double Bed Room */}
                  <div
                    onClick={() => setSelectedCategory('Double Bed Room')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedCategory === 'Double Bed Room'
                        ? 'bg-[#181d27] border-[#a87444] shadow-lg shadow-[#a87444]/10 ring-1 ring-[#a87444]'
                        : 'bg-[#141820] border-[#252c39] hover:border-[#3d4659]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-base text-white">Double Bed Room</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-lg text-[#a87444]">₹1,500</span>
                          <span className="text-[10px] text-[#9e978e] block">/ night</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#9e978e] mb-4">
                        Comfortable air-conditioned room with 1 King Double Bed, ideal for couples or solo travelers.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#a1a1aa] mb-4">
                        <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-[#a87444]" /> High-speed Wi-Fi</span>
                        <span className="flex items-center gap-1.5"><Tv className="w-3.5 h-3.5 text-[#a87444]" /> Flat Screen TV</span>
                        <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5 text-[#a87444]" /> Ensuite Bath & 24h Hot Water</span>
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#a87444]" /> Max 2 Adults</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#252c39] flex items-center justify-between text-xs font-mono">
                      <span className="text-[#9e978e]">Total for {nights}N:</span>
                      <span className="font-bold text-white">₹{(1500 * nights).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Category 2: Family Bed Room */}
                  <div
                    onClick={() => setSelectedCategory('Family Bed Room')}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedCategory === 'Family Bed Room'
                        ? 'bg-[#181d27] border-[#a87444] shadow-lg shadow-[#a87444]/10 ring-1 ring-[#a87444]'
                        : 'bg-[#141820] border-[#252c39] hover:border-[#3d4659]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-base text-white">Family Bed Room</span>
                        <div className="text-right">
                          <span className="font-mono font-bold text-lg text-[#a87444]">₹3,000</span>
                          <span className="text-[10px] text-[#9e978e] block">/ night</span>
                        </div>
                      </div>
                      <p className="text-xs text-[#9e978e] mb-4">
                        Spacious suite with 2 Double Beds, accommodating families or small pilgrimage groups comfortably.
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#a1a1aa] mb-4">
                        <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-[#a87444]" /> High-speed Wi-Fi</span>
                        <span className="flex items-center gap-1.5"><Tv className="w-3.5 h-3.5 text-[#a87444]" /> Flat Screen TV</span>
                        <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5 text-[#a87444]" /> Attached Bathroom</span>
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#a87444]" /> Up to 4 Guests</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#252c39] flex items-center justify-between text-xs font-mono">
                      <span className="text-[#9e978e]">Total for {nights}N:</span>
                      <span className="font-bold text-white">₹{(3000 * nights).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Coming Soon Notice for Floor 2 Rooms (201, 202, 203) */}
                <div className="bg-[#151922] border border-dashed border-[#2f3747] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 opacity-70">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-white">Floor 2 Suites (Rooms 201, 202, 203)</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-[#a87444]/20 text-[#a87444] border border-[#a87444]/40 font-bold">
                        Coming Soon · Non-Operational
                      </span>
                    </div>
                    <p className="text-[11px] text-[#9e978e]">
                      Rooms 201, 202 & 203 are currently undergoing curated renovation and are not available for booking.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#71717a] shrink-0">Opening Shortly</span>
                </div>
              </div>

              {/* Step 3: Guest Contact Details */}
              <div className="bg-[#12161e] border border-[#222834] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-[#202530] pb-4">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#a87444] flex items-center gap-2">
                    <Users className="w-4 h-4" /> 3. Guest Information
                  </h3>
                  <p className="text-xs text-[#9e978e] mt-1">
                    Please ensure accurate contact details to receive your booking confirmation email and voucher.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar Sharma"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Email Address * (For Confirmation Voucher)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh.sharma@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Mobile / WhatsApp Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[#282f3d] bg-[#161a22] text-[#9e978e] text-xs font-mono">
                        +91
                      </span>
                      <input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="w-full bg-[#0d1015] border border-[#282f3d] rounded-r-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      City & State (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Patna, Bihar"
                      value={guestCity}
                      onChange={(e) => setGuestCity(e.target.value)}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono text-[#9e978e] mb-2 uppercase">
                      Special Requests / Estimated Arrival Time
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Arriving via train at Jasidih Jn at 1:30 PM, early check-in if possible, need quiet room."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      className="w-full bg-[#0d1015] border border-[#282f3d] rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-[#a87444]"
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Live Price Summary & Policies */}
              <div className="bg-[#12161e] border border-[#222834] rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="border-b border-[#202530] pb-4">
                  <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#a87444] flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> 4. Summary & Rate Policy
                  </h3>
                </div>

                <div className="space-y-3 font-mono text-sm">
                  <div className="flex justify-between text-[#9e978e]">
                    <span>{selectedCategory} ({nights} Night{nights > 1 ? 's' : ''})</span>
                    <span className="text-white">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[#9e978e]">
                    <span>Taxes & Service</span>
                    <span className="text-[#22c55e]">Included</span>
                  </div>
                  <div className="border-t border-[#202530] pt-3 flex justify-between items-center text-base">
                    <span className="font-bold text-white">Estimated Payable at Check-in:</span>
                    <span className="text-2xl font-bold text-[#a87444]">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Policies Checklist */}
                <div className="bg-[#171c26] rounded-xl p-4 space-y-2 text-xs font-mono text-[#a1a1aa]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span><strong>No advance payment required:</strong> Pay directly during check-in via Cash, Card, or UPI.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#fbbf24] shrink-0" />
                    <span><strong>Operational Timings:</strong> Check-in from 12:00 PM · Checkout strictly 11:00 AM.</span>
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#a87444] hover:bg-[#966336] text-white font-mono font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-[#a87444]/20 flex items-center justify-center gap-3 text-base disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <span>Registering Reservation Request...</span>
                  ) : (
                    <>
                      <span>Submit Booking Request</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1f29] bg-[#0b0d12] py-8 px-4 text-center text-xs font-mono text-[#71717a] space-y-2">
        <p className="text-[#9e978e]">Hotel Sharda Palace · Baidyanath Dham, Deoghar, Jharkhand 814112</p>
        <p>Reservations & Helpdesk: +91 94311 31088 / +91 98357 41088 · Direct Online Booking System</p>
      </footer>
    </div>
  );
}
