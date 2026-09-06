import { useState, useEffect } from 'react';
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
  Search
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { NewBookingModal } from '../components/NewBookingModal';
import { useNavigate } from 'react-router';
import logoUrl from '../../assets/logo.png';

export function Dashboard() {
  const { user, bookings, rooms, guests, comms } = useData();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Document Search State
  const [docSearch, setDocSearch] = useState('');
  const [docs, setDocs] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const handleDocSearch = async () => {
    setIsSearching(true);
    try {
       const res = await apiFetch(`/api/documents/search?q=${docSearch}`);
       if (res && res.success) {
           setDocs(res.data);
       }
    } catch(err) {
       console.error("Search failed", err);
    }
    setIsSearching(false);
  };
  // Load initially
  useEffect(() => { handleDocSearch(); }, []);

  // Health Status
  const [health, setHealth] = useState({
    frontend: 'Online',
    backend: 'Checking...',
    database: 'Checking...',
    pingMs: 0
  });

  const checkHealth = async () => {
    const start = Date.now();
    try {
      const res = await apiFetch('/api/health').catch(() => null);
      if (res && res.status === 'ok') {
        setHealth({
          frontend: 'Online',
          backend: 'Online',
          database: res.dbStatus || 'Connected',
          pingMs: Date.now() - start
        });
      } else {
        setHealth({
          frontend: 'Online',
          backend: 'Offline',
          database: 'Offline',
          pingMs: 0
        });
      }
    } catch (err) {
      setHealth({
        frontend: 'Online',
        backend: 'Offline',
        database: 'Offline',
        pingMs: 0
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

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
              <tbody className="divide-y divide-border/50">
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

          {/* System Health Monitor */}
          <div className="mt-6 pt-5 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> System Health Status
              </h3>
              <button
                onClick={() => {
                  setHealth(h => ({ ...h, backend: 'Checking...', database: 'Checking...' }));
                  checkHealth();
                }}
                className="text-[10px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground px-2 py-1 rounded border border-border"
              >
                Refresh Status
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              {/* Frontend Status */}
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-card-foreground">Frontend Viewer</span>
                <span className={`w-2 h-2 rounded-full ml-1 ${health.frontend === 'Online' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500'}`}></span>
                <span className="text-[10px] text-muted-foreground uppercase">{health.frontend}</span>
              </div>

              {/* Backend Status */}
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50">
                <Server className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-card-foreground">Render Backend Server</span>
                <span className={`w-2 h-2 rounded-full ml-1 ${health.backend === 'Online' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-[10px] text-muted-foreground uppercase">{health.backend} {health.pingMs > 0 ? `(${health.pingMs}ms)` : ''}</span>
              </div>

              {/* DB Status */}
              <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md border border-border/50">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-card-foreground">MongoDB Atlas</span>
                <span className={`w-2 h-2 rounded-full ml-1 ${(health.database === 'Connected' || health.database === 'Online') ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-amber-500 animate-pulse'}`}></span>
                <span className="text-[10px] text-muted-foreground uppercase">{health.database}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Document Repository Section */}
      <div className="bg-card p-6 rounded-lg border border-border mt-6 print:hidden">
        <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-2">
            <h2 className="text-base font-bold text-card-foreground flex items-center gap-2">
               <Database className="w-5 h-5 text-primary" /> Cloud Document Repository
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
               <Globe className="w-3 h-3" /> Synced with Google Drive
            </div>
        </div>
        <div className="flex gap-4 items-center mb-6">
           <div className="relative flex-1">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
             <input
               type="text"
               placeholder="Search by Document ID (e.g. SP-CHK-...) or Type..."
               value={docSearch}
               onChange={(e) => setDocSearch(e.target.value)}
               className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
               onKeyDown={(e) => e.key === 'Enter' && handleDocSearch()}
             />
           </div>
           <button
             onClick={handleDocSearch}
             disabled={isSearching}
             className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold text-sm hover:bg-[#60171a] transition-colors disabled:opacity-50"
           >
              {isSearching ? 'Searching...' : 'Search'}
           </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-secondary/50">
                   <tr className="text-xs font-semibold text-muted-foreground uppercase">
                      <th className="px-4 py-3 border-b border-border">Doc ID</th>
                      <th className="px-4 py-3 border-b border-border">Title</th>
                      <th className="px-4 py-3 border-b border-border">Type</th>
                      <th className="px-4 py-3 border-b border-border">Saved Date</th>
                      <th className="px-4 py-3 border-b border-border">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                    {docs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                No documents matched your search.
                            </td>
                        </tr>
                    ) : (
                        docs.map((d: any) => (
                           <tr key={d.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 font-medium text-foreground">{d.documentId}</td>
                              <td className="px-4 py-3 font-medium text-primary max-w-[200px] truncate" title={d.title}>{d.title}</td>
                              <td className="px-4 py-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                      d.type === 'Invoice' ? 'bg-blue-100 text-blue-700' :
                                      d.type === 'Receipt' ? 'bg-green-100 text-green-700' :
                                      'bg-amber-100 text-amber-700'
                                  }`}>
                                      {d.type}
                                  </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                  {new Date(d.createdAt).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                     <a href={d.webViewLink} target="_blank" rel="noreferrer" className="text-xs font-bold bg-secondary border border-border px-3 py-1.5 rounded hover:bg-muted text-foreground transition-colors">
                                        View
                                     </a>
                                     <a href={d.webContentLink} target="_blank" rel="noreferrer" className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded hover:opacity-90 transition-colors">
                                        Download PDF
                                     </a>
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
