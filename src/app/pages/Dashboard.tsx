import { useState, useEffect, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { apiFetch } from '../lib/api';
import {
  Users,
  Calendar,
  Bed,
  CreditCard,
  Plus,
  MessageSquare,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Mail,
  Smartphone,
  PhoneCall,
  Activity,
  Server,
  Database,
  Globe,
  Search,
  Trash2,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { NewBookingModal } from '../components/NewBookingModal';
import { useNavigate } from 'react-router';
import { format } from 'date-fns';
import logoUrl from '../../assets/logo.png';
import { motion } from 'motion/react';

export function Dashboard() {
  const { user, bookings, rooms, guestById, roomById, comms } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Document Search State
  const [docSearch, setDocSearch] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const handleDocSearch = async () => {
    setIsSearching(true);
    try {
       const res = await apiFetch(`/api/documents/search?q=${encodeURIComponent(docSearch)}`, {}, { quiet: true });
       if (res && res.success) {
           setDocs(res.data || []);
       }
    } catch(err) {
       console.error("Search failed", err);
    }
    setIsSearching(false);
  };

  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  const handleDeleteDoc = async (id: string, docId: string) => {
    if (!window.confirm(`Are you sure you want to delete document ${docId}? This will remove it from the Cloud Repository and Google Drive.`)) {
      return;
    }

    setDeletingDocId(id);
    try {
      const res = await apiFetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res && res.success) {
        toast.success(`Document ${docId} deleted successfully`);
        setDocs(prev => prev.filter(d => (d._id || d.id) !== id && d.documentId !== id));
      } else {
        toast.error(res?.message || 'Failed to delete document');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete document');
    } finally {
      setDeletingDocId(null);
    }
  };

  // Load initially
  useEffect(() => { handleDocSearch(); }, []);

  // Time-aware greeting in IST
  const getISTDate = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  };

  const getGreeting = () => {
    const hour = getISTDate().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = format(getISTDate(), 'yyyy-MM-dd');

  // Stats calculation
  const todayCheckIns = bookings.filter(b => b.checkIn.split('T')[0] === today);
  const checkedInCount = todayCheckIns.filter(b => b.status === 'Checked-In').length;

  const todayCheckOuts = bookings.filter(b => b.checkOut.split('T')[0] === today);

  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const availableRooms = rooms.filter(r => r.status === 'Available').length;
  const occupancyPercent = Math.round((occupiedRooms / rooms.length) * 100);

  const checkedOutBookings = bookings.filter(b => b.status === 'Checked-Out');
  const totalCollections = checkedOutBookings.reduce((sum, b) => sum + (b.total || 0), 0);
  const totalCommission = checkedOutBookings.reduce((sum, b) => sum + (b.commission || 0), 0);

  // Chart data: Room Occupancy by Type
  const categories = ['Double Bed Room', 'Family Bed Room'] as const;
  const chartData = categories.map(cat => {
    const catRooms = rooms.filter(r => r.category === cat);
    const occupied = catRooms.filter(r => r.status === 'Occupied').length;
    const available = catRooms.filter(r => r.status === 'Available').length;
    const maintenance = catRooms.filter(r => r.status === 'Maintenance' || r.status === 'Cleaning').length;
    return {
      name: cat,
      Occupied: occupied,
      Available: available,
      Maintenance: maintenance
    };
  });

  // Channel Analytics calculation
  // Local state for date filtering
  const defaultStartDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const defaultEndDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const [channelStartDate, setChannelStartDate] = useState(defaultStartDate);
  const [channelEndDate, setChannelEndDate] = useState(defaultEndDate);

  // Normalising createdAt needs a Date parse per booking — do it once per
  // bookings change, not on every render / keystroke in the doc search box.
  const bookingCreatedDates = useMemo(() => bookings.map(b => {
    try {
      return new Date(b.createdAt).toISOString().split('T')[0];
    } catch {
      return (b.createdAt || '').split('T')[0];
    }
  }), [bookings]);

  const filteredChannelBookings = useMemo(() => bookings.filter((b, i) => {
    const bDate = bookingCreatedDates[i];
    return bDate >= channelStartDate && bDate <= channelEndDate;
  }), [bookings, bookingCreatedDates, channelStartDate, channelEndDate]);

  const channelStatsBySource = filteredChannelBookings.reduce((acc, b) => {
    const src = b.source || 'Direct';
    if (!acc[src]) {
      acc[src] = { count: 0, revenue: 0, commission: 0, netRevenue: 0 };
    }
    acc[src].count += 1;
    acc[src].revenue += b.total;
    acc[src].commission += b.commission || 0;
    acc[src].netRevenue += b.netRevenue || b.total;
    return acc;
  }, {} as Record<string, { count: number, revenue: number, commission: number, netRevenue: number }>);

  const channelPieData = Object.keys(channelStatsBySource).map(src => ({
    name: src,
    value: channelStatsBySource[src].count
  }));

  const COLORS = ['#C2412D', '#6B7A85', '#D9822B', '#2D6A4F', '#17171A', '#8B5CF6', '#0284C7'];

  // Upcoming Arrivals (filter for today and future arrivals first, sorted soonest first)
  const upcomingArrivals = useMemo(() => {
    const eligible = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Booked');

    const futureOrToday = eligible
      .filter(b => (b.checkIn || '').split('T')[0] >= today)
      .sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''));

    if (futureOrToday.length >= 4) {
      return futureOrToday.slice(0, 4);
    }

    const past = eligible
      .filter(b => (b.checkIn || '').split('T')[0] < today)
      .sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || ''));

    return [...futureOrToday, ...past].slice(0, 4);
  }, [bookings, today]);

  const recentBookings = useMemo(() => [...bookings]
    .sort((a, b) => (b.checkIn || b.createdAt || '').localeCompare(a.checkIn || a.createdAt || ''))
    .slice(0, 5), [bookings]);

  return (
    <div className="space-y-6">
      {/* Top Header with Tactile Greeting & New Booking CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative group shrink-0">
            <img src={logoUrl} alt="Sharda Palace" className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-2xl p-1 bg-card border border-border/80 shadow-xs transition-transform group-hover:scale-105" />
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-card-foreground truncate">
                {getGreeting()}, {user?.name.split(' ')[0]} 🙏
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full font-semibold">
                <Sparkles className="w-3 h-3" /> Live Desk
              </span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
              {format(getISTDate(), "EEEE, dd MMM yyyy")} · Hotel Sharda Palace
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="group relative inline-flex items-center justify-center gap-2.5 bg-primary text-primary-foreground px-5 py-2.5 rounded-full font-semibold text-xs uppercase tracking-wider shadow-sm hover:shadow-md hover:bg-primary/95 transition-all tactile-btn cursor-pointer w-full sm:w-auto shrink-0"
        >
          <span>New Reservation</span>
          <span className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center transition-transform group-hover:rotate-90">
            <Plus className="w-3.5 h-3.5 text-primary-foreground" />
          </span>
        </button>
      </div>

      {/* 4 Stat Cards with Double-Bezel Architecture & Staggered Animations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Today's Check-ins */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.04 }}
          className="bg-card/90 border border-border/80 rounded-2xl p-5 shadow-xs hover:border-primary/40 tactile-card flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-mono font-bold text-muted-foreground uppercase tracking-[0.18em]">
                Today's Check-ins
              </span>
              <div className="text-3xl font-mono font-bold tracking-tight text-card-foreground mt-1.5">
                {todayCheckIns.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 font-mono">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{checkedInCount} already checked in</span>
          </div>
        </motion.div>

        {/* Card 2: Today's Check-outs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="bg-card/90 border border-border/80 rounded-2xl p-5 shadow-xs hover:border-primary/40 tactile-card flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-mono font-bold text-muted-foreground uppercase tracking-[0.18em]">
                Today's Check-outs
              </span>
              <div className="text-3xl font-mono font-bold tracking-tight text-card-foreground mt-1.5">
                {todayCheckOuts.length}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 font-mono">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Standard checkout by 11:00 AM</span>
          </div>
        </motion.div>

        {/* Card 3: Occupied Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="bg-card/90 border border-border/80 rounded-2xl p-5 shadow-xs hover:border-primary/40 tactile-card flex flex-col justify-between relative overflow-hidden group"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-mono font-bold text-muted-foreground uppercase tracking-[0.18em]">
                Room Occupancy
              </span>
              <div className="text-3xl font-mono font-bold tracking-tight text-card-foreground mt-1.5">
                {occupiedRooms}<span className="text-base text-muted-foreground font-normal">/{rooms.length}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                <Bed className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50 flex items-center justify-between font-mono">
            <span>{availableRooms} rooms vacant</span>
            <span className="font-semibold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
              {occupancyPercent}%
            </span>
          </div>
        </motion.div>

        {/* Card 4: Total Collections */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16 }}
          className="bg-card/90 border border-primary/30 rounded-2xl p-5 shadow-xs hover:border-primary/60 tactile-card flex flex-col justify-between relative overflow-hidden group bg-gradient-to-br from-primary/5 via-card to-card"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10.5px] font-mono font-bold text-primary uppercase tracking-[0.18em]">
                Total Revenue
              </span>
              <div className="text-3xl font-mono font-bold tracking-tight text-primary mt-1.5">
                {formatCurrency(totalCollections)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/50 flex items-center justify-between font-mono">
            <span>{checkedOutBookings.length} completed stays</span>
            <span className="font-semibold text-primary">Com: {formatCurrency(totalCommission)}</span>
          </div>
        </motion.div>
      </div>

      {/* Grid: Occupancy Chart + Upcoming Arrivals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Grouped Bar Chart */}
        <div className="lg:col-span-2 bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-card-foreground tracking-tight">Room Occupancy by Type</h2>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Status
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 2]} ticks={[0, 1, 2]} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Occupied" fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
                <Bar dataKey="Maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Arrivals */}
        <div className="bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-card-foreground tracking-tight">Upcoming Arrivals</h2>
              <span className="text-[11px] font-mono text-muted-foreground">{upcomingArrivals.length} queued</span>
            </div>
            <div className="space-y-2">
              {upcomingArrivals.map(b => {
                const guest = guestById.get(b.guestId);
                const room = roomById.get(b.roomId);
                return (
                  <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary/70 transition-all duration-200 border border-transparent hover:border-border/60 group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-secondary text-foreground font-mono font-semibold rounded-full flex items-center justify-center text-xs border border-border group-hover:scale-105 transition-transform">
                        {guest?.avatarInitial || 'G'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-card-foreground tracking-tight">{guest?.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          Room {room?.number} · {b.nights}n ({b.adults}A {b.children}C)
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10.5px] font-mono px-2.5 py-0.5 rounded-full border font-medium ${
                      b.status === 'Confirmed' ? 'bg-secondary text-foreground border-border' : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Channel Analytics */}
      <div className="bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-card-foreground tracking-tight">Channel Performance</h2>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border font-semibold">
              Live Distribution
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={channelStartDate}
              onChange={(e) => setChannelStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono border border-border/80 rounded-xl bg-background/80 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
            />
            <span className="text-muted-foreground text-xs font-mono">to</span>
            <input
              type="date"
              value={channelEndDate}
              onChange={(e) => setChannelEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-mono border border-border/80 rounded-xl bg-background/80 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-64 flex items-center justify-center">
            {channelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {channelPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm font-mono text-muted-foreground flex items-center justify-center h-full">No bookings found for selected dates</div>
            )}
          </div>
          <div className="lg:col-span-3">
            {/* Mobile Card View (< sm screens) */}
            <div className="block sm:hidden space-y-2.5">
              {Object.entries(channelStatsBySource)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([source, stats], idx) => (
                  <div key={source} className="p-3 rounded-xl bg-background/60 border border-border/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        <span className="font-semibold text-sm text-foreground">{source}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground text-xs font-mono font-bold">
                        {stats.count} {stats.count === 1 ? 'booking' : 'bookings'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 font-mono text-[11px]">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Gross</span>
                        <span className="font-semibold text-foreground">{formatCurrency(stats.revenue)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase block">Commission</span>
                        <span className="font-semibold text-destructive">{formatCurrency(stats.commission)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase block">Net</span>
                        <span className="font-bold text-primary">{formatCurrency(stats.netRevenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              {Object.keys(channelStatsBySource).length === 0 && (
                <div className="py-4 text-center text-muted-foreground font-sans text-sm">
                  No channel data available for the selected dates.
                </div>
              )}
            </div>

            {/* Desktop Table (>= sm screens) */}
            <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full min-w-[520px] text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border/70 text-xs font-semibold text-muted-foreground uppercase font-mono">
                    <th className="pb-3 px-2 whitespace-nowrap">Source Channel</th>
                    <th className="pb-3 px-2 text-center whitespace-nowrap">Bookings</th>
                    <th className="pb-3 px-2 text-right whitespace-nowrap">Gross Revenue</th>
                    <th className="pb-3 px-2 text-right whitespace-nowrap">Commission</th>
                    <th className="pb-3 px-2 text-right whitespace-nowrap">Net Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-xs">
                  {Object.entries(channelStatsBySource)
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([source, stats], idx) => (
                    <tr key={source} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-2 font-medium text-foreground flex items-center gap-2 font-sans text-sm whitespace-nowrap">
                        <span className="w-2.5 h-2.5 rounded-full shadow-xs shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                        {source}
                      </td>
                      <td className="py-3 px-2 text-center text-foreground font-semibold whitespace-nowrap">{stats.count}</td>
                      <td className="py-3 px-2 text-right font-medium text-foreground whitespace-nowrap">{formatCurrency(stats.revenue)}</td>
                      <td className="py-3 px-2 text-right text-destructive font-medium whitespace-nowrap">{formatCurrency(stats.commission)}</td>
                      <td className="py-3 px-2 text-right font-bold text-primary whitespace-nowrap">{formatCurrency(stats.netRevenue)}</td>
                    </tr>
                  ))}
                  {Object.keys(channelStatsBySource).length === 0 && (
                     <tr>
                       <td colSpan={5} className="py-4 text-center text-muted-foreground font-sans text-sm">No channel data available for the selected dates.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Bookings + Recent Comms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Bookings Table */}
        <div className="lg:col-span-2 bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-card-foreground tracking-tight">Recent Bookings</h2>
              <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border font-semibold">
                Latest 5
              </span>
            </div>
            <button 
              onClick={() => navigate('/bookings')}
              className="group text-xs font-mono font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          {/* Mobile Card View (< sm screens) */}
          <div className="block sm:hidden space-y-3">
            {recentBookings.map(b => {
              const guest = guestById.get(b.guestId);
              const room = roomById.get(b.roomId);
              return (
                <div key={b.id} className="p-3.5 rounded-xl bg-background/60 border border-border/80 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{b.id}</span>
                      <span className="text-xs text-muted-foreground font-mono">Room {room?.number}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                      b.status === 'Checked-In' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' :
                      b.status === 'Confirmed' ? 'bg-secondary text-foreground border-border' :
                      b.status === 'Booked' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25' :
                      'bg-muted text-muted-foreground border-border'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                    <div>
                      <p className="font-semibold text-foreground tracking-tight">{guest?.name}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{guest?.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(b.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(b.checkIn)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table View (>= sm screens) with guaranteed min-width to prevent any overlap */}
          <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[620px] text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-border/70 text-xs font-semibold text-muted-foreground uppercase font-mono">
                  <th className="pb-3 px-2 whitespace-nowrap">Booking ID</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Guest</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Room</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Check-in</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Amount</th>
                  <th className="pb-3 px-2 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentBookings.map(b => {
                  const guest = guestById.get(b.guestId);
                  const room = roomById.get(b.roomId);
                  return (
                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs font-bold text-primary whitespace-nowrap">{b.id}</td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <p className="font-semibold text-card-foreground tracking-tight">{guest?.name}</p>
                        <p className="text-[11px] font-mono text-muted-foreground">{guest?.phone}</p>
                      </td>
                      <td className="py-3 px-2 text-foreground font-mono text-xs whitespace-nowrap">Room {room?.number}</td>
                      <td className="py-3 px-2 text-foreground font-mono text-xs whitespace-nowrap">{formatDate(b.checkIn)}</td>
                      <td className="py-3 px-2 font-bold font-mono text-card-foreground whitespace-nowrap">{formatCurrency(b.total)}</td>
                      <td className="py-3 px-2 whitespace-nowrap">
                        <span className={`text-[10.5px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                          b.status === 'Checked-In' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 shadow-xs' :
                          b.status === 'Confirmed' ? 'bg-secondary text-foreground border-border' :
                          b.status === 'Booked' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25' :
                          'bg-muted text-muted-foreground border-border'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Comms */}
        <div className="bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-card-foreground tracking-tight">Recent Comms</h2>
              <button 
                onClick={() => navigate('/communications')}
                className="text-xs font-mono font-semibold text-primary hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {comms.slice(0, 4).map(c => {
                const guest = guestById.get(c.guestId);
                return (
                  <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-secondary/70 transition-all duration-200 border border-transparent hover:border-border/60">
                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-primary font-mono font-bold text-xs border border-border">
                      {c.channel === 'WhatsApp' ? 'W' : c.channel === 'Email' ? 'E' : 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-card-foreground truncate tracking-tight">{guest?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.template}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatDate(c.timestamp)}</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${c.status === 'Delivered' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25' : 'bg-muted text-muted-foreground'}`}>
                      {c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Manager Quick Actions Row with Tactile Buttons */}
      {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
        <div className="bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-[0.2em]">Manager Quick Actions</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={() => navigate('/payments')}
              className="tactile-btn px-4 py-2.5 border border-border/80 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-background/50"
            >
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span>View All Payments</span>
            </button>
            <button 
              onClick={() => navigate('/rooms')}
              className="tactile-btn px-4 py-2.5 border border-border/80 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-background/50"
            >
              <Bed className="w-3.5 h-3.5 text-primary" />
              <span>Room Status</span>
            </button>
            <button 
              onClick={() => navigate('/calendar')}
              className="tactile-btn px-4 py-2.5 border border-border/80 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-background/50"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Availability Calendar</span>
            </button>
            <button
              onClick={() => navigate('/communications')}
              className="tactile-btn px-4 py-2.5 border border-border/80 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-background/50"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Send Bulk Communication</span>
            </button>
          </div>
        </div>
      )}

      {/* Cloud Document Repository Section */}
      <div className="bg-card/90 p-6 rounded-2xl border border-border/80 shadow-xs tactile-card mt-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-border/50 pb-3">
            <h2 className="text-base font-bold text-card-foreground flex items-center gap-2 tracking-tight">
               <Database className="w-4 h-4 text-primary" /> Cloud Document Repository
            </h2>
            <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-lg border border-border/70 font-semibold self-start sm:self-auto">
               <Globe className="w-3 h-3 text-emerald-500" /> Synced with Google Drive
            </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-6">
           <div className="relative flex-1">
             <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input
               type="text"
               placeholder="Search by Document ID (e.g. SP-CHK-...) or Type..."
               value={docSearch}
               onChange={(e) => setDocSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2.5 border border-border/80 rounded-xl text-xs bg-background/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono shadow-xs"
               onKeyDown={(e) => e.key === 'Enter' && handleDocSearch()}
             />
           </div>
           <button
             onClick={handleDocSearch}
             disabled={isSearching}
             className="tactile-btn bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
           >
              {isSearching ? 'Searching...' : 'Search Archive'}
           </button>
        </div>

        {/* Mobile Card View (< sm screens) */}
        <div className="block sm:hidden space-y-3">
          {docs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground font-sans text-sm bg-background/60 rounded-xl border border-border/80">
              No documents matched your search query.
            </div>
          ) : (
            docs.map((d: any) => (
              <div key={d.id || d.documentId} className="p-3.5 rounded-xl bg-background/60 border border-border/80 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-foreground">{d.documentId}</span>
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                    d.type === 'Invoice' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' :
                    d.type === 'Receipt' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' :
                    'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                  }`}>
                    {d.type}
                  </span>
                </div>
                <p className="font-sans font-semibold text-xs text-primary truncate" title={d.title}>
                  {d.title}
                </p>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Saved: {new Date(d.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/50 flex-wrap">
                  <a href={d.webViewLink} target="_blank" rel="noreferrer" className="flex-1 min-w-[70px] text-center tactile-btn text-xs font-bold bg-secondary border border-border/80 py-2 rounded-lg hover:bg-muted text-foreground transition-all shadow-xs">
                    View
                  </a>
                  <a href={d.webContentLink} target="_blank" rel="noreferrer" className="flex-1 min-w-[110px] text-center tactile-btn text-xs font-bold bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-90 transition-all shadow-xs">
                    Download PDF
                  </a>
                  <button
                    onClick={() => handleDeleteDoc(d._id || d.id || d.documentId, d.documentId)}
                    disabled={deletingDocId === (d._id || d.id || d.documentId)}
                    className="tactile-btn text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
                    title="Delete file permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingDocId === (d._id || d.id || d.documentId) ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= sm screens) */}
        <div className="hidden sm:block overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm border border-border/80 rounded-xl overflow-hidden whitespace-nowrap">
                <thead className="bg-secondary/60">
                   <tr className="text-xs font-semibold text-muted-foreground uppercase font-mono">
                      <th className="px-4 py-3 border-b border-border/70 whitespace-nowrap">Doc ID</th>
                      <th className="px-4 py-3 border-b border-border/70 whitespace-nowrap">Title</th>
                      <th className="px-4 py-3 border-b border-border/70 whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 border-b border-border/70 whitespace-nowrap">Saved Date</th>
                      <th className="px-4 py-3 border-b border-border/70 whitespace-nowrap">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono text-xs">
                    {docs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-sans text-sm">
                                No documents matched your search query.
                            </td>
                        </tr>
                    ) : (
                        docs.map((d: any) => (
                           <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                              <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{d.documentId}</td>
                              <td className="px-4 py-3 font-semibold text-primary max-w-[200px] truncate font-sans text-xs whitespace-nowrap" title={d.title}>{d.title}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${
                                      d.type === 'Invoice' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25' :
                                      d.type === 'Receipt' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25' :
                                      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25'
                                  }`}>
                                      {d.type}
                                  </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                  {new Date(d.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                 <div className="flex items-center gap-2">
                                     <a href={d.webViewLink} target="_blank" rel="noreferrer" className="tactile-btn text-xs font-bold bg-secondary border border-border/80 px-3 py-1.5 rounded-lg hover:bg-muted text-foreground transition-all shadow-xs">
                                        View
                                     </a>
                                     <a href={d.webContentLink} target="_blank" rel="noreferrer" className="tactile-btn text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-all shadow-xs">
                                        Download PDF
                                     </a>
                                     <button
                                        onClick={() => handleDeleteDoc(d._id || d.id || d.documentId, d.documentId)}
                                        disabled={deletingDocId === (d._id || d.id || d.documentId)}
                                        className="tactile-btn text-xs font-bold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/30 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
                                        title="Delete file permanently"
                                     >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {deletingDocId === (d._id || d.id || d.documentId) ? 'Deleting...' : 'Delete'}
                                     </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Modal Integration */}
      <NewBookingModal
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
