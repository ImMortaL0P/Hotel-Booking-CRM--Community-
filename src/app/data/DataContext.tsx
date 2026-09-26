import { apiFetch } from '../lib/api';
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Room, Guest, Booking, PaymentTransaction, CommRecord, User, ActivityLog, StandaloneInvoice, Expense, StoredInvoiceData } from './types';

interface DataContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;

  rooms: Room[];
  /** O(1) id lookups — prefer these over `.find()` inside render loops. */
  roomById: Map<string, Room>;
  guestById: Map<string, Guest>;
  bookingById: Map<string, Booking>;
  updateRoomStatus: (roomId: string, status: Room['status']) => void;

  guests: Guest[];
  addGuest: (guest: Guest) => void;
  updateGuest: (guest: Guest) => void;

  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBooking: (booking: Booking) => void;
  deleteBooking: (bookingId: string) => void;
  confirmChannelBooking: (bookingId: string) => void;
  rejectChannelBooking: (bookingId: string) => void;

  payments: PaymentTransaction[];
  addPayment: (payment: PaymentTransaction) => void;

  comms: CommRecord[];
  addComm: (comm: CommRecord) => void;

  isLoading: boolean;
  logs: ActivityLog[];
  addLog: (action: string, details: string) => Promise<void>;
  invoices: StandaloneInvoice[];
  addInvoice: (invoice: StandaloneInvoice) => void;

  storedInvoices: StoredInvoiceData[];
  addStoredInvoice: (storedInvoice: StoredInvoiceData) => void;

  expenses: Expense[];
  addExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const LoadingScreen = () => {
  const [logIndex, setLogIndex] = React.useState(0);

  const logs = [
    "Connecting to ShardaCRM Platform...",
    "Render backend is sleeping. Sending wake-up signal...",
    "Container provisioning initialized (this may take up to 60s)...",
    "Starting Node.js + Express.js process...",
    "Establishing secure connection to MongoDB Atlas...",
    "Preparing collections for Rooms, Guests, and Bookings...",
    "Verifying Google Drive integration tokens...",
    "Almost there! Server is finalizing boot..."
  ];

  React.useEffect(() => {
    const intervals = [2500, 8000, 18000, 28000, 40000, 52000, 65000];
    const timeouts = intervals.map((time, idx) =>
      setTimeout(() => setLogIndex(idx + 1), time)
    );
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border flex flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 border-4 border-border rounded-full"></div>
          <div className="w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>

        <h2 className="text-xl font-bold text-[#2d1b1c] mb-1 text-center">Starting ShardaCRM</h2>
        <p className="text-sm text-muted-foreground mb-6 text-center">Connecting to environment</p>

        <div className="w-full bg-[#1e1e1e] rounded-lg p-4 font-mono text-[11px] md:text-xs text-gray-300 mt-2 min-h-[140px] items-end justify-end shadow-inner overflow-hidden flex flex-col">
          <div className="flex-1 w-full flex flex-col justify-end gap-1.5">
            {logs.slice(0, logIndex + 1).map((log, i) => (
              <div key={i} className={`flex items-start gap-2 ${i === logIndex ? 'text-green-400 font-semibold' : 'opacity-50'}`}>
                <span className="text-muted-foreground shrink-0">{'>'}</span>
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
  const [storedInvoices, setStoredInvoices] = useState<StoredInvoiceData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadInitialData = async () => {
    try {
      const data = await apiFetch('/api/initialize');
      setRooms(data.rooms || []);
      setGuests(data.guests || []);
      setBookings((data.bookings || []).sort((a: any, b: any) => (b.checkIn || b.createdAt || '').localeCompare(a.checkIn || a.createdAt || '')));
      setPayments(data.payments || []);
      setComms(data.comms || []);
      setLogs(data.logs || []);
      setInvoices(data.invoices || []);
      setStoredInvoices(data.storedInvoices || []);
      setExpenses(data.expenses || []);
    } catch (err) {
      console.error('Failed to load initial data from Atlas', err);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Verify the token and fetch the dataset in parallel: saves a full
          // round trip on every page load (and on Render cold starts).
          const dataPromise = loadInitialData(); // never rejects
          try {
            const [verifyRes] = await Promise.all([apiFetch('/api/auth/verify'), dataPromise]);
            if (verifyRes.user) setUser(verifyRes.user);
          } catch (e) {
            localStorage.removeItem('token');
          }
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  // Sync room statuses based on bookings automatically
  useEffect(() => {
    if (isLoading || rooms.length === 0) return;

    const occupiedRoomIds = new Set<string>();
    for (const b of bookings) if (b.status === 'Checked-In') occupiedRoomIds.add(b.roomId);

    // Only produce a new array (and re-render consumers) when a status actually changes
    setRooms(prevRooms => {
      let changed = false;
      const next = prevRooms.map(room => {
        const status: Room['status'] = occupiedRoomIds.has(room.id)
          ? 'Occupied'
          : room.status === 'Occupied' ? 'Available' : room.status;
        if (status === room.status) return room;
        changed = true;
        return { ...room, status };
      });
      return changed ? next : prevRooms;
    });
  }, [bookings, isLoading]); // only reruns when bookings change

  const login = async (userData: User, token: string) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsLoading(true);
    await loadInitialData();
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Latest state for the stable callbacks below (they're created once, so they
  // must not close over a stale render's user/bookings/guests).
  const latest = useRef({ user, bookings, guests });
  latest.current = { user, bookings, guests };

  // Helper to add user headers
  const getHeaders = () => {
    const u = latest.current.user;
    return {
      'Content-Type': 'application/json',
      'x-user-id': u?.id || 'system',
      'x-user-name': u?.name || 'System Auto'
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

  const addLog = async (action: string, details: string) => {
    try {
      await apiFetch('/api/logs', {
        method: 'POST',
        headers: getHeaders(), // Needed for Authorization token
        body: JSON.stringify({ action, details })
      });
      const u = latest.current.user;
      setLogs(prev => [{
        id: `LOG-LOCAL-${Date.now()}`,
        action,
        details,
        userId: u?.id || 'system',
        userName: u?.name || 'System Auto',
        timestamp: new Date().toISOString()
      } as ActivityLog, ...prev]);
    } catch(err) {
      console.error('Failed to log action', err);
    }
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

  const confirmChannelBooking = (bookingId: string) => {
    apiFetch(`/api/bookings/${bookingId}/confirm-channel`, {
      method: 'POST',
      headers: getHeaders()
    }).then(updated => {
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    }).catch(console.error);
  };

  const rejectChannelBooking = (bookingId: string) => {
    apiFetch(`/api/bookings/${bookingId}/reject-channel`, {
      method: 'POST',
      headers: getHeaders()
    }).then(updated => {
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    }).catch(console.error);
  };

  const addPayment = (payment: PaymentTransaction) => {
    apiFetch(`/api/payments`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(payment)
    }).then((created) => {
      setPayments(prev => [created, ...prev]);
      const { bookings, guests } = latest.current;
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

  const addStoredInvoice = (storedInvoice: StoredInvoiceData) => {
    apiFetch(`/api/stored-invoices`, {
       method: 'POST',
       headers: getHeaders(),
       body: JSON.stringify(storedInvoice)
    }).then(created => {
       setStoredInvoices(prev => [created, ...prev]);
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

  const addExpense = (expense: Expense) => {
    apiFetch(`/api/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense)
    }).then(created => {
      setExpenses(prev => [created, ...prev]);
    }).catch(console.error);
  };

  const deleteExpense = (expenseId: string) => {
    apiFetch(`/api/expenses/${expenseId}`, {
      method: 'DELETE',
      headers: getHeaders()
    }).then(() => {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }).catch(console.error);
  };

  const roomById = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const bookingById = useMemo(() => new Map(bookings.map(b => [b.id, b])), [bookings]);

  // Action callbacks only touch setters + `latest`, so one stable set is enough.
  const actions = useRef({
    login, logout, updateRoomStatus, addGuest, updateGuest, addBooking, updateBooking,
    deleteBooking, confirmChannelBooking, rejectChannelBooking, addPayment, addComm,
    addLog, addInvoice, addStoredInvoice, addExpense, deleteExpense
  }).current;

  const value = useMemo<DataContextType>(() => ({
    ...actions,
    user,
    rooms, roomById,
    guests, guestById,
    bookings, bookingById,
    payments, comms, logs, invoices, storedInvoices, expenses,
    isLoading
  }), [actions, user, rooms, roomById, guests, guestById, bookings, bookingById, payments, comms, logs, invoices, storedInvoices, expenses, isLoading]);

  return (
    <DataContext.Provider value={value}>
      {isLoading ? <LoadingScreen /> : children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
