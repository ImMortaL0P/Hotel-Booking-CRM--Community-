import { apiFetch } from '../lib/api';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, Guest, Booking, PaymentTransaction, CommRecord, User, ActivityLog, StandaloneInvoice } from './types';

interface DataContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  
  rooms: Room[];
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  
  guests: Guest[];
  addGuest: (guest: Guest) => void;
  updateGuest: (guest: Guest) => void;
  
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBooking: (booking: Booking) => void;
  deleteBooking: (bookingId: string) => void;
  
  payments: PaymentTransaction[];
  addPayment: (payment: PaymentTransaction) => void;
  
  comms: CommRecord[];
  addComm: (comm: CommRecord) => void;
  
  isLoading: boolean;
  logs: ActivityLog[];
  invoices: StandaloneInvoice[];
  addInvoice: (invoice: StandaloneInvoice) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LoadingScreen = () => {
  const [logIndex, setLogIndex] = React.useState(0);

  const logs = [
    "Connecting to ShardaCRM Platform...",
    "Render backend is sleeping. Sending wake-up signal...",
    "Container provisioning initialized...",
    "Starting Node.js + Express.js process...",
    "Establishing secure connection to MongoDB Atlas...",
    "Preparing collections for Rooms, Guests, and Bookings...",
    "Almost there! Sever is finalizing boot..."
  ];

  React.useEffect(() => {
    const intervals = [2500, 7000, 14000, 22000, 30000, 40000];
    const timeouts = intervals.map((time, idx) =>
      setTimeout(() => setLogIndex(idx + 1), time)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAF6F0] p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e6dfd8] flex flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 border-4 border-[#e6dfd8] rounded-full"></div>
          <div className="w-16 h-16 border-4 border-transparent border-t-[#7B1E22] rounded-full animate-spin"></div>
        </div>

        <h2 className="text-xl font-bold text-[#2d1b1c] mb-1 text-center">Starting ShardaCRM</h2>
        <p className="text-sm text-gray-500 mb-6 text-center">Connecting to environment</p>

        <div className="w-full bg-[#1e1e1e] rounded-lg p-4 font-mono text-[11px] md:text-xs text-gray-300 mt-2 min-h-[140px] items-end justify-end shadow-inner overflow-hidden flex flex-col">
          <div className="flex-1 w-full flex flex-col justify-end gap-1.5">
            {logs.slice(0, logIndex + 1).map((log, i) => (
              <div key={i} className={`flex items-start gap-2 ${i === logIndex ? 'text-green-400 font-semibold' : 'opacity-50'}`}>
                <span className="text-gray-500 shrink-0">{'>'}</span>
                <span className={i === logIndex ? 'animate-pulse' : ''}>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {logIndex > 0 && (
          <div className="mt-6 px-3 py-2 bg-amber-50 text-amber-800 text-[11px] rounded flex items-start gap-2 border border-amber-100">
            <span className="shrink-0 text-amber-500 text-lg leading-none">⚠</span>
            <p className="leading-tight">
              Since the backend runs on Render's free tier, it sleeps after inactivity. Cold starts may take up to 50 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [comms, setComms] = useState<CommRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [invoices, setInvoices] = useState<StandaloneInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/initialize')
      .then(data => {
        setRooms(data.rooms || []);
        setGuests(data.guests || []);
        setBookings(data.bookings || []);
        setPayments(data.payments || []);
        setComms(data.comms || []);
        setLogs(data.logs || []);
        setInvoices(data.invoices || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load initial data from Atlas', err);
        setIsLoading(false);
      });
  }, []);

  // Sync room statuses based on bookings automatically
  useEffect(() => {
    if (isLoading || rooms.length === 0) return;
    
    // Auto sync logic simplified
    setRooms(prevRooms => prevRooms.map(room => {
      const activeBooking = bookings.find(b => b.roomId === room.id && (b.status === 'Checked-In'));
      if (activeBooking) return { ...room, status: 'Occupied' as const };
            
      return { ...room, status: room.status === 'Occupied' ? 'Available' : room.status };
    }));
  }, [bookings, isLoading]); // only reruns when bookings change

  const login = (userData: User) => setUser(userData);
  const logout = () => setUser(null);

  // Helper to add user headers
  const getHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-id': user?.id || 'system',
      'x-user-name': user?.name || 'System Auto'
    };
  };

  const updateRoomStatus = (roomId: string, status: Room['status']) => {
        apiFetch(`/api/rooms/${roomId}`, {
       method: 'PUT',
       headers: getHeaders(),
       body: JSON.stringify({ status })
    }).then(updated => {
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r));
    }).catch(console.error);
  };

  const addGuest = (guest: Guest) => {
    apiFetch(`/api/guests`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(guest)
    }).then(created => {
       setGuests(prev => [created, ...prev]);
    }).catch(console.error);
  };

  const updateGuest = (guest: Guest) => {
    apiFetch(`/api/guests/${guest.id}`, {
       method: 'PUT',
       headers: getHeaders(),
       body: JSON.stringify(guest)
    }).then(updated => {
       setGuests(prev => prev.map(g => g.id === guest.id ? updated : g));
    }).catch(console.error);
  };

  const addBooking = (booking: Booking) => {
    apiFetch(`/api/bookings`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(booking)
    }).then(created => {
       setBookings(prev => [created, ...prev]);
    }).catch(console.error);
  };

  const updateBooking = (booking: Booking) => {
    apiFetch(`/api/bookings/${booking.id}`, {
       method: 'PUT',
       headers: getHeaders(),
       body: JSON.stringify(booking)
    }).then(updated => {
       setBookings(prev => prev.map(b => b.id === booking.id ? updated : b));
    }).catch(console.error);
  };

  const deleteBooking = (bookingId: string) => {
    apiFetch(`/api/bookings/${bookingId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(() => {
       setBookings(prev => prev.filter(b => b.id !== bookingId));
    }).catch(console.error);
  };

  const addPayment = (payment: PaymentTransaction) => {
    apiFetch(`/api/payments`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(payment)
    }).then((created) => {
      setPayments(prev => [created, ...prev]);
      const booking = bookings.find(b => b.id === payment.bookingId);
      if (booking) {
        const newPaid = booking.paid + payment.amount;
        const newBalance = booking.total - newPaid;
        updateBooking({ ...booking, paid: newPaid, balance: newBalance });

        const guest = guests.find(g => g.id === payment.guestId);
        if (guest) {
          updateGuest({ ...guest, totalSpent: guest.totalSpent + payment.amount });
        }
      }
    
    }).catch(console.error);
  };

  
  const addInvoice = (invoice: StandaloneInvoice) => {
    apiFetch(`/api/invoices`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(invoice)
    }).then(created => {
       setInvoices(prev => [created, ...prev]);
    }).catch(console.error);
  };

  const addComm = (comm: CommRecord) => {
    apiFetch(`/api/comms`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(comm)
    }).then(created => {
       setComms(prev => [created, ...prev]);
    }).catch(console.error);
  };

  return (
    <DataContext.Provider value={{
      user, login, logout,
      rooms, updateRoomStatus,
      guests, addGuest, updateGuest,
      bookings, addBooking, updateBooking, deleteBooking,
      payments, addPayment,
      comms, addComm, logs, invoices, addInvoice,
      isLoading
    }}>
      {isLoading ? <LoadingScreen /> : children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
