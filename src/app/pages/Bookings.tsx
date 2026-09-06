import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { BookingStatus, Booking } from '../data/types';
import { Search, Plus, MoreHorizontal, FileText, CheckCircle2, ChevronRight, X, CreditCard } from 'lucide-react';
import { NewBookingModal } from '../components/NewBookingModal';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';

export function Bookings() {
  const { bookings, guests, rooms, updateBooking, addPayment } = useData();
  const [activeTab, setActiveTab] = useState<BookingStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const tabs: (BookingStatus | 'All')[] = ['All', 'Booked', 'Confirmed', 'Checked-In', 'Checked-Out'];

  const filteredBookings = bookings.filter(b => {
    if (activeTab !== 'All' && b.status !== activeTab) return false;
    
    if (search) {
      const g = guests.find(g => g.id === b.guestId);
      const r = rooms.find(r => r.id === b.roomId);
      const query = search.toLowerCase();
      if (!b.id.toLowerCase().includes(query) &&
          (!g || !g.name.toLowerCase().includes(query)) &&
          (!g || !g.phone.includes(query)) &&
          (!r || !r.number.includes(query))) {
        return false;
      }
    }
    return true;
  });

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Checked-In': return 'bg-blue-100 text-blue-700';
      case 'Confirmed': return 'bg-green-100 text-green-700';
      case 'Booked': return 'bg-amber-100 text-amber-700';
      case 'Checked-Out': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAction = (b: Booking, action: string) => {
    if (action === 'Check-in' && b.status !== 'Checked-In') {
      updateBooking({ ...b, status: 'Checked-In' });
    } else if (action === 'Check-out') {
      updateBooking({ ...b, status: 'Checked-Out' });
    } else if (action === 'Record Payment') {
      // Very basic prompt-based flow: 
      const amount = parseFloat(window.prompt('Enter amount to collect:', String(b.balance)) || '0');
      if (amount > 0) {
        addPayment({
          id: `RCPT-${Math.floor(Math.random()*9000)+1000}`,
          bookingId: b.id, guestId: b.guestId,
          date: new Date().toISOString().split('T')[0],
          mode: 'UPI', amount, status: 'Completed'
        });
      }
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d1b1c]">Bookings</h1>
          <p className="text-sm text-gray-500">
            {bookings.length} total bookings · Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => setIsNewBookingOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#7B1E22] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#8C1D24] transition-colors"
        >
          <Plus className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-white border border-[#e6dfd8] rounded-lg overflow-x-auto">
        {tabs.map(tab => {
          const count = tab === 'All' ? bookings.length : bookings.filter(b => b.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-[#FAF6F0] text-[#7B1E22]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab} 
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-[#7B1E22] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-t-xl border border-[#e6dfd8] border-b-0 shrink-0">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by guest, ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#e6dfd8] rounded-md text-sm focus:outline-none focus:border-[#7B1E22]"
          />
        </div>
        <div className="text-sm text-gray-500">
          Showing {filteredBookings.length} results
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border text-sm border-[#e6dfd8] rounded-b-xl overflow-x-auto flex-1 h-0">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-[#FAF6F0] sticky top-0 z-10">
            <tr className="border-b border-[#e6dfd8] text-xs font-semibold text-gray-600">
              <th className="px-4 py-3"><input type="checkbox" className="rounded" /></th>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Guest & Phone</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Check In/Out</th>
              <th className="px-4 py-3 text-right">Total (₹)</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredBookings.map(b => {
              const guest = guests.find(g => g.id === b.guestId);
              const room = rooms.find(r => r.id === b.roomId);
              return (
                <tr key={b.id} className="hover:bg-gray-50 group cursor-pointer" onClick={() => setSelectedBooking(b)}>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
                  <td className="px-4 py-3 font-medium text-[#7B1E22] hover:underline">{b.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{guest?.name}</p>
                    <p className="text-xs text-gray-500">{guest?.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">Rm {room?.number}</p>
                    <p className="text-xs text-gray-500">{room?.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-900">{formatDate(b.checkIn)}</p>
                    <p className="text-xs text-gray-500">to {formatDate(b.checkOut)} ({b.nights}N)</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(b.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.balance > 0 ? (
                      <span className="text-red-600 font-medium">{formatCurrency(b.balance)}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${getStatusColor(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                      <button className="p-1 text-gray-400 hover:text-[#7B1E22]">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      {/* Simple hardcoded actions for demo, normally this would be a custom dropdown component */}
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-[#e6dfd8] rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible z-20 transition-all">
                        <div className="p-1">
                           <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-[#FAF6F0] rounded">View Details</button>
                           {b.status === 'Confirmed' && <button onClick={(e) => { e.stopPropagation(); handleAction(b,'Check-in'); }} className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 rounded">Check In</button>}
                           {b.status === 'Checked-In' && <button onClick={(e) => { e.stopPropagation(); handleAction(b,'Check-out'); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">Check Out</button>}
                           {b.balance > 0 && <button onClick={(e) => { e.stopPropagation(); handleAction(b,'Record Payment'); }} className="w-full text-left px-3 py-2 text-sm text-[#7B1E22] hover:bg-[#FAF6F0] rounded">Record Payment</button>}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <NewBookingModal isOpen={isNewBookingOpen} onClose={() => setIsNewBookingOpen(false)} />

      {/* Booking Detail Drawer overlay */}
      <BookingDetailDrawer booking={selectedBooking} isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} />
    </div>
  );
}
