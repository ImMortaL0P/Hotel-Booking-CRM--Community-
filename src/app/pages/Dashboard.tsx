import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
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
  PhoneCall
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { NewBookingModal } from '../components/NewBookingModal';
import { useNavigate } from 'react-router';
import logoUrl from '../../assets/logo.png';

export function Dashboard() {
  const { user, bookings, rooms, guests, comms } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = '2026-09-05';

  // Stats calculation
  const todayCheckIns = bookings.filter(b => b.checkIn.split('T')[0] === today);
  const checkedInCount = todayCheckIns.filter(b => b.status === 'Checked-In').length;

  const todayCheckOuts = bookings.filter(b => b.checkOut.split('T')[0] === today);

  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length;
  const availableRooms = rooms.filter(r => r.status === 'Available').length;
  const occupancyPercent = Math.round((occupiedRooms / rooms.length) * 100);

  const pendingBookings = bookings.filter(b => b.balance > 0);
  const totalPendingAmount = pendingBookings.reduce((sum, b) => sum + b.balance, 0);

  // Chart data: Room Occupancy by Type
  const categories = ['Deluxe Double', 'Family Suite'] as const;
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

  // Upcoming Arrivals
  const upcomingArrivals = bookings
    .filter(b => b.status === 'Confirmed' || b.status === 'Booked')
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={logoUrl} alt="Sharda Palace" className="w-16 h-16 object-contain hidden md:block" />
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {getGreeting()}, {user?.name.split(' ')[0]} 🙏
            </h1>
            <p className="text-sm text-muted-foreground">
              Wednesday, 02 Sept 26 · Sharda Palace, Deoghar
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-colors shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> + New Booking
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-card p-5 rounded-lg border border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Check-ins</span>
            <div className="text-3xl font-bold text-card-foreground mt-2">{todayCheckIns.length}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
            <span>{checkedInCount} already checked in</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-card p-5 rounded-lg border border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today's Check-outs</span>
            <div className="text-3xl font-bold text-card-foreground mt-2">{todayCheckOuts.length}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Check-out by 11:00 AM</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-card p-5 rounded-lg border border-border flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupied Rooms</span>
              <div className="text-3xl font-bold text-card-foreground mt-2">{occupiedRooms}/{rooms.length}</div>
            </div>
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">
              {occupancyPercent}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-3">
            {availableRooms} rooms available
          </div>
        </div>

        {/* Card 4 - Tinted Red */}
        <div className="bg-card p-5 rounded-lg border-l-4 border-l-destructive border-y border-r border-border flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-destructive uppercase tracking-wider">Pending Collections</span>
            <div className="text-3xl font-bold text-destructive mt-2">{formatCurrency(totalPendingAmount)}</div>
          </div>
          <div className="text-xs text-destructive/80 mt-3">
            {pendingBookings.length} guests with balance
          </div>
        </div>
      </div>

      {/* Grid: Occupancy Chart + Upcoming Arrivals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Grouped Bar Chart */}
        <div className="lg:col-span-2 bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-card-foreground">Room Occupancy by Type</h2>
              <span className="flex items-center gap-1 text-[10px] font-semibold bg-red-100 text-destructive px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></span> LIVE
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, 2]} ticks={[0, 1, 2]} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Occupied" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Maintenance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Upcoming Arrivals */}
        <div className="bg-card p-6 rounded-lg border border-border">
          <h2 className="text-base font-bold text-card-foreground mb-4">Upcoming Arrivals</h2>
          <div className="space-y-4">
            {upcomingArrivals.map(b => {
              const guest = guests.find(g => g.id === b.guestId);
              const room = rooms.find(r => r.id === b.roomId);
              return (
                <div key={b.id} className="flex items-center justify-between pb-3 border-b border-border/50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-sm">
                      {guest?.avatarInitial || 'G'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{guest?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Room {room?.number} · {b.nights} nights ({b.adults}A {b.children}C)
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${b.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    {b.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Recent Bookings + Recent Comms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Bookings Table */}
        <div className="lg:col-span-2 bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-card-foreground">Recent Bookings</h2>
            <button 
              onClick={() => navigate('/bookings')}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                  <th className="pb-3">Booking ID</th>
                  <th className="pb-3">Guest</th>
                  <th className="pb-3">Room</th>
                  <th className="pb-3">Check-in</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bookings.slice(0, 5).map(b => {
                  const guest = guests.find(g => g.id === b.guestId);
                  const room = rooms.find(r => r.id === b.roomId);
                  return (
                    <tr key={b.id} className="hover:bg-muted/50">
                      <td className="py-3 font-medium text-primary">{b.id}</td>
                      <td className="py-3">
                        <p className="font-medium text-card-foreground">{guest?.name}</p>
                        <p className="text-xs text-muted-foreground">{guest?.phone}</p>
                      </td>
                      <td className="py-3 text-foreground">Room {room?.number}</td>
                      <td className="py-3 text-foreground">{formatDate(b.checkIn)}</td>
                      <td className="py-3 font-semibold text-card-foreground">{formatCurrency(b.total)}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          b.status === 'Checked-In' ? 'bg-green-100 text-green-700' :
                          b.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'Booked' ? 'bg-amber-100 text-amber-700' :
                          'bg-muted text-muted-foreground'
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
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-card-foreground">Recent Comms</h2>
            <button 
              onClick={() => navigate('/communications')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-4">
            {comms.slice(0, 4).map(c => {
              const guest = guests.find(g => g.id === c.guestId);
              return (
                <div key={c.id} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-primary font-semibold text-xs border border-border">
                    {c.channel === 'WhatsApp' ? 'W' : c.channel === 'Email' ? 'E' : 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-card-foreground truncate">{guest?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.template}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(c.timestamp)}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${c.status === 'Delivered' ? 'bg-green-100 text-green-700' : 'bg-muted text-foreground'}`}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Manager Quick Actions Row */}
      {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
        <div className="bg-card p-5 rounded-lg border border-border">
          <h2 className="text-sm font-bold text-card-foreground mb-3 uppercase tracking-wider">Manager Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => navigate('/payments')}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              View All Payments
            </button>
            <button 
              onClick={() => navigate('/rooms')}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              Room Status
            </button>
            <button 
              onClick={() => navigate('/calendar')}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              Availability Calendar
            </button>
            <button 
              onClick={() => navigate('/communications')}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              Send Bulk Communication
            </button>
          </div>
        </div>
      )}

      {/* Modal Integration */}
      <NewBookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
