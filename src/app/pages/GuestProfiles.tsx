import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Guest } from '../data/types';
import { exportToCsv } from '../lib/exportCsv';
import { Search, Crown, RotateCcw, TrendingUp, Users, MapPin, CreditCard, Clock, FileText, X, Phone, Mail, Download } from 'lucide-react';

export function GuestProfiles() {
  const { guests, bookings, rooms } = useData();
  const [activeTab, setActiveTab] = useState<'All' | 'VIP' | 'Repeat' | 'New'>('All');
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  const vipGuests = guests.filter(g => g.isVIP);
  const repeatGuests = guests.filter(g => g.totalStays > 1);
  const totalLTV = guests.reduce((sum, g) => sum + g.totalSpent, 0);
  const avgStays = (guests.reduce((sum, g) => sum + g.totalStays, 0) / guests.length).toFixed(1);

  const filteredGuests = guests.filter(g => {
    if (activeTab === 'VIP' && !g.isVIP) return false;
    if (activeTab === 'Repeat' && g.totalStays <= 1) return false;
    if (activeTab === 'New' && g.totalStays > 1) return false;

    if (search) {
      const query = search.toLowerCase();
      if (!g.name.toLowerCase().includes(query) &&
          !g.phone.includes(query) &&
          !g.id.toLowerCase().includes(query) &&
          !g.city.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 h-full flex flex-col relative text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Guest Profiles</h1>
          <p className="text-sm text-muted-foreground">
            {guests.length} registered guests · {vipGuests.length} VIP · {repeatGuests.length} frequent visitors
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-primary to-amber-700 text-white px-4 py-2 bg-opacity-10 rounded-lg shadow-sm">
            <span className="text-xs uppercase tracking-wider font-bold opacity-80">Lifetime Value</span>
            <span className="text-lg font-bold">{formatCurrency(totalLTV)}</span>
          </div>
          <button
            onClick={() => {
              const exportData = filteredGuests.map(g => ({
                ID: g.id,
                Name: g.name,
                Phone: g.phone,
                Email: g.email,
                City: g.city,
                State: g.state,
                ID_Type: g.idProofType,
                ID_Number: g.idProofNumber,
                Total_Stays: g.totalStays,
                Last_Stay: g.lastStay,
                Total_Spent: g.totalSpent,
                VIP: g.isVIP ? 'Yes' : 'No'
              }));
              exportToCsv('guests_export', exportData);
            }}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-muted transition-colors text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-xl border border-border flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Guests</span>
            <div className="text-3xl font-bold text-[#2d1b1c] mt-1">{guests.length}</div>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wider">VIP Guests</span>
            <div className="text-3xl font-bold text-yellow-900 mt-1">{vipGuests.length}</div>
          </div>
          <div className="w-12 h-12 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center">
            <Crown className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-green-50 p-5 rounded-xl border border-green-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wider">Repeat Visitors</span>
            <div className="text-3xl font-bold text-green-900 mt-1">{repeatGuests.length}</div>
          </div>
          <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
            <RotateCcw className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-purple-50 p-5 rounded-xl border border-purple-200 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Avg Stays/Guest</span>
            <div className="text-3xl font-bold text-purple-900 mt-1">{avgStays}</div>
          </div>
          <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-card border border-border rounded-lg overflow-x-auto">
        {(['All', 'VIP', 'Repeat', 'New'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab ? 'bg-secondary text-primary' : 'text-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-card p-4 rounded-t-xl border border-border border-b-0 shrink-0">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by name, ID, phone, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-[#7B1E22]"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredGuests.length} results
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border text-sm border-border rounded-b-xl overflow-x-auto flex-1 h-0">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-secondary sticky top-0 z-10">
            <tr className="border-b border-border text-xs font-semibold text-foreground uppercase">
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">ID Proof</th>
              <th className="px-4 py-3 text-right">Stays</th>
              <th className="px-4 py-3">Last Stay</th>
              <th className="px-4 py-3 text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredGuests.map(g => (
              <tr key={g.id} className="hover:bg-muted/50 group cursor-pointer" onClick={() => setSelectedGuest(g)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      {g.avatarInitial}
                    </div>
                    <div>
                      <div className="font-bold text-primary group-hover:underline flex items-center gap-1">
                        {g.name}
                        {g.isVIP && <Crown className="w-3 h-3 text-yellow-500" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{g.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{g.phone}</div>
                  <div className="text-xs text-muted-foreground">{g.email}</div>
                </td>
                <td className="px-4 py-3 text-foreground">
                  {g.city}, {g.state}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{g.idProofType}</div>
                  <div className="text-xs text-muted-foreground">{g.idProofNumber}</div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  {g.totalStays}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {formatDate(g.lastStay)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-green-700">
                  {formatCurrency(g.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Guest Detail Drawer */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedGuest(null)}></div>
          <div className="relative w-full max-w-xl bg-secondary h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-primary">Guest Profile</h2>
              <button onClick={() => setSelectedGuest(null)} className="p-2 bg-muted hover:bg-gray-200 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header profile */}
              <div className="flex items-start gap-4 p-5 bg-card rounded-xl border border-border shadow-sm">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold">
                  {selectedGuest.avatarInitial}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-foreground">{selectedGuest.name}</h3>
                    {selectedGuest.isVIP && (
                      <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <Crown className="w-3 h-3" /> VIP
                      </span>
                    )}
                    {selectedGuest.totalStays > 1 && (
                      <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Repeat
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{selectedGuest.id}</p>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-foreground/80">
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {selectedGuest.phone}</div>
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {selectedGuest.email !== '-' ? selectedGuest.email : 'No email'}</div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {selectedGuest.city}, {selectedGuest.state}</div>
                    <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /> {selectedGuest.idProofType} ({selectedGuest.idProofNumber})</div>
                  </div>
                </div>
              </div>

              {/* LTV row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Lifetime Spend</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(selectedGuest.totalSpent)}</p>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Total Stays</p>
                  <p className="text-2xl font-bold text-[#2d1b1c] mt-1">{selectedGuest.totalStays}</p>
                </div>
              </div>

              {/* Stay History */}
              <div className="bg-card p-5 rounded-xl border border-border shadow-sm">
                <h4 className="font-bold flex items-center gap-2 mb-4 border-b border-gray-100 pb-2">
                  <Clock className="w-5 h-5 text-primary" /> Stay History
                </h4>
                <div className="space-y-4">
                  {bookings
                    .filter(b => b.guestId === selectedGuest.id).sort((a,b) => new Date(b.checkIn).getTime() > new Date(a.checkIn).getTime() ? -1 : 1)
                    .map(b => {
                      const room = rooms.find(r => r.id === b.roomId);
                      return (
                        <div key={b.id} className="flex justify-between items-center text-sm border-l-2 border-[#7B1E22] pl-3 py-1">
                           <div>
                             <p className="font-semibold text-foreground">{formatDate(b.checkIn)} — {b.nights} nights</p>
                             <p className="text-xs text-muted-foreground">Room {room?.number} ({room?.category}) · {b.id}</p>
                           </div>
                           <div className="text-right">
                             <p className="font-bold">{formatCurrency(b.total)}</p>
                             <p className="text-[10px] text-muted-foreground uppercase">{b.status}</p>
                           </div>
                        </div>
                      )
                    })
                  }
                  {bookings.filter(b => b.guestId === selectedGuest.id).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No stay records found.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
