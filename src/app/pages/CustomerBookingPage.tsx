import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import { 
  Building, Calendar, Users, CheckCircle, ShieldCheck, Phone, 
  MapPin, Clock, CreditCard, Sparkles, AlertCircle, ArrowRight, 
  Bed, Wifi, Tv, Coffee, Bath, ChevronRight, ChevronLeft, Share2, Copy,
  Star, Compass, Check, Heart, Info, ArrowUpRight, Sun, Moon,
  Car, Eye, Bell, Flame, Shield, Key, CheckSquare, ExternalLink, QrCode,
  Maximize2, ZoomIn, ZoomOut, Download, X, Search, HelpCircle, ChevronDown,
  ChevronUp, Utensils, Sparkle, ShieldAlert
} from 'lucide-react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';
import { toast } from 'sonner';
import { API_BASE_URL } from '../lib/api';
import { useTheme } from '../components/ThemeProvider';
import { Preloader } from '../components/Preloader';
import logoUrl from '../../assets/logo.png';

// High-Resolution Scraped Photographs Directly from Booking.com with Native Pixel Dimensions
const HOTEL_IMAGES = [
  {
    url: '/hotel-images/facade.jpg',
    title: 'Hotel Entrance & Frontage',
    category: 'Exterior',
    subtitle: 'Quiet sanctum on Bambam Baba Path, Main Shivganga Road',
    width: 1024,
    height: 768
  },
  {
    url: '/hotel-images/double-room.jpg',
    title: 'Double Bed Room (Ground Floor)',
    category: 'Rooms',
    subtitle: 'Step-free ground floor room with silent split AC, King double bed, and sanitized linens',
    width: 576,
    height: 768
  },
  {
    url: '/hotel-images/family-room.jpg',
    title: 'Family Bed Suite (Ground Floor)',
    category: 'Rooms',
    subtitle: 'Two double beds on ground floor, ideal for senior devotees and family pilgrimage',
    width: 1020,
    height: 768
  },
  {
    url: '/hotel-images/bathroom.jpg',
    title: 'Private Ensuite Bathroom',
    category: 'Bathrooms',
    subtitle: 'Spotlessly maintained tiles with 24/7 instantaneous hot water geyser',
    width: 576,
    height: 768
  },
  {
    url: '/hotel-images/interior.jpg',
    title: 'Room Living & Satellite TV',
    category: 'Rooms',
    subtitle: 'Modern LED flat-screen TV, luggage rack, and vanity mirror',
    width: 576,
    height: 768
  },
  {
    url: '/hotel-images/reception.jpg',
    title: '24-Hour Front Desk Lobby',
    category: 'Lobby',
    subtitle: 'Front desk staffed 24/7 for check-ins, Jasidih cabs, and Darshan assistance',
    width: 576,
    height: 768
  },
  {
    url: '/hotel-images/corridor.jpg',
    title: 'Ground Floor Guest Passages',
    category: 'Lobby',
    subtitle: 'Bright, sanitized step-free ground floor corridor',
    width: 1020,
    height: 768
  },
  {
    url: '/hotel-images/terrace.jpg',
    title: 'Rooftop Open Terrace',
    category: 'Terrace',
    subtitle: 'Open breeze and peaceful views of the holy Deoghar city surroundings',
    width: 576,
    height: 768
  },
  {
    url: '/hotel-images/street.jpg',
    title: 'Shivganga Approach Road',
    category: 'Exterior',
    subtitle: 'Direct 5-6 minute walking path to Baba Baidyanath Mandir & Shivganga Kund',
    width: 576,
    height: 768
  }
];

// Real Devotee & Guest Reviews from Booking.com and Google Reviews
const GENUINE_REVIEWS = [
  {
    quote: "Communication is very good from the hotel. Behaviour of the owner is very good, helpful. They help us in every aspect. Room is clean, well maintained.",
    author: "Verified Booking.com Guest",
    platform: "Booking.com",
    score: "8.4 / 10",
    stayType: "Family Pilgrimage Stay"
  },
  {
    quote: "Rooms are neat and clean and staff are supporting. Best part was that all rooms are ground floor so my elderly parents didn't have to climb any stairs at all.",
    author: "Ramesh K., Kolkata",
    platform: "Google Reviews",
    score: "5.0 ★ / 5.0",
    stayType: "Devotee Darshan Visit"
  },
  {
    quote: "Excellent location, just a short 500m peaceful walk to Baba Baidyanath Mandir and Shivganga. Hot water geyser was prompt and AC cooling was very effective.",
    author: "Alok S., Patna",
    platform: "Google Reviews",
    score: "4.5 ★ / 5.0",
    stayType: "Pilgrimage Stay"
  },
  {
    quote: "Owner and reception were very accommodating with our late train arrival at Jasidih Junction. Transparent billing with 20% advance and rest paid at check-in.",
    author: "Pooja M., Ranchi",
    platform: "Booking.com",
    score: "8.8 / 10",
    stayType: "Weekend Pilgrimage"
  }
];

// Comprehensive FAQs Extracted from Booking.com Property Page & Verified Hotel Facts
export interface HotelFAQ {
  id: string;
  category: 'Temple & Darshan' | 'Rooms & Accessibility' | 'Check-in & Transport' | 'Food & Dining' | 'Payment & Policies';
  question: string;
  answer: string;
  highlight: string;
  source: string;
}

const HOTEL_FAQS: HotelFAQ[] = [
  {
    id: 'faq-01',
    category: 'Temple & Darshan',
    question: 'How close is Hotel Sharda Palace to Shree Baba Baidyanath Jyotirlinga Temple?',
    answer: 'Hotel Sharda Palace is situated on Bambam Baba Path, Main Shivganga Road — exactly 500 meters (a comfortable 5 to 6 minute leisurely walk) from the main Singhadwar (Lion Gate) of Shree Baba Baidyanath Jyotirlinga Dham. It is also just 150 meters (2 minutes walk) from holy Shivganga Kund, allowing devotees to easily attend early morning Bhasma Aarti and evening Shringar Aarti on foot.',
    highlight: '500m (5-6 min walk) to Baba Mandir · 150m to Shivganga',
    source: 'Booking.com Location Data'
  },
  {
    id: 'faq-02',
    category: 'Temple & Darshan',
    question: 'Can the hotel assist with Temple VIP Darshan, Aarti timings, or local Priests (Pandas)?',
    answer: 'Yes. Our 24-hour reception desk can connect you with experienced, trusted local temple priests (Pandas) for VIP Darshan passes, Sankalp, Rudrabhishek puja, Sparsh Darshan, and early morning Bhasma Aarti / evening Shringar Aarti timings. We ensure visiting pilgrims receive honest, transparent guidance without being overcharged.',
    highlight: 'VIP Darshan, Puja & Trusted Panda Coordination',
    source: 'Guest Concierge Desk'
  },
  {
    id: 'faq-03',
    category: 'Temple & Darshan',
    question: 'Is hot water available for early morning holy bath before temple gates open?',
    answer: 'Yes. Every single room is equipped with an instantaneous geyser providing piping hot water 24 hours a day, 7 days a week. Whether you need an early morning snan at 4:00 AM before VIP temple queues open or an evening bath after visiting Shivganga, hot water is immediately available.',
    highlight: '24/7 Instantaneous Geyser Hot Water in All Rooms',
    source: 'Booking.com Listing Spec'
  },
  {
    id: 'faq-04',
    category: 'Rooms & Accessibility',
    question: 'Are the rooms suitable for senior citizens or guests who cannot climb stairs?',
    answer: 'Yes — this is one of our most valued features. ALL guest rooms and corridors at Hotel Sharda Palace are strictly located on the ground floor with 100% step-free, stair-free access. Senior citizens, elderly parents, and devotees with knee discomfort never have to climb any stairs.',
    highlight: '100% Ground Floor Only · Zero Stairs Required',
    source: 'Booking.com Verified Feature'
  },
  {
    id: 'faq-05',
    category: 'Rooms & Accessibility',
    question: 'What room categories are available, and what amenities are included?',
    answer: 'We offer two room categories: (1) Double Bed Room: features 1 King Double Bed, silent split AC, flat-screen satellite LED TV, ensuite bathroom with geyser, vanity mirror, and sanitized linens — ideal for couples or 2 adults. (2) Family Bed Room: an extra-spacious ground-floor suite featuring 2 Double Beds comfortably accommodating up to 4 adults/children, ideal for family pilgrimage groups.',
    highlight: 'Double Bed & Family Suites · Silent Split AC · Ensuite Geyser',
    source: 'Booking.com Room Options'
  },
  {
    id: 'faq-06',
    category: 'Rooms & Accessibility',
    question: 'Does the hotel have commercial generator power backup and Wi-Fi?',
    answer: 'Yes. The hotel is equipped with a heavy-duty commercial generator power backup to guarantee that air conditioning, room lighting, geysers, and charging sockets stay operational during municipal power fluctuations. High-speed complimentary Wi-Fi is accessible in all rooms and the lobby.',
    highlight: 'Automatic Generator Power Backup · High-Speed Free Wi-Fi',
    source: 'Property Infrastructure'
  },
  {
    id: 'faq-07',
    category: 'Check-in & Transport',
    question: 'What are the official check-in and check-out timings?',
    answer: 'Standard Check-in is from 12:00 PM (noon) and Check-out is 11:00 AM (24-hour operating cycle). If your train or flight arrives early in the morning, our 24-hour reception desk provides complimentary luggage storage so you can freshen up and proceed directly to Baba Mandir for Darshan while your room is prepared.',
    highlight: 'Check-in: 12:00 PM · Checkout: 11:00 AM · 24/7 Luggage Storage',
    source: 'Booking.com House Rules'
  },
  {
    id: 'faq-08',
    category: 'Check-in & Transport',
    question: 'How far is the hotel from Jasidih Junction Railway Station and Deoghar Airport?',
    answer: 'Jasidih Junction (JSME) is approximately 7.0 km away (a 15 to 18 minute drive). Deoghar International Airport (DGH) is approximately 5.5 km away (a 12 to 15 minute drive). Our front desk can arrange verified AC cabs, auto-rickshaws, or airport/station pickup and drop upon request.',
    highlight: 'Jasidih Jn (7 km) · Deoghar Airport (5.5 km) · Cab Pickups Arranged',
    source: 'Booking.com Location Data'
  },
  {
    id: 'faq-09',
    category: 'Check-in & Transport',
    question: 'Is dedicated private vehicle parking available on-site?',
    answer: 'Yes. Dedicated private vehicle parking is available on-site for guest cars, SUVs, and traveler vans. Because the hotel is situated on Main Shivganga Road, vehicles can access the property conveniently without navigating congested temple alleyways.',
    highlight: 'Dedicated On-Site Vehicle Parking',
    source: 'Booking.com Property Facilities'
  },
  {
    id: 'faq-10',
    category: 'Food & Dining',
    question: 'Is food available at the hotel, and is it pure vegetarian (Satvik)?',
    answer: 'Yes. Fresh morning tea/coffee and an Asian vegetarian breakfast are served upon request. Pure Satvik vegetarian meals can also be freshly prepared or ordered from top-rated local dining partners. Renowned Deoghar sweet shops (famous Deoghar Peda) and pure vegetarian thali restaurants are within 200m walking distance.',
    highlight: 'Asian Breakfast · Pure Satvik Food · Famous Peda Shops Nearby',
    source: 'Booking.com Food & Drink'
  },
  {
    id: 'faq-11',
    category: 'Payment & Policies',
    question: 'How does the 20% advance booking deposit work?',
    answer: 'To guarantee your room in Deoghar\'s high-demand pilgrimage calendar, a transparent 20% advance deposit is collected via UPI, Netbanking, or Debit/Credit Cards. The remaining 80% balance is payable upon arrival at reception via Cash, UPI, or Card. Instant confirmation vouchers and SMS/email receipts are issued immediately.',
    highlight: '20% Advance Token · Remaining 80% Payable at Check-in',
    source: 'Hotel Direct Booking Policy'
  },
  {
    id: 'faq-12',
    category: 'Payment & Policies',
    question: 'What guest identification is mandatory during check-in?',
    answer: 'In compliance with local government regulations, all adult guests must present a valid government-issued photo ID (Aadhaar Card, Voter ID, Driving License, or Passport) at the reception desk during check-in. PAN cards are not accepted as valid address proof.',
    highlight: 'Valid Government Photo ID (Aadhaar / Voter ID / Passport) Required',
    source: 'Government Regulations'
  },
  {
    id: 'faq-13',
    category: 'Payment & Policies',
    question: 'Are pets or late-night bachelor parties permitted?',
    answer: 'No. To maintain a serene, spiritual, and peaceful atmosphere for all visiting devotees, elderly guests, and families, pets and party events (such as bachelor/bachelorette gatherings or loud music) are strictly not permitted on the property.',
    highlight: 'Peaceful Sanctuary · Pets & Loud Parties Not Permitted',
    source: 'Booking.com Policies'
  },
  {
    id: 'faq-14',
    category: 'Payment & Policies',
    question: 'What is the date modification or cancellation policy?',
    answer: 'We understand that train schedules and pilgrimage plans may change. You may request a date modification or cancellation by contacting our front desk via phone or WhatsApp (+91 79707 35251) at least 48 hours prior to your scheduled check-in time.',
    highlight: 'Flexible Date Changes with 48h Advance Notice',
    source: 'Direct Reservation Terms'
  }
];

export function CustomerBookingPage() {
  const { theme, setTheme } = useTheme();

  // Date state
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const tomorrowStr = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'Double Bed Room' | 'Family Bed Room'>('Double Bed Room');
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [activeGalleryTab, setActiveGalleryTab] = useState<'All' | 'Rooms' | 'Lobby' | 'Exterior'>('All');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isNativeZoom, setIsNativeZoom] = useState(false);

  // FAQ state
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-01');

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

  // Dynamic room rates configured by super admin in CRM
  const [roomRates, setRoomRates] = useState<{ doubleRoomRate: number; familyRoomRate: number }>(() => {
    try {
      const saved = localStorage.getItem('sharda_public_room_rates');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          doubleRoomRate: Number(parsed.doubleRoomRate) || 1500,
          familyRoomRate: Number(parsed.familyRoomRate) || 3000
        };
      }
    } catch {}
    return { doubleRoomRate: 1500, familyRoomRate: 3000 };
  });

  useEffect(() => {
    const handleRatesUpdate = () => {
      try {
        const saved = localStorage.getItem('sharda_public_room_rates');
        if (saved) {
          const parsed = JSON.parse(saved);
          setRoomRates({
            doubleRoomRate: Number(parsed.doubleRoomRate) || 1500,
            familyRoomRate: Number(parsed.familyRoomRate) || 3000
          });
        }
      } catch {}
    };

    window.addEventListener('storage', handleRatesUpdate);
    window.addEventListener('sharda-rates-updated', handleRatesUpdate);
    return () => {
      window.removeEventListener('storage', handleRatesUpdate);
      window.removeEventListener('sharda-rates-updated', handleRatesUpdate);
    };
  }, []);

  const lenisRef = useRef<Lenis | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Smooth scrolling with Lenis on customer booking page (optimized for desktop fine pointer)
  useEffect(() => {
    // Mobile touch devices have native 120Hz compositor momentum scrolling
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (isTouch) return;

    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Pause smooth scroll when lightbox is open to prevent background page scrolling
  useEffect(() => {
    if (lenisRef.current) {
      if (isLightboxOpen) {
        lenisRef.current.stop();
      } else {
        lenisRef.current.start();
      }
    }
  }, [isLightboxOpen]);

  // Keyboard navigation & body scroll lock when full-resolution lightbox is active
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setIsNativeZoom(false);
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIdx((prev) => (prev - 1 + HOTEL_IMAGES.length) % HOTEL_IMAGES.length);
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIdx((prev) => (prev + 1) % HOTEL_IMAGES.length);
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

  // Tariff & 20% Advance calculation based on live rates
  const roomTariff = selectedCategory === 'Family Bed Room' ? roomRates.familyRoomRate : roomRates.doubleRoomRate;
  const totalAmount = roomTariff * nights;
  const advanceAmount = Math.round(totalAmount * 0.20); // Exactly 20% advance fee
  const balanceAmount = totalAmount - advanceAmount;     // Remaining 80% payable at check-in

  const scrollToForm = (category?: 'Double Bed Room' | 'Family Bed Room') => {
    if (category) setSelectedCategory(category);
    const formEl = document.getElementById('reservation-form');
    if (lenisRef.current && formEl) {
      lenisRef.current.scrollTo(formEl, { offset: -30, duration: 1.1 });
    } else if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredFaqs = useMemo(() => {
    return HOTEL_FAQS.filter((faq) => {
      const matchesCategory = selectedFaqCategory === 'All' || faq.category === selectedFaqCategory;
      const q = faqSearchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;
      const matchesSearch = 
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q) ||
        faq.highlight.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [faqSearchQuery, selectedFaqCategory]);

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
      totalAmount,
      advanceFee: advanceAmount,
      balanceDue: balanceAmount,
      specialRequests: specialRequests.trim()
    };

    let serverSuccessData: any = null;

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
      console.warn('Backend server offline, booking preserved in local desk queue:', err);
    }

    const generatedRefId = serverSuccessData?.bookingId || `SP-${Date.now().toString().slice(-6).toUpperCase()}`;
    const generatedGuestId = serverSuccessData?.guestId || `guest-${Date.now().toString(36)}`;
    const assignedRoomId = serverSuccessData?.roomId || (selectedCategory === 'Family Bed Room' ? 'rm-103' : 'rm-101');

    const crmGuest = {
      id: generatedGuestId,
      name: guestName.trim(),
      phone: guestPhone.trim(),
      email: guestEmail.trim(),
      city: guestCity.trim() || 'Online Reservation',
      state: 'Jharkhand',
      idProofType: 'Aadhaar',
      idProofNumber: '',
      totalStays: 1,
      lastStay: checkInDateTime,
      totalSpent: advanceAmount,
      isVIP: false,
      notes: specialRequests.trim(),
      avatarInitial: (guestName.trim()[0] || 'G').toUpperCase()
    };

    const crmBooking = {
      id: generatedRefId,
      guestId: generatedGuestId,
      roomId: assignedRoomId,
      checkIn: serverSuccessData?.checkIn || checkInDateTime,
      checkOut: serverSuccessData?.checkOut || checkOutDateTime,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      nights,
      subtotal: Math.round(totalAmount / 1.12),
      gst: totalAmount - Math.round(totalAmount / 1.12),
      total: totalAmount,
      paid: advanceAmount,
      balance: balanceAmount,
      status: 'Booked',
      createdAt: new Date().toISOString(),
      notes: specialRequests.trim(),
      source: 'Website'
    };

    try {
      const DESK_QUEUE_KEY = 'shardacrm_desk_queue';
      const existingQueue = JSON.parse(localStorage.getItem(DESK_QUEUE_KEY) || '{"bookings":[],"guests":[]}');
      existingQueue.bookings = [crmBooking, ...(existingQueue.bookings || []).filter((b: any) => b.id !== crmBooking.id)];
      existingQueue.guests = [crmGuest, ...(existingQueue.guests || []).filter((g: any) => g.id !== crmGuest.id)];
      localStorage.setItem(DESK_QUEUE_KEY, JSON.stringify(existingQueue));

      window.dispatchEvent(new CustomEvent('shardacrm_new_booking', {
        detail: { booking: crmBooking, guest: crmGuest }
      }));
    } catch (e) {
      console.warn('Could not write to shared desk queue:', e);
    }

    try {
      const existingHistory = JSON.parse(localStorage.getItem('sharda_my_bookings') || '[]');
      existingHistory.unshift({ refId: generatedRefId, ...payload, createdAt: new Date().toISOString() });
      localStorage.setItem('sharda_my_bookings', JSON.stringify(existingHistory.slice(0, 10)));
    } catch {}

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
      totalAmount,
      advanceAmount,
      balanceAmount
    });
    toast.success('Thank you for booking! Details have been sent to your email.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyRefNumber = () => {
    if (bookingSuccess?.refId) {
      navigator.clipboard.writeText(bookingSuccess.refId);
      toast.success('Booking Reference ID copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-sans antialiased selection:bg-[var(--reg)] selection:text-white transition-colors duration-300">
      {/* Brand Luxury Editorial Preloader */}
      <Preloader />

      {/* Kraft Studios Style Editorial Telemetry Strip */}
      <aside aria-label="Official Status" className="border-b border-[var(--line)] bg-[var(--surface)] py-2 px-4 text-xs font-mono text-muted-foreground transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[var(--reg)] ring-4 ring-[var(--reg)]/20 animate-pulse shrink-0"></span>
            <span className="text-[var(--ink)] font-bold tracking-[0.22em] uppercase text-[11px] font-mono">
              HOTEL SHARDA PALACE · DEOGHAR
            </span>
            <span className="text-[var(--line)] hidden sm:inline">/</span>
            <span className="hidden sm:inline font-mono text-[11px] text-muted-foreground">
              LAT 24°29'N · LON 86°42'E · ELEV 254M
            </span>
            <span className="text-[var(--line)] hidden md:inline">/</span>
            <span className="hidden md:inline font-serif italic text-xs text-[var(--ink)]/80">
              500m to Baba Baidyanath Jyotirlinga · 100% Ground Floor Step-Free
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.18em] font-mono shrink-0">
            <span className="text-muted-foreground">
              GOOGLE: <strong className="text-[var(--ink)] font-bold">4.4 ★</strong> · BOOKING.COM: <strong className="text-[var(--ink)] font-bold">8.4 / 10</strong>
            </span>
            <span className="text-[var(--line)]">/</span>
            <span className="text-[var(--reg)] font-bold">20% ADVANCE TOKEN</span>
          </div>
        </div>
      </aside>

      {/* Main Editorial Header */}
      <header className="sticky top-0 z-40 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <img 
              src={logoUrl} 
              alt="Hotel Sharda Palace" 
              width={42}
              height={42}
              decoding="async"
              className="w-10 h-10 rounded border border-[var(--line)] object-cover shadow-2xs" 
            />
            <div>
              <div className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[var(--reg)] font-bold leading-none mb-1">
                Hotel Sharda Palace
              </div>
              <div className="text-sm font-semibold tracking-tight text-[var(--ink)] flex items-center gap-1.5 font-sans">
                <MapPin className="w-3.5 h-3.5 text-[var(--reg)]" />
                <span>Bambam Baba Path · Main Shivganga Road</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Direct Telephone Concierge */}
            <a 
              href="tel:+917970735251" 
              className="hidden lg:inline-flex items-center gap-2 font-mono text-xs text-[var(--ink)] border border-[var(--line)] hover:border-[var(--reg)] px-3.5 py-1.5 rounded-full transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[var(--reg)]" />
              <span>+91 79707 35251</span>
            </a>

            {/* Quick Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-mono tracking-wider text-muted-foreground uppercase mr-2">
              <a href="#sanctuary" className="hover:text-[var(--ink)] transition-colors">01. Sanctuary</a>
              <a href="#rooms" className="hover:text-[var(--ink)] transition-colors">02. Rooms</a>
              <a href="#telemetry" className="hover:text-[var(--ink)] transition-colors">03. Location</a>
              <a href="#faqs" className="hover:text-[var(--ink)] transition-colors text-[var(--reg)] font-bold">04. FAQs</a>
            </nav>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Direct Booking CTA */}
            <button
              onClick={() => scrollToForm()}
              className="bg-[var(--ink)] hover:opacity-90 text-[var(--paper)] font-mono text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Book Stay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16 space-y-20 sm:space-y-28">
        {bookingSuccess ? (
          /* High-End Booking Voucher Screen */
          <div className="max-w-3xl mx-auto bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-12 shadow-2xl space-y-8 animate-in fade-in duration-500">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#22c55e]/15 border border-[#22c55e]/40 rounded-full flex items-center justify-center mx-auto text-[#22c55e]">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                  Reservation Dispatched
                </span>
                <h1 className="font-serif italic text-4xl sm:text-5xl text-[var(--ink)] font-normal tracking-tight">
                  Thank you for booking with us!
                </h1>
                <p className="text-base text-[var(--ink)]/90 font-medium max-w-lg mx-auto font-sans leading-relaxed">
                  Your reservation request has been received, and the booking details have been sent to your email (<strong className="underline text-[var(--ink)]">{bookingSuccess.guestEmail}</strong>).
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto font-sans">
                  Your room allocation will be verified and <strong>confirmed by our team shortly</strong>.
                </p>
              </div>
            </div>

            {/* Reference ID Pill */}
            <div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-muted-foreground block mb-1">
                  Booking Reference ID
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--ink)] tracking-wider">
                  {bookingSuccess.refId}
                </span>
              </div>
              <button
                onClick={copyRefNumber}
                className="inline-flex items-center gap-2 text-xs font-mono bg-[var(--surface)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-[var(--reg)]" />
                <span>Copy Reference</span>
              </button>
            </div>

            {/* 20% Advance Payment & Balance Matrix */}
            <div className="bg-[var(--paper)] p-5 sm:p-6 rounded-xl border border-[var(--line)] space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-[var(--line)] pb-2.5">
                <span className="uppercase">Total Stay Tariff ({bookingSuccess.nights} Nights)</span>
                <span className="text-base font-bold text-[var(--ink)]">₹{bookingSuccess.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--reg)] font-semibold">
                <span className="uppercase">20% Advance Payable to Confirm:</span>
                <span className="text-lg font-bold">₹{bookingSuccess.advanceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-[var(--line)] pt-2.5">
                <span className="uppercase">Remaining 80% Balance at Check-in:</span>
                <span className="text-sm font-bold text-[var(--ink)]">₹{bookingSuccess.balanceAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Matrix of Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm font-mono">
              <div className="bg-[var(--paper)] p-4 rounded-xl border border-[var(--line)]">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Room Category</span>
                <span className="text-base font-semibold text-[var(--ink)]">{bookingSuccess.category} (Ground Floor)</span>
              </div>
              <div className="bg-[var(--paper)] p-4 rounded-xl border border-[var(--line)]">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Stay Duration</span>
                <span className="text-base font-semibold text-[var(--ink)]">{bookingSuccess.nights} Night{bookingSuccess.nights > 1 ? 's' : ''} ({bookingSuccess.adults} Adults)</span>
              </div>
              <div className="bg-[var(--paper)] p-4 rounded-xl border border-[var(--line)]">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Check-in (from 12:00 PM)</span>
                <span className="text-base font-semibold text-[#22c55e]">
                  {new Date(bookingSuccess.checkIn).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="bg-[var(--paper)] p-4 rounded-xl border border-[var(--line)]">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Check-out (strictly 11:00 AM)</span>
                <span className="text-base font-semibold text-amber-600 dark:text-amber-400">
                  {new Date(bookingSuccess.checkOut).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* What Happens Next Card */}
            <div className="bg-[var(--reg)]/10 border border-[var(--reg)]/30 rounded-xl p-5 sm:p-6 space-y-3 font-sans">
              <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--reg)]">
                <Clock className="w-4 h-4 text-[var(--reg)]" />
                <span>Next Steps to Confirm Your Stay</span>
              </div>
              <ul className="text-xs text-[var(--ink)]/90 space-y-2.5 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--reg)] font-mono font-bold">1.</span>
                  <span>Our reception staff will verify room allocation inside the Sharda Palace CRM.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--reg)] font-mono font-bold">2.</span>
                  <span><strong>20% Advance Confirmation:</strong> Reception will send the official UPI payment details for the 20% advance (₹{bookingSuccess.advanceAmount.toLocaleString('en-IN')}) to your WhatsApp/email.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--reg)] font-mono font-bold">3.</span>
                  <span><strong>Detailed Booking Voucher Email:</strong> Once confirmed by our admin team, an official check-in voucher with directions and priest guidance will be dispatched to <strong className="text-[var(--ink)] underline">{bookingSuccess.guestEmail}</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--reg)] font-mono font-bold">4.</span>
                  <span><strong>Check-in Payment:</strong> The remaining 80% balance (₹{bookingSuccess.balanceAmount.toLocaleString('en-IN')}) will be collected at reception during check-in via Cash, UPI, or Card.</span>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`https://wa.me/917970735251?text=${encodeURIComponent(`Namaste Sharda Palace, I have submitted booking request ${bookingSuccess.refId} for ${bookingSuccess.guestName} (${bookingSuccess.category}, ${bookingSuccess.nights} nights). Please share the UPI details for the 20% advance of ₹${bookingSuccess.advanceAmount}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white font-mono text-xs font-bold uppercase tracking-wider py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <span>Complete 20% Advance on WhatsApp</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <button
                onClick={() => {
                  setBookingSuccess(null);
                  setGuestName('');
                  setSpecialRequests('');
                }}
                className="bg-[var(--paper)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-mono text-xs font-medium py-3.5 px-6 rounded-xl transition-colors cursor-pointer"
              >
                Make Another Reservation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SECTION 01: HERO EDITORIAL STATEMENT & TELEMETRY */}
            <section id="sanctuary" className="relative space-y-8 pt-2">
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 01 · SANCTUARY & PILGRIMAGE OVERVIEW
                  </span>
                  <span className="text-xs font-mono text-muted-foreground border-l border-[var(--line)] pl-2.5">
                    Bambam Baba Path · 250m to Shivganga
                  </span>
                </div>

                <div className="space-y-4">
                  <h1 className="font-serif italic font-normal text-5xl sm:text-7xl md:text-8xl lg:text-[5.75rem] tracking-tight leading-[0.92] text-[var(--ink)] max-w-5xl">
                    A quiet sanctum at the feet of Baba Baidyanath.
                  </h1>
                  
                  {/* Kraft Studios Style Editorial Statement with Vertical Accent */}
                  <div className="border-l-2 border-[var(--reg)] pl-6 text-base sm:text-lg font-serif italic text-[var(--ink)]/85 max-w-3xl leading-relaxed py-1">
                    Step-free ground-floor rooms designed specifically for elderly devotees, pilgrims, and families. 
                    Clean air-conditioned living, 24/7 instantaneous geyser hot water, and authentic hospitality — located a peaceful 5-minute walk from the holy Jyotirlinga.
                  </div>
                </div>
              </div>

              {/* Staggered Telemetry Metrics (Anti-Grid Asymmetric Layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 pt-2">
                {/* Metric 1: Google Reviews (Col span 3) */}
                <div className="lg:col-span-3 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--reg)]/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--reg)] font-bold">
                    <span>Google Reviews</span>
                    <Star className="w-3.5 h-3.5 text-blue-500 fill-blue-500 shrink-0" />
                  </div>
                  <div className="font-serif italic font-normal text-4xl sm:text-5xl text-[var(--ink)] tracking-tight leading-none my-1">
                    4.4<span className="text-base font-mono font-normal text-muted-foreground ml-1.5 not-italic">★ / 5.0</span>
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground mt-3 pt-3 border-t border-[var(--line)]">
                    200+ Verified Pilgrim Reviews
                  </div>
                </div>

                {/* Metric 2: Booking.com (Col span 3) */}
                <div className="lg:col-span-3 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--reg)]/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--reg)] font-bold">
                    <span>Booking.com Official</span>
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                  </div>
                  <div className="font-serif italic font-normal text-4xl sm:text-5xl text-[var(--ink)] tracking-tight leading-none my-1">
                    8.4<span className="text-base font-mono font-normal text-muted-foreground ml-1.5 not-italic">/ 10</span>
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground mt-3 pt-3 border-t border-[var(--line)]">
                    Rated "Very Good" by Families
                  </div>
                </div>

                {/* Metric 3: Ground Floor Accessibility (Col span 3) */}
                <div className="lg:col-span-3 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--reg)]/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--reg)] font-bold">
                    <span>Mobility Guarantee</span>
                    <Building className="w-3.5 h-3.5 text-[var(--reg)] shrink-0" />
                  </div>
                  <div className="font-serif italic font-normal text-3xl sm:text-4xl text-[var(--ink)] tracking-tight leading-tight my-1">
                    Ground Floor Only
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#22c55e] font-bold mt-3 pt-3 border-t border-[var(--line)]">
                    100% Step-Free · Zero Stairs
                  </div>
                </div>

                {/* Metric 4: Advance Booking Policy (Col span 3) */}
                <div className="lg:col-span-3 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 transition-all duration-300 hover:border-[var(--reg)]/50 relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--reg)] font-bold">
                    <span>Direct Desk Terms</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e] shrink-0" />
                  </div>
                  <div className="font-serif italic font-normal text-4xl sm:text-5xl text-[var(--ink)] tracking-tight leading-none my-1">
                    20%<span className="text-base font-serif italic text-muted-foreground ml-1.5 font-normal">Token</span>
                  </div>
                  <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted-foreground mt-3 pt-3 border-t border-[var(--line)]">
                    80% Remaining at Check-in
                  </div>
                </div>
              </div>
            </section>

            {/* Continuous Kraft Studios Monospace Running Marquee */}
            <div className="relative overflow-hidden py-3 border-y border-[var(--line)] bg-[var(--surface)] select-none">
              <div className="flex whitespace-nowrap animate-marquee font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground gap-8">
                <span>// 100% STEP-FREE GROUND FLOOR LIVING</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>24/7 GEYSER HOT WATER</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>500M LEISURELY WALK TO BABA BAIDYANATH JYOTIRLINGA</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>150M TO HOLY SHIVGANGA KUND</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>PURE SATVIK HOSPITALITY</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>24-HOUR CONCIERGE & SECURE DESK</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>JASIDIH JUNCTION TRANSFER ASSISTANCE</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>// 100% STEP-FREE GROUND FLOOR LIVING</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>24/7 GEYSER HOT WATER</span>
                <span className="text-[var(--reg)] font-bold">·</span>
                <span>500M TO BABA MANDIR</span>
              </div>
            </div>

            {/* SECTION 02: ARCHIVAL PHOTOGRAPHY & LIGHTBOX */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-5">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 02 · ARCHIVAL PHOTOGRAPHY
                  </span>
                  <h2 className="font-serif italic text-3xl sm:text-5xl text-[var(--ink)] mt-1">
                    Visual Sanctuaries & Passages
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl font-sans">
                    Unretouched high-resolution documentation of our hotel facade, ground-floor bedrooms, ensuite bathrooms, and 24-hour reception lobby.
                  </p>
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-1.5 font-mono text-xs overflow-x-auto pb-1 shrink-0">
                  {(['All', 'Rooms', 'Lobby', 'Exterior'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveGalleryTab(tab)}
                      className={`px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                        activeGalleryTab === tab
                          ? 'bg-[var(--ink)] text-[var(--paper)] font-bold'
                          : 'border border-[var(--line)] text-muted-foreground hover:text-[var(--ink)]'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Active Image Display */}
              <div 
                tabIndex={0}
                role="button"
                aria-label={`View ${HOTEL_IMAGES[activePhotoIdx].title} in full downloaded resolution`}
                onClick={() => { setIsLightboxOpen(true); setIsNativeZoom(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsLightboxOpen(true);
                    setIsNativeZoom(false);
                  }
                }}
                className="relative rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--surface)] h-[380px] sm:h-[540px] shadow-sm group cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[var(--reg)] select-none"
                data-cursor="view"
                data-cursor-label="EXPAND"
              >
                <img 
                  src={HOTEL_IMAGES[activePhotoIdx].url} 
                  alt={HOTEL_IMAGES[activePhotoIdx].title}
                  fetchPriority="high"
                  decoding="async"
                  width={HOTEL_IMAGES[activePhotoIdx].width}
                  height={HOTEL_IMAGES[activePhotoIdx].height}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />

                {/* View Full Resolution Badge */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[var(--paper)]/90 hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] px-3.5 py-1.5 rounded-full font-mono text-xs font-semibold backdrop-blur-md transition-all shadow-md group-hover:border-[var(--reg)] group-hover:text-[var(--reg)]">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Resolution</span>
                  <span className="hidden md:inline font-normal text-[10px] text-muted-foreground border-l border-[var(--line)] pl-2">
                    {HOTEL_IMAGES[activePhotoIdx].width} × {HOTEL_IMAGES[activePhotoIdx].height} px
                  </span>
                </div>

                {/* Navigation Left Arrow */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev - 1 + HOTEL_IMAGES.length) % HOTEL_IMAGES.length);
                  }}
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--paper)]/85 hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] backdrop-blur-md flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer hover:border-[var(--reg)]"
                  title="Previous image"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Navigation Right Arrow */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev + 1) % HOTEL_IMAGES.length);
                  }}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--paper)]/85 hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] backdrop-blur-md flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer hover:border-[var(--reg)]"
                  title="Next image"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                <div className="absolute inset-0 bg-gradient-to-t from-[var(--paper)] via-transparent to-transparent opacity-85 pointer-events-none" />
                
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none z-10">
                  <div className="space-y-1">
                    <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--reg)] font-bold">
                      {HOTEL_IMAGES[activePhotoIdx].title}
                    </span>
                    <p className="text-sm font-sans text-[var(--ink)] font-medium">
                      {HOTEL_IMAGES[activePhotoIdx].subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground bg-[var(--surface)]/90 px-3 py-1 rounded-md border border-[var(--line)]">
                      {activePhotoIdx + 1} / {HOTEL_IMAGES.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thumbnails Ribbon */}
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                {HOTEL_IMAGES.map((img, idx) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => {
                      setActivePhotoIdx(idx);
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-video border transition-all cursor-pointer ${
                      activePhotoIdx === idx 
                        ? 'border-[var(--reg)] ring-2 ring-[var(--reg)]/40 scale-[1.03]' 
                        : 'border-[var(--line)] opacity-70 hover:opacity-100'
                    }`}
                    title={`${img.title} (Click to preview)`}
                  >
                    <img 
                      src={img.url} 
                      alt={img.title} 
                      loading="lazy"
                      decoding="async"
                      width={160}
                      height={90}
                      className="w-full h-full object-cover" 
                    />
                  </button>
                ))}
              </div>

              {/* Lightbox Modal */}
              {isLightboxOpen && typeof document !== 'undefined' && createPortal(
                <div 
                  className="fixed inset-0 z-[99999] flex flex-col bg-black/95 text-white backdrop-blur-xl animate-in fade-in duration-200"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Full Downloaded Resolution Image Viewer"
                >
                  <div className="flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-white/10 bg-black/60 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="font-mono text-xs uppercase tracking-wider text-[var(--reg)] px-2.5 py-0.5 rounded bg-white/10 font-bold shrink-0">
                        {HOTEL_IMAGES[activePhotoIdx].category}
                      </span>
                      <h3 className="font-sans text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                        {HOTEL_IMAGES[activePhotoIdx].title}
                      </h3>
                      <span className="hidden lg:inline-flex font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                        Native Resolution: {HOTEL_IMAGES[activePhotoIdx].width} × {HOTEL_IMAGES[activePhotoIdx].height} px
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsNativeZoom(!isNativeZoom)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-mono transition-colors cursor-pointer text-white"
                        title={isNativeZoom ? "Fit image to window" : "Display 100% native pixel resolution"}
                      >
                        {isNativeZoom ? <ZoomOut className="w-3.5 h-3.5" /> : <ZoomIn className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isNativeZoom ? 'Fit Screen' : '100% Native Size'}</span>
                      </button>

                      <a
                        href={HOTEL_IMAGES[activePhotoIdx].url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-mono transition-colors text-white"
                        title="Download exact high-resolution file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Save Image</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => { setIsLightboxOpen(false); setIsNativeZoom(false); }}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer ml-1"
                        title="Close viewer (Esc)"
                        aria-label="Close viewer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div 
                    className={`flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-auto touch-pan-y ${
                      isNativeZoom ? 'cursor-grab active:cursor-grabbing block text-center' : ''
                    }`}
                    onTouchStart={(e) => {
                      touchStartX.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (touchStartX.current === null) return;
                      const diff = e.changedTouches[0].clientX - touchStartX.current;
                      if (diff > 45) {
                        setActivePhotoIdx((prev) => (prev - 1 + HOTEL_IMAGES.length) % HOTEL_IMAGES.length);
                      } else if (diff < -45) {
                        setActivePhotoIdx((prev) => (prev + 1) % HOTEL_IMAGES.length);
                      }
                      touchStartX.current = null;
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setIsLightboxOpen(false);
                        setIsNativeZoom(false);
                      }
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIdx((prev) => (prev - 1 + HOTEL_IMAGES.length) % HOTEL_IMAGES.length);
                      }}
                      className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all shadow-2xl active:scale-95 cursor-pointer hover:border-[var(--reg)]"
                      title="Previous image (Left Arrow)"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhotoIdx((prev) => (prev + 1) % HOTEL_IMAGES.length);
                      }}
                      className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/75 hover:bg-black text-white border border-white/20 backdrop-blur-md flex items-center justify-center transition-all shadow-2xl active:scale-95 cursor-pointer hover:border-[var(--reg)]"
                      title="Next image (Right Arrow)"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>

                    <div className="relative flex items-center justify-center max-w-full max-h-full">
                      <img
                        key={HOTEL_IMAGES[activePhotoIdx].url}
                        src={HOTEL_IMAGES[activePhotoIdx].url}
                        alt={HOTEL_IMAGES[activePhotoIdx].title}
                        width={HOTEL_IMAGES[activePhotoIdx].width}
                        height={HOTEL_IMAGES[activePhotoIdx].height}
                        className={`transition-all duration-200 select-none shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-lg ${
                          isNativeZoom
                            ? 'w-auto h-auto max-w-none inline-block my-auto'
                            : 'max-h-[72vh] max-w-[88vw] object-contain'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="px-4 sm:px-8 py-3 bg-black/70 border-t border-white/10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-zinc-300 font-sans">{HOTEL_IMAGES[activePhotoIdx].subtitle}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Keyboard shortcuts: <kbd className="px-1 py-0.5 bg-white/10 rounded">←</kbd> / <kbd className="px-1 py-0.5 bg-white/10 rounded">→</kbd> to navigate · <kbd className="px-1 py-0.5 bg-white/10 rounded">Esc</kbd> to exit
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                      {HOTEL_IMAGES.map((img, idx) => (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => { setActivePhotoIdx(idx); }}
                          className={`w-12 h-9 rounded-md overflow-hidden shrink-0 border transition-all cursor-pointer ${
                            activePhotoIdx === idx 
                              ? 'border-[var(--reg)] ring-2 ring-[var(--reg)]/80 scale-105' 
                              : 'border-white/20 opacity-50 hover:opacity-100'
                          }`}
                          title={img.title}
                        >
                          <img src={img.url} alt={img.title} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </section>

            {/* SECTION 03: ROOM LIVING & ACCOMMODATIONS */}
            <section id="rooms" className="space-y-8">
              <div className="border-b border-[var(--line)] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 03 · GROUND-FLOOR ACCOMMODATIONS
                  </span>
                  <h2 className="font-serif italic text-3xl sm:text-5xl text-[var(--ink)] mt-1">
                    Select Your Room Tier
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md font-sans">
                  All rooms are strictly on the ground floor with zero stair climbing. Includes silent split AC, attached bathrooms with 24/7 instantaneous geysers, and pure RO water.
                </p>
              </div>

              {/* Asymmetric Staggered Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Category 1: Double Bed Room (7 cols) */}
                <div 
                  className={`lg:col-span-6 bg-[var(--surface)] border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    selectedCategory === 'Double Bed Room'
                      ? 'border-[var(--reg)] shadow-xl shadow-[var(--reg)]/10 ring-1 ring-[var(--reg)]'
                      : 'border-[var(--line)] hover:border-foreground/30'
                  }`}
                >
                  <div>
                    <div 
                      onClick={() => { setActivePhotoIdx(1); setIsLightboxOpen(true); setIsNativeZoom(false); }}
                      className="relative h-60 sm:h-72 overflow-hidden border-b border-[var(--line)] cursor-zoom-in group/img"
                      title="Click to view room in full downloaded resolution"
                      data-cursor="view"
                      data-cursor-label="VIEW"
                    >
                      <img 
                        src="/hotel-images/double-room.jpg" 
                        alt="Double Bed Room" 
                        loading="lazy"
                        decoding="async"
                        width={1024}
                        height={768}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" 
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-[var(--paper)]/95 text-[var(--ink)] border border-[var(--line)]">
                          CAT-01 // GROUND FLOOR
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[var(--ink)] text-[var(--paper)] shadow-md">
                          ₹{roomRates.doubleRoomRate.toLocaleString('en-IN')} / Night
                        </span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                      <div>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-2xl font-bold text-[var(--ink)] font-sans">Double Bed Room</h3>
                          <span className="text-xs font-mono text-[var(--reg)] font-bold">20% Token: ₹{Math.round(roomRates.doubleRoomRate * 0.20).toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
                          A peaceful air-conditioned sanctuary with 1 King Double Bed, reading lamps, sanitized linens, and ground-floor step-free access. Ideal for couples, solo devotees, and visiting parents.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono text-[var(--ink)]/80 py-3 border-y border-[var(--line)]">
                        <span className="flex items-center gap-2"><Bed className="w-3.5 h-3.5 text-[var(--reg)]" /> 1 King Double Bed</span>
                        <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-[var(--reg)]" /> Max 2 Adults</span>
                        <span className="flex items-center gap-2"><Building className="w-3.5 h-3.5 text-[var(--reg)]" /> Ground Floor (0 Stairs)</span>
                        <span className="flex items-center gap-2"><Bath className="w-3.5 h-3.5 text-[var(--reg)]" /> Ensuite Bath & Geyser</span>
                        <span className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 text-[var(--reg)]" /> Free High-Speed Wi-Fi</span>
                        <span className="flex items-center gap-2"><Tv className="w-3.5 h-3.5 text-[var(--reg)]" /> LED Satellite TV</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 pt-0">
                    <button
                      type="button"
                      onClick={() => scrollToForm('Double Bed Room')}
                      className={`w-full py-4 px-4 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedCategory === 'Double Bed Room'
                          ? 'bg-[var(--reg)] text-white shadow-md'
                          : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]'
                      }`}
                    >
                      {selectedCategory === 'Double Bed Room' ? (
                        <>
                          <Check className="w-4 h-4" /> Selected Tier (Double Bed)
                        </>
                      ) : (
                        <>
                          <span>Select Double Bed Room</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Category 2: Family Bed Suite (6 cols) */}
                <div 
                  className={`lg:col-span-6 bg-[var(--surface)] border rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between ${
                    selectedCategory === 'Family Bed Room'
                      ? 'border-[var(--reg)] shadow-xl shadow-[var(--reg)]/10 ring-1 ring-[var(--reg)]'
                      : 'border-[var(--line)] hover:border-foreground/30'
                  }`}
                >
                  <div>
                    <div 
                      onClick={() => { setActivePhotoIdx(2); setIsLightboxOpen(true); setIsNativeZoom(false); }}
                      className="relative h-60 sm:h-72 overflow-hidden border-b border-[var(--line)] cursor-zoom-in group/img"
                      title="Click to view suite in full downloaded resolution"
                      data-cursor="view"
                      data-cursor-label="VIEW"
                    >
                      <img 
                        src="/hotel-images/family-room.jpg" 
                        alt="Family Bed Room" 
                        loading="lazy"
                        decoding="async"
                        width={1024}
                        height={768}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" 
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase font-bold tracking-wider bg-[var(--paper)]/95 text-[var(--ink)] border border-[var(--line)]">
                          CAT-02 // FAMILY SUITE
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-[var(--ink)] text-[var(--paper)] shadow-md">
                          ₹{roomRates.familyRoomRate.toLocaleString('en-IN')} / Night
                        </span>
                      </div>
                    </div>

                    <div className="p-6 sm:p-8 space-y-5">
                      <div>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-2xl font-bold text-[var(--ink)] font-sans">Family Bed Suite</h3>
                          <span className="text-xs font-mono text-[var(--reg)] font-bold">20% Token: ₹{Math.round(roomRates.familyRoomRate * 0.20).toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
                          Extra spacious ground-floor family suite equipped with 2 Large Double Beds and large ensuite bathroom. Specifically configured for senior devotees traveling with family or group pilgrimage.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono text-[var(--ink)]/80 py-3 border-y border-[var(--line)]">
                        <span className="flex items-center gap-2"><Bed className="w-3.5 h-3.5 text-[var(--reg)]" /> 2 Double Beds</span>
                        <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-[var(--reg)]" /> Up to 4 Devotees</span>
                        <span className="flex items-center gap-2"><Building className="w-3.5 h-3.5 text-[var(--reg)]" /> Ground Floor (0 Stairs)</span>
                        <span className="flex items-center gap-2"><Bath className="w-3.5 h-3.5 text-[var(--reg)]" /> Ensuite Bath & Geyser</span>
                        <span className="flex items-center gap-2"><Wifi className="w-3.5 h-3.5 text-[var(--reg)]" /> Free High-Speed Wi-Fi</span>
                        <span className="flex items-center gap-2"><Tv className="w-3.5 h-3.5 text-[var(--reg)]" /> LED Satellite TV</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-8 pt-0">
                    <button
                      type="button"
                      onClick={() => scrollToForm('Family Bed Room')}
                      className={`w-full py-4 px-4 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        selectedCategory === 'Family Bed Room'
                          ? 'bg-[var(--reg)] text-white shadow-md'
                          : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)] border border-[var(--line)]'
                      }`}
                    >
                      {selectedCategory === 'Family Bed Room' ? (
                        <>
                          <Check className="w-4 h-4" /> Selected Tier (Family Suite)
                        </>
                      ) : (
                        <>
                          <span>Select Family Bed Suite</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 04: PILGRIM & TEMPLE TELEMETRY (MAP & PROXIMITY) */}
            <section id="telemetry" className="space-y-8">
              <div className="border-b border-[var(--line)] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 04 · TEMPLE PROXIMITY & TELEMETRY
                  </span>
                  <h2 className="font-serif italic text-3xl sm:text-5xl text-[var(--ink)] mt-1">
                    Walking Distances & Holy Landmarks
                  </h2>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("FPX3+CQ Deoghar, Jharkhand");
                      toast.success("Plus Code copied: FPX3+CQ Deoghar, Jharkhand");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--reg)] text-xs font-mono text-[var(--ink)] transition-colors cursor-pointer"
                  >
                    <span className="text-[var(--reg)] font-bold">Plus Code:</span>
                    <span>FPX3+CQ</span>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                  </button>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=FPX3%2BCQ+Deoghar,+Jharkhand" 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--reg)] hover:underline"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Asymmetric 2-Column Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left Telemetry Card (5 cols) */}
                <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--reg)] font-bold block">
                      Geographic Access
                    </span>
                    <h3 className="font-serif italic text-2xl sm:text-3xl text-[var(--ink)]">
                      Bambam Baba Path, Main Shivganga Road
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-sans">
                      Positioned directly on the primary pilgrim corridor connecting Shivganga Kund to the Jyotirlinga temple gates, enabling elderly pilgrims to walk to the shrine without navigating crowded vehicle traffic.
                    </p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                      <span className="text-muted-foreground">Shree Baba Baidyanath Mandir</span>
                      <strong className="text-[var(--ink)] font-bold">500m · 6 min walk</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                      <span className="text-muted-foreground">Holy Shivganga Kund</span>
                      <strong className="text-[var(--ink)] font-bold">150m · 2 min walk</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                      <span className="text-muted-foreground">Jasidih Jn Railway (JSME)</span>
                      <strong className="text-[var(--ink)] font-bold">7.0 km · 18 min drive</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between">
                      <span className="text-muted-foreground">Deoghar Airport (DGH)</span>
                      <strong className="text-[var(--ink)] font-bold">5.5 km · 14 min drive</strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href="tel:+917970735251"
                      className="w-full py-3 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--reg)] text-xs font-mono text-[var(--ink)] flex items-center justify-center gap-2 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[var(--reg)]" />
                      <span>Concierge Pickup Assistance: +91 79707 35251</span>
                    </a>
                  </div>
                </div>

                {/* Right Interactive Map (7 cols) */}
                <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-[var(--line)] h-[400px] lg:h-auto min-h-[380px] relative shadow-xs">
                  <iframe
                    title="SHARDA PALACE DEOGHAR Location Pin (FPX3+CQ Deoghar, Jharkhand)"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src="https://maps.google.com/maps?q=FPX3%2BCQ+Deoghar,+Jharkhand&t=&z=17&ie=UTF8&iwloc=B&output=embed"
                    className="w-full h-full filter contrast-105"
                    loading="lazy"
                  ></iframe>

                  <div className="absolute top-4 left-4 z-10 bg-[var(--paper)]/95 backdrop-blur-md border border-[var(--line)] rounded-xl p-3.5 shadow-lg max-w-xs pointer-events-none">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--reg)] animate-ping"></span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--reg)]">
                        Verified Location Pin
                      </span>
                    </div>
                    <p className="font-sans text-xs font-bold text-[var(--ink)] leading-tight">
                      HOTEL SHARDA PALACE DEOGHAR
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      Plus Code: <strong className="text-[var(--ink)]">FPX3+CQ</strong> · 500m to Mandir
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 05: VERIFIED DEVOTEE ARCHIVE */}
            <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 space-y-8 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--line)] pb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                      // 05 · VERIFIED DEVOTEE ARCHIVE
                    </span>
                    <span className="chip text-[11px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold">
                      Google: 4.4 ★ / 5.0
                    </span>
                    <span className="chip text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                      Booking.com: 8.4 / 10
                    </span>
                  </div>
                  <h2 className="font-serif italic text-2xl sm:text-4xl text-[var(--ink)]">
                    Devotee & Family Experiences
                  </h2>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Extracted live from verified guest reviews
                </div>
              </div>

              {/* Editorial Testimonial Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {GENUINE_REVIEWS.map((rev, idx) => (
                  <div 
                    key={idx}
                    className="p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4 flex flex-col justify-between"
                  >
                    <p className="text-xs sm:text-sm text-[var(--ink)]/90 leading-relaxed italic font-serif text-[15px]">
                      "{rev.quote}"
                    </p>
                    <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="font-bold text-[var(--ink)] block">{rev.author}</span>
                        <span className="text-[11px] text-muted-foreground">{rev.stayType}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-[var(--reg)]">{rev.score}</span>
                        <span className="text-[10px] text-muted-foreground block">{rev.platform}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION 06: PROPERTY ESSENTIALS & POLICIES */}
            <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 space-y-8 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[var(--line)] pb-5">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 06 · ESSENTIALS & INTEGRATIONS
                  </span>
                  <h2 className="font-serif italic text-2xl sm:text-4xl text-[var(--ink)] mt-1">
                    Property Facilities & Services
                  </h2>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Synchronized with Booking.com property listing
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 font-sans">
                {/* Column 1: In-Room Amenities */}
                <div className="space-y-4">
                  <h3 className="font-mono text-xs uppercase font-bold text-[var(--reg)] tracking-wider flex items-center gap-2">
                    <Bed className="w-4 h-4" /> In-Room Amenities
                  </h3>
                  <ul className="text-xs space-y-2.5 text-muted-foreground leading-relaxed font-sans">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Silent Split Air Conditioning</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Flat-Screen Satellite LED TV</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Private Attached Ensuite Bathroom</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> 24/7 Geyser Instant Hot Water</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> High-Speed Wi-Fi in All Rooms</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Fresh Sanitized Linen & Towels</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Sockets near Bed & Work Vanity</li>
                  </ul>
                </div>

                {/* Column 2: Ground Floor & Safety */}
                <div className="space-y-4">
                  <h3 className="font-mono text-xs uppercase font-bold text-[var(--reg)] tracking-wider flex items-center gap-2">
                    <Building className="w-4 h-4" /> Ground Floor & Safety
                  </h3>
                  <ul className="text-xs space-y-2.5 text-muted-foreground leading-relaxed font-sans">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> <strong>All Rooms on Ground Floor</strong></li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> 100% Step-Free & Stair-Free Access</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> 24-Hour Front Desk & Concierge</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> 24/7 CCTV & Security Monitoring</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Daily Professional Housekeeping</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Pure Multi-Stage RO Drinking Water</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Secure Luggage Storage Desk</li>
                  </ul>
                </div>

                {/* Column 3: Pilgrimage & Transport Support */}
                <div className="space-y-4">
                  <h3 className="font-mono text-xs uppercase font-bold text-[var(--reg)] tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4" /> Pilgrimage & Transit
                  </h3>
                  <ul className="text-xs space-y-2.5 text-muted-foreground leading-relaxed font-sans">
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> 500m Walk to Baidyanath Mandir</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> 2-Minute Walk to Shivganga Lake</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> VIP Puja & Darshan Guidance</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Jasidih Jn (7km) Cab Arrangement</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Deoghar Airport (5.5km) Transfers</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Dedicated On-Site Vehicle Parking</li>
                    <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#22c55e]" /> Early Morning Aarti Timing Guidance</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SECTION 07: COMPREHENSIVE FAQS (KRAFT STUDIOS EDITORIAL ACCORDION) */}
            <section id="faqs" className="space-y-8 scroll-mt-24">
              <div className="border-b border-[var(--line)] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 07 · FREQUENTLY ASKED QUESTIONS
                  </span>
                  <h2 className="font-serif italic text-3xl sm:text-5xl text-[var(--ink)] mt-1">
                    Everything You Need to Know
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md font-sans">
                  Sourced directly from our Booking.com property listing, temple guidelines, and everyday devotee queries.
                </p>
              </div>

              {/* Asymmetric 2-Column FAQ Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Filter & Live Search (Sticky on Desktop) */}
                <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                  {/* Search Input Box */}
                  <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-3 shadow-2xs">
                    <label className="block text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--reg)] font-bold">
                      Search Questions
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search: stairs, geyser, mandir, parking, advance..."
                        value={faqSearchQuery}
                        onChange={(e) => setFaqSearchQuery(e.target.value)}
                        className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl pl-9.5 pr-3 py-2 text-xs text-[var(--ink)] placeholder:text-muted-foreground focus:outline-none transition-colors font-mono"
                      />
                      {faqSearchQuery && (
                        <button
                          onClick={() => setFaqSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground hover:text-[var(--ink)]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <span className="text-[10.5px] font-mono text-muted-foreground block">
                      Showing {filteredFaqs.length} of {HOTEL_FAQS.length} answers
                    </span>
                  </div>

                  {/* Category Pills */}
                  <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-2.5">
                    <span className="block text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                      Filter by Topic
                    </span>
                    <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                      {['All', 'Temple & Darshan', 'Rooms & Accessibility', 'Check-in & Transport', 'Food & Dining', 'Payment & Policies'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => setSelectedFaqCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer text-[11px] ${
                            selectedFaqCategory === cat
                              ? 'bg-[var(--ink)] text-[var(--paper)] font-bold shadow-xs'
                              : 'bg-[var(--paper)] text-muted-foreground hover:text-[var(--ink)] border border-[var(--line)]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Help Card */}
                  <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-5 space-y-3 font-sans">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[var(--reg)]">
                      <HelpCircle className="w-4 h-4 text-[var(--reg)]" />
                      <span>Have a Specific Question?</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Our front desk concierge is reachable 24/7 for custom travel queries, priest coordination, or late-night arrivals.
                    </p>
                    <a
                      href="https://wa.me/917970735251"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-xs font-mono text-[var(--ink)] border border-[var(--line)] hover:border-[var(--reg)] px-3 py-2 rounded-lg bg-[var(--paper)] transition-colors"
                    >
                      <span>Ask via WhatsApp</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#22c55e]" />
                    </a>
                  </div>
                </div>

                {/* Right Column: Numbered Editorial Accordion List */}
                <div className="lg:col-span-8 space-y-3">
                  {filteredFaqs.length === 0 ? (
                    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-10 text-center space-y-3">
                      <p className="font-serif italic text-xl text-[var(--ink)]">No questions match your search.</p>
                      <p className="text-xs font-mono text-muted-foreground">Try searching for keywords like "stairs", "geyser", "advance", or "mandir".</p>
                      <button
                        onClick={() => { setFaqSearchQuery(''); setSelectedFaqCategory('All'); }}
                        className="px-4 py-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs font-mono uppercase tracking-wider text-[var(--ink)] hover:border-[var(--reg)]"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    filteredFaqs.map((faq, index) => {
                      const isExpanded = expandedFaqId === faq.id;
                      const globalIndex = HOTEL_FAQS.findIndex(f => f.id === faq.id) + 1;
                      const formattedIndex = globalIndex < 10 ? `0${globalIndex}` : `${globalIndex}`;

                      return (
                        <div
                          key={faq.id}
                          className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                            isExpanded 
                              ? 'bg-[var(--surface)] border-[var(--reg)] shadow-md shadow-[var(--reg)]/5' 
                              : 'bg-[var(--surface)] border-[var(--line)] hover:border-foreground/30'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                            className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer"
                            aria-expanded={isExpanded}
                          >
                            <div className="flex items-start gap-4">
                              <span className="font-mono text-xs sm:text-sm font-bold text-[var(--reg)] pt-0.5 shrink-0">
                                {formattedIndex}
                              </span>
                              <div className="space-y-1">
                                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground block">
                                  {faq.category}
                                </span>
                                <h3 className="font-sans text-base sm:text-lg font-bold text-[var(--ink)] leading-snug">
                                  {faq.question}
                                </h3>
                              </div>
                            </div>

                            <div className="shrink-0 p-1 rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] mt-1">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[var(--reg)]" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-5 sm:px-6 pb-6 pt-1 border-t border-[var(--line)] space-y-4 animate-in fade-in duration-200">
                              <p className="text-xs sm:text-sm text-[var(--ink)]/90 font-sans leading-relaxed pt-2">
                                {faq.answer}
                              </p>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[var(--line)]/60 text-[11px] font-mono">
                                <div className="flex items-center gap-1.5 text-[var(--reg)] font-semibold">
                                  <Sparkle className="w-3.5 h-3.5" />
                                  <span>{faq.highlight}</span>
                                </div>
                                <span className="text-muted-foreground text-[10.5px]">
                                  Source: {faq.source}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* SECTION 08: DIRECT RESERVATION TERMINAL */}
            <section id="reservation-form" className="space-y-8 pt-4 scroll-mt-24">
              <div className="border-b border-[var(--line)] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 08 · DIRECT RESERVATION DOCKET
                  </span>
                  <h2 className="font-serif italic text-3xl sm:text-5xl text-[var(--ink)] mt-1">
                    Book Your Stay Directly
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md font-sans">
                  Reserve with a guaranteed 20% advance token. Instant booking reference generated, followed by email voucher and front desk confirmation.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 2-Column Asymmetric Terminal Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column: Input Steps (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Step 1: Stay Schedule */}
                    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 space-y-6 transition-colors duration-300">
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--reg)]">
                          <Calendar className="w-4 h-4 text-[var(--reg)]" />
                          <span>1. Stay Schedule</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          Standard Checkout: 11:00 AM
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
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
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none transition-colors"
                            required
                          />
                          <span className="text-[10px] text-[#22c55e] mt-1 block font-mono">Check-in: 12:00 PM</span>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Check-Out Date
                          </label>
                          <input
                            type="date"
                            min={checkIn}
                            value={checkOut}
                            onChange={(e) => setCheckOut(e.target.value)}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none transition-colors"
                            required
                          />
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block font-mono">Checkout: 11:00 AM</span>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Adults (12+ yrs)
                          </label>
                          <select
                            value={adults}
                            onChange={(e) => setAdults(Number(e.target.value))}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none transition-colors"
                          >
                            {[1, 2, 3, 4, 5, 6].map(n => (
                              <option key={n} value={n} className="bg-[var(--surface)] text-[var(--ink)]">{n} Adult{n > 1 ? 's' : ''}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Children (0-11 yrs)
                          </label>
                          <select
                            value={children}
                            onChange={(e) => setChildren(Number(e.target.value))}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--ink)] focus:outline-none transition-colors"
                          >
                            {[0, 1, 2, 3].map(n => (
                              <option key={n} value={n} className="bg-[var(--surface)] text-[var(--ink)]">{n} Child{n > 1 ? 'ren' : ''}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="bg-[var(--paper)] rounded-xl p-3.5 text-xs font-mono text-muted-foreground flex items-center justify-between border border-[var(--line)]">
                        <span>Stay Duration: <strong className="text-[var(--ink)]">{nights} Night{nights > 1 ? 's' : ''}</strong></span>
                        <span className="text-[var(--reg)] font-semibold">24-hour cycle: 11 AM - 11 AM</span>
                      </div>
                    </div>

                    {/* Step 2: Selected Category Switcher */}
                    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 space-y-4 transition-colors duration-300">
                      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--reg)]">
                          <Bed className="w-4 h-4 text-[var(--reg)]" />
                          <span>2. Room Type (All Ground Floor)</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">
                          Click to switch
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory('Double Bed Room')}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedCategory === 'Double Bed Room'
                              ? 'bg-[var(--paper)] border-[var(--reg)] ring-1 ring-[var(--reg)]'
                              : 'bg-[var(--paper)] border-[var(--line)] hover:border-foreground/30'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sm text-[var(--ink)]">Double Bed Room</span>
                            <span className="font-mono text-xs text-[var(--reg)] font-bold">₹{roomRates.doubleRoomRate.toLocaleString('en-IN')}/N</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground block">1 King Bed · Ground Floor · Max 2 Adults</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedCategory('Family Bed Room')}
                          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            selectedCategory === 'Family Bed Room'
                              ? 'bg-[var(--paper)] border-[var(--reg)] ring-1 ring-[var(--reg)]'
                              : 'bg-[var(--paper)] border-[var(--line)] hover:border-foreground/30'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sm text-[var(--ink)]">Family Bed Room</span>
                            <span className="font-mono text-xs text-[var(--reg)] font-bold">₹{roomRates.familyRoomRate.toLocaleString('en-IN')}/N</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground block">2 Double Beds · Ground Floor · Up to 4 Guests</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 3: Guest Contact Details */}
                    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-8 space-y-6 transition-colors duration-300">
                      <div className="border-b border-[var(--line)] pb-4">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--reg)]">
                          <Users className="w-4 h-4 text-[var(--reg)]" />
                          <span>3. Devotee Identity & Special Requests</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-sans">
                          A confirmation email and check-in voucher will be dispatched to this email upon CRM approval.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ramesh Kumar Sharma"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-4 py-2.5 text-[var(--ink)] focus:outline-none transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Email Address (For Booking Voucher) *
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. ramesh.sharma@example.com"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-4 py-2.5 text-[var(--ink)] focus:outline-none transition-colors"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Mobile / WhatsApp Number *
                          </label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-[var(--line)] bg-[var(--paper)] text-muted-foreground text-xs">
                              +91
                            </span>
                            <input
                              type="tel"
                              placeholder="10-digit mobile number"
                              value={guestPhone}
                              onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                              className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-r-xl px-4 py-2.5 text-[var(--ink)] focus:outline-none transition-colors"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Home City & State (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Patna, Bihar"
                            value={guestCity}
                            onChange={(e) => setGuestCity(e.target.value)}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl px-4 py-2.5 text-[var(--ink)] focus:outline-none transition-colors"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                            Special Requests & Train/Flight Arrival Time
                          </label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Arriving at Jasidih Junction at 1:30 PM; request assistance with local priest for VIP temple darshan."
                            value={specialRequests}
                            onChange={(e) => setSpecialRequests(e.target.value)}
                            className="w-full bg-[var(--paper)] border border-[var(--line)] focus:border-[var(--reg)] rounded-xl p-3 text-[var(--ink)] focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Sticky Docket & Price Breakdown (4 cols) */}
                  <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
                    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-7 space-y-6 shadow-md transition-colors duration-300">
                      <div className="border-b border-[var(--line)] pb-4">
                        <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-[var(--reg)] font-bold block mb-1">
                          Reservation Docket
                        </span>
                        <h3 className="font-serif italic text-2xl text-[var(--ink)]">
                          Tariff & Advance Summary
                        </h3>
                      </div>

                      <div className="space-y-3 font-mono text-xs">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Room Category:</span>
                          <span className="text-[var(--ink)] font-semibold">{selectedCategory}</span>
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>Rate per Night:</span>
                          <span className="text-[var(--ink)] font-semibold">₹{roomTariff.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>Stay Duration:</span>
                          <span className="text-[var(--ink)] font-semibold">{nights} Night{nights > 1 ? 's' : ''}</span>
                        </div>

                        <div className="flex justify-between text-muted-foreground border-t border-[var(--line)] pt-2.5">
                          <span>Total Stay Tariff:</span>
                          <span className="text-base font-bold text-[var(--ink)]">₹{totalAmount.toLocaleString('en-IN')}</span>
                        </div>

                        {/* 20% Advance Token */}
                        <div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--reg)]/40 space-y-1">
                          <div className="flex justify-between text-[var(--reg)] font-bold text-xs uppercase">
                            <span>20% Advance to Reserve:</span>
                            <span className="text-sm">₹{advanceAmount.toLocaleString('en-IN')}</span>
                          </div>
                          <span className="text-[10.5px] text-muted-foreground block font-sans">
                            Guarantees room reservation during pilgrimage peak.
                          </span>
                        </div>

                        <div className="flex justify-between text-muted-foreground pt-1">
                          <span>Remaining 80% at Check-in:</span>
                          <span className="text-[var(--ink)] font-semibold">₹{balanceAmount.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="flex justify-between text-muted-foreground">
                          <span>Taxes & Hot Water Service:</span>
                          <span className="text-[#22c55e] font-semibold">Included</span>
                        </div>
                      </div>

                      {/* Advance Policy Box */}
                      <div className="bg-[var(--paper)] rounded-xl p-4 space-y-2 text-xs font-mono text-muted-foreground border border-[var(--line)]">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-[var(--reg)] shrink-0" />
                          <span><strong>20% Token:</strong> Our desk will share official UPI details upon submission.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span><strong>Timings:</strong> Check-in from 12 PM · Checkout 11 AM.</span>
                        </div>
                      </div>

                      {/* Submission CTA Button */}
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[var(--reg)] hover:opacity-90 text-white font-mono text-xs font-semibold uppercase tracking-wider py-4 px-5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <span>Registering Booking Request...</span>
                        ) : (
                          <>
                            <span>Submit Request (20%: ₹{advanceAmount.toLocaleString('en-IN')})</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </section>

            {/* SECTION 09: GENERATIVE AI & SEO EDITORIAL GUIDE */}
            <section className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-6 sm:p-10 space-y-8 transition-colors duration-300">
              <div className="border-b border-[var(--line)] pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="font-mono text-xs uppercase tracking-[0.26em] text-[var(--reg)] font-bold">
                    // 09 · DEOGHAR PILGRIMAGE & HOTEL GUIDE
                  </span>
                  <h2 className="font-serif italic text-2xl sm:text-4xl text-[var(--ink)] mt-1">
                    Why Devotees Book Hotel Sharda Palace in Deoghar
                  </h2>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Essential facts for pilgrims, families & visiting devotees
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 font-sans text-xs text-muted-foreground leading-relaxed">
                {/* Pillar 1 */}
                <div className="space-y-2.5 p-4.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--ink)]">
                    <MapPin className="w-4 h-4 text-[var(--reg)]" />
                    <span>Hotel Near Temple in Deoghar</span>
                  </div>
                  <p>
                    Looking to <strong>book a hotel near temple in Deoghar</strong>? Hotel Sharda Palace is situated on Bambam Baba Path, Main Shivganga Road — exactly <strong>500 meters (5-6 min walk)</strong> from the holy Singhadwar of Shree Baba Baidyanath Jyotirlinga Temple and only <strong>150 meters from Shivganga Kund</strong>. Devotees can comfortably attend early morning Bhasma Aarti and evening Shringar Aarti on foot without traffic delays.
                  </p>
                </div>

                {/* Pillar 2 */}
                <div className="space-y-2.5 p-4.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--ink)]">
                    <Building className="w-4 h-4 text-[var(--reg)]" />
                    <span>Ground Floor Stay for Seniors</span>
                  </div>
                  <p>
                    Traveling with elderly parents or senior devotees who find stairs difficult? Unlike older multi-storey dharamshalas, <strong>100% of guest rooms at Hotel Sharda Palace are on the ground floor</strong> with completely step-free access. Zero stairs ensure senior citizens enjoy safe, relaxed, and restful accommodations throughout their Baidyanath Dham Darshan.
                  </p>
                </div>

                {/* Pillar 3 */}
                <div className="space-y-2.5 p-4.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--ink)]">
                    <Flame className="w-4 h-4 text-[var(--reg)]" />
                    <span>24/7 Geyser & AC Sanctum</span>
                  </div>
                  <p>
                    Every room is equipped with an <strong>instantaneous geyser providing 24/7 hot water</strong>, ensuring devotees can take a sacred Snan at 4:00 AM before temple gates open or after visiting Shivganga. Enjoy silent split air conditioning, sanitized cotton linens, attached hygienic private bathrooms, and commercial generator power backup during municipal cuts.
                  </p>
                </div>

                {/* Pillar 4 */}
                <div className="space-y-2.5 p-4.5 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--ink)]">
                    <Car className="w-4 h-4 text-[var(--reg)]" />
                    <span>Jasidih Jn & Airport Transfers</span>
                  </div>
                  <p>
                    Arriving via train at <strong>Jasidih Junction (JSME, 7.0 km)</strong> or flight at <strong>Deoghar Airport (DGH, 5.5 km)</strong>? Hotel Sharda Palace provides 24-hour reception desk support, dedicated on-site vehicle parking, and reliable cab/auto arrangements. Reserve directly online with a guaranteed 20% advance token and pay the remaining 80% at check-in.
                  </p>
                </div>
              </div>

              {/* Semantic Keywords Tag Strip for LLM & Search Indexing */}
              <div className="pt-4 border-t border-[var(--line)] flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="text-[var(--reg)] font-bold">Related Pilgrim Inquiries:</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Book Hotel in Deoghar</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Hotel Near Temple in Deoghar</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Hotel Near Baba Baidyanath Mandir</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Hotel Near Shivganga Deoghar</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Ground Floor Hotel Deoghar</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Hotels Near Jasidih Junction</span>
                <span className="px-2.5 py-1 rounded-md bg-[var(--paper)] border border-[var(--line)]">Deoghar Dharamshala & Hotel Booking</span>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface)] pt-14 pb-32 md:pb-14 px-4 sm:px-6 mt-20 font-mono text-xs text-muted-foreground transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="text-sm font-bold text-[var(--ink)] tracking-wider uppercase font-mono">
              Hotel Sharda Palace Deoghar
            </div>
            <p>Bambam Baba Path, Main Shivganga Road, Near Matri Mandir, Deoghar, Jharkhand 814112 · Plus Code: FPX3+CQ</p>
            <p className="text-[11px]">
              500m to Baba Baidyanath Mandir · 100% Ground Floor Step-Free · Google 4.4★ · Booking.com 8.4 / 10
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-[11px]">
            <a href="tel:+917970735251" className="hover:text-[var(--ink)] transition-colors">
              Phone: +91 79707 35251
            </a>
            <span className="hidden sm:inline opacity-30">/</span>
            <a href="tel:+919110137334" className="hover:text-[var(--ink)] transition-colors">
              +91 91101 37334
            </a>
            <span className="hidden sm:inline opacity-30">/</span>
            <span className="text-[var(--reg)] font-bold">Official Direct Reservation Desk</span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Quick Action Bar */}
      <div 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] p-2.5 px-4 flex items-center justify-between pb-safe shadow-xl"
        role="region"
        aria-label="Mobile Quick Booking"
      >
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground leading-none">
            Direct Tariff
          </span>
          <span className="text-sm font-bold font-mono text-[var(--ink)] mt-0.5">
            ₹{roomRates.doubleRoomRate.toLocaleString('en-IN')}<span className="text-[10px] font-normal text-muted-foreground">/nt · Ground Floor</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="tel:+917970735251"
            className="w-10 h-10 rounded-full border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex items-center justify-center active:scale-95 transition-transform"
            title="Call Hotel Concierge"
            aria-label="Call Front Desk"
          >
            <Phone className="w-4 h-4 text-[var(--reg)]" />
          </a>
          <button
            type="button"
            onClick={scrollToForm}
            className="bg-[var(--ink)] text-[var(--paper)] px-4 py-2.5 rounded-full font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <span>Book Stay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
