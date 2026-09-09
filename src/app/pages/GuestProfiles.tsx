import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { Guest, IDProofType } from '../data/types';
import { exportToCsv } from '../lib/exportCsv';
import { Search, Crown, RotateCcw, TrendingUp, Users, MapPin, CreditCard, Clock, FileText, X, Phone, Mail, Download, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export function GuestProfiles() {
  const { addLog, guests, bookings, rooms, addGuest, updateGuest } = useData();
  const [activeTab, setActiveTab] = useState<'All' | 'VIP' | 'Repeat' | 'New'>('All');
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formIdProofType, setFormIdProofType] = useState<IDProofType>('Aadhaar');
  const [formIdProofNumber, setFormIdProofNumber] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openAddForm = () => {
    setEditingGuest(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormCity('');
    setFormState('');
    setFormIdProofType('Aadhaar');
    setFormIdProofNumber('');
    setFormNotes('');
    setIsFormOpen(true);
  };

  const openEditForm = (guest: Guest) => {
    setEditingGuest(guest);
    setFormName(guest.name);
    setFormPhone(guest.phone);
    setFormEmail(guest.email === '-' ? '' : guest.email);
    setFormCity(guest.city);
    setFormState(guest.state);
    setFormIdProofType(guest.idProofType);
    setFormIdProofNumber(guest.idProofNumber);
    setFormNotes(guest.notes || '');
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    const avatarInitial = formName.trim().split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

    if (editingGuest) {
      const updated: Guest = {
        ...editingGuest,
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || '-',
        city: formCity.trim(),
        state: formState.trim(),
        idProofType: formIdProofType,
        idProofNumber: formIdProofNumber.trim(),
        notes: formNotes.trim() || undefined,
        avatarInitial
      };
      updateGuest(updated);
      toast.success('Guest updated successfully');
      if (selectedGuest?.id === editingGuest.id) setSelectedGuest(updated);
    } else {
      const newGuest: Guest = {
        id: generateId('gst'),
        name: formName.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim() || '-',
        city: formCity.trim(),
        state: formState.trim(),
        idProofType: formIdProofType,
        idProofNumber: formIdProofNumber.trim(),
        totalStays: 0,
        lastStay: '',
        totalSpent: 0,
        isVIP: false,
        notes: formNotes.trim() || undefined,
        avatarInitial
      };
      addGuest(newGuest);
      toast.success('Guest added successfully');
    }
    setIsFormOpen(false);
  };

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
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" /> Add Guest
          </button>
          <div className="flex items-center gap-2 bg-card border border-primary text-primary px-4 py-2 rounded-lg shadow-sm">
            <span className="text-xs uppercase tracking-wider font-bold">Lifetime Value</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(totalLTV)}</span>
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
              addLog('File Download', 'Exported Guests list to CSV');
            }}
            className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-muted transition-colors text-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card p-5 rounded-lg border border-border border-l-4 border-l-blue-600 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Guests</span>
            <div className="text-3xl font-bold text-foreground mt-1">{guests.length}</div>
          </div>
          <div className="w-12 h-12 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border border-l-4 border-l-yellow-600 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wider">VIP Guests</span>
            <div className="text-3xl font-bold text-yellow-900 mt-1">{vipGuests.length}</div>
          </div>
          <div className="w-12 h-12 text-yellow-600 flex items-center justify-center">
            <Crown className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border border-l-4 border-l-green-600 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wider">Repeat Visitors</span>
            <div className="text-3xl font-bold text-green-900 mt-1">{repeatGuests.length}</div>
          </div>
          <div className="w-12 h-12 text-green-600 flex items-center justify-center">
            <RotateCcw className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border border-l-4 border-l-purple-600 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Avg Stays/Guest</span>
            <div className="text-3xl font-bold text-purple-900 mt-1">{avgStays}</div>
          </div>
          <div className="w-12 h-12 text-purple-600 flex items-center justify-center">
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
            className="w-full pl-9 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:border-primary"
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
          <tbody className="divide-y divide-border/50">
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
          <div className="relative w-full max-w-xl bg-secondary h-full shadow-sm flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0">
              <h2 className="text-xl font-bold text-primary">Guest Profile</h2>
              <button onClick={() => setSelectedGuest(null)} className="p-2 bg-muted hover:bg-muted-foreground/20 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header profile */}
              <div className="flex items-start gap-4 p-5 bg-card rounded-lg border border-border shadow-sm">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold">
                  {selectedGuest.avatarInitial}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-foreground">{selectedGuest.name}</h3>
                    <button
                      onClick={() => openEditForm(selectedGuest)}
                      className="p-1.5 bg-muted hover:bg-muted-foreground/20 rounded-md transition-colors"
                      title="Edit Guest"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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
                <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Lifetime Spend</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(selectedGuest.totalSpent)}</p>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Total Stays</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{selectedGuest.totalStays}</p>
                </div>
              </div>

              {/* Stay History */}
              <div className="bg-card p-5 rounded-lg border border-border shadow-sm">
                <h4 className="font-bold flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
                  <Clock className="w-5 h-5 text-primary" /> Stay History
                </h4>
                <div className="space-y-4">
                  {bookings
                    .filter(b => b.guestId === selectedGuest.id).sort((a,b) => new Date(b.checkIn).getTime() > new Date(a.checkIn).getTime() ? -1 : 1)
                    .map(b => {
                      const room = rooms.find(r => r.id === b.roomId);
                      return (
                        <div key={b.id} className="flex justify-between items-center text-sm border-l-2 border-primary pl-3 py-1">
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

      {/* Add/Edit Guest Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsFormOpen(false)}></div>
          <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-foreground">
                {editingGuest ? 'Edit Guest' : 'Add New Guest'}
              </h2>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder="Enter guest name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Phone *</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder="Phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">City</label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">State</label>
                  <input
                    type="text"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">ID Proof Type</label>
                  <select
                    value={formIdProofType}
                    onChange={(e) => setFormIdProofType(e.target.value as IDProofType)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                  >
                    <option value="Aadhaar">Aadhaar</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="PAN">PAN</option>
                    <option value="Driving Licence">Driving Licence</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">ID Number</label>
                  <input
                    type="text"
                    value={formIdProofNumber}
                    onChange={(e) => setFormIdProofNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground"
                    placeholder="ID proof number"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-background text-foreground resize-none"
                    placeholder="Any additional notes about the guest..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  {editingGuest ? 'Update Guest' : 'Add Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
