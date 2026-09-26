import { apiFetch, ApiError } from '../lib/api';
import { readSnapshot, writeSnapshot, clearSnapshot } from '../lib/dataCache';
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { generateId } from '../lib/utils';
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
  /** applyToBooking: false when the booking already includes this amount in `paid` */
  addPayment: (payment: PaymentTransaction, opts?: { applyToBooking?: boolean }) => void;

  comms: CommRecord[];
  addComm: (comm: CommRecord) => void;

  isLoading: boolean;
  /** Pull changes from the server now (incremental; e.g. after an email import) */
  refreshData: () => Promise<void>;
  /** When the data last came from the server; null while only cached data is shown */
  lastSyncedAt: Date | null;
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


type Dataset = {
  rooms: Room[];
  guests: Guest[];
  bookings: Booking[];
  payments: PaymentTransaction[];
  comms: CommRecord[];
  logs: ActivityLog[];
  invoices: StandaloneInvoice[];
  storedInvoices: StoredInvoiceData[];
  expenses: Expense[];
};
type Keyed = { id: string };

const sortBookings = (list: Booking[]) =>
  [...list].sort((a, b) => (b.checkIn || b.createdAt || '').localeCompare(a.checkIn || a.createdAt || ''));

/** Upsert `changed` and drop `deleted`; rows new to the list go first (newest-first lists). */
function mergeById<T extends Keyed>(prev: T[], changed: T[] = [], deleted: string[] = []): T[] {
  if (!changed.length && !deleted.length) return prev;
  const gone = new Set(deleted);
  const incoming = new Map(changed.map(x => [x.id, x]));
  const kept = prev.filter(x => !gone.has(x.id)).map(x => {
    const next = incoming.get(x.id);
    if (next) incoming.delete(x.id);
    return next ?? x;
  });
  return [...incoming.values(), ...kept];
}

/** Only the fields that differ, so an edit can't clobber concurrent server-side changes. */
function diffFields<T extends object>(current: T | undefined, next: T): Partial<T> {
  if (!current) return next;
  const patch: Partial<T> = {};
  for (const k of Object.keys(next) as (keyof T)[]) {
    if (JSON.stringify(current[k]) !== JSON.stringify(next[k])) patch[k] = next[k];
  }
  return patch;
}

const SYNC_INTERVAL_MS = 60_000;

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
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  /** Server cursor for incremental sync; null until a full load succeeds */
  const cursor = useRef<string | null>(null);
  const syncing = useRef<Promise<void> | null>(null);

  const applyFull = (data: Partial<Dataset>) => {
    setRooms(data.rooms || []);
    setGuests(data.guests || []);
    setBookings(sortBookings(data.bookings || []));
    setPayments(data.payments || []);
    setComms(data.comms || []);
    setLogs(data.logs || []);
    setInvoices(data.invoices || []);
    setStoredInvoices(data.storedInvoices || []);
    setExpenses(data.expenses || []);
  };

  const applyDelta = (d: Partial<Dataset> & { deleted?: Record<string, string[]> }) => {
    const del = d.deleted || {};
    setRooms(prev => mergeById(prev, d.rooms, del.rooms));
    setGuests(prev => mergeById(prev, d.guests, del.guests));
    setBookings(prev => {
      const next = mergeById(prev, d.bookings, del.bookings);
      return next === prev ? prev : sortBookings(next);
    });
    setPayments(prev => mergeById(prev, d.payments, del.payments));
    setComms(prev => mergeById(prev, d.comms, del.comms));
    setInvoices(prev => mergeById(prev, d.invoices, del.invoices));
    setStoredInvoices(prev => mergeById(prev as (StoredInvoiceData & Keyed)[], d.storedInvoices as (StoredInvoiceData & Keyed)[], del.storedInvoices));
    setExpenses(prev => mergeById(prev, d.expenses, del.expenses));
    if (d.logs?.length) {
      setLogs(prev => {
        // The server's copies supersede the optimistic LOG-LOCAL entries addLog() inserted
        const merged = mergeById(prev.filter(l => !l.id.startsWith('LOG-LOCAL-')), d.logs);
        return merged.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 100);
      });
    }
  };

  const loadFull = async (quiet = false) => {
    const data = await apiFetch('/api/initialize', {}, { quiet });
    applyFull(data);
    cursor.current = data.serverTime || null;
    setLastSyncedAt(new Date());
  };

  /**
   * Incremental refresh: only rows changed since the last sync (a few hundred
   * bytes when nothing changed, vs. the whole database for /api/initialize).
   * Concurrent callers share one request.
   */
  const syncNow = (quiet = true): Promise<void> => {
    if (syncing.current) return syncing.current;
    syncing.current = (async () => {
      try {
        if (!cursor.current) return await loadFull(quiet);
        const delta = await apiFetch(`/api/sync?since=${encodeURIComponent(cursor.current)}`, {}, { quiet });
        applyDelta(delta);
        cursor.current = delta.serverTime;
        setLastSyncedAt(new Date());
      } catch (err) {
        // Cursor older than the server's deletion log (or an old backend without /api/sync)
        if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
          await loadFull(quiet).catch(() => {});
        } else if (!quiet) {
          throw err;
        }
      }
    })().finally(() => { syncing.current = null; });
    return syncing.current;
  };

  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        clearSnapshot();
        setIsLoading(false);
        return;
      }

      // Render the last-known data immediately, then revalidate in the background
      const snap = await readSnapshot<Dataset, User>();
      if (snap?.user && snap.data) {
        applyFull(snap.data);
        setUser(snap.user);
        cursor.current = snap.serverTime;
        setIsLoading(false);
        apiFetch('/api/auth/verify', {}, { quiet: true })
          .then(res => { if (res.user) setUser(res.user); })
          .catch(() => {}); // a 401 is handled inside apiFetch (logs out)
        syncNow(true);
        return;
      }

      // No cache: verify the token and fetch the dataset in parallel
      try {
        const [verifyRes] = await Promise.all([
          apiFetch('/api/auth/verify'),
          loadFull().catch(err => console.error('Failed to load initial data', err))
        ]);
        if (verifyRes.user) setUser(verifyRes.user);
      } catch {
        localStorage.removeItem('token');
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  // Keep data fresh for everyone at the desk: poll while visible, and catch up
  // right away when the tab comes back or the connection returns.
  useEffect(() => {
    if (!user) return;
    const tick = () => { if (!document.hidden) syncNow(true); };
    const interval = setInterval(tick, SYNC_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', tick);
      window.removeEventListener('focus', tick);
    };
  }, [user?.id]);

  // Persist the dataset (debounced) for instant startup next time. Only data
  // changes trigger a write — an empty sync doesn't rewrite the whole snapshot;
  // a slightly older saved cursor just makes the next sync overlap a little.
  useEffect(() => {
    if (!user || isLoading || !cursor.current) return;
    const t = setTimeout(() => {
      writeSnapshot<Dataset, User>({
        userId: user.id,
        user,
        serverTime: cursor.current!,
        data: { rooms, guests, bookings, payments, comms, logs, invoices, storedInvoices, expenses }
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [user, isLoading, rooms, guests, bookings, payments, comms, logs, invoices, storedInvoices, expenses]);

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
  }, [bookings, rooms, isLoading]);

  const resetData = () => {
    applyFull({});
    cursor.current = null;
    setLastSyncedAt(null);
  };

  const login = async (userData: User, token: string) => {
    localStorage.setItem('token', token);
    await clearSnapshot(); // never show a previous user's cached data
    resetData();
    setUser(userData);
    setIsLoading(true);
    await loadFull().catch(err => console.error('Failed to load initial data', err));
    setIsLoading(false);
  };

  const refreshData = () => syncNow(true);

  const logout = () => {
    localStorage.removeItem('token');
    clearSnapshot();
    resetData();
    setUser(null);
  };

  // Latest state for the stable callbacks below (they're created once, so they
  // must not close over a stale render's user/bookings/guests).
  const latest = useRef({ user, bookings, guests, rooms });
  latest.current = { user, bookings, guests, rooms };

  // Helper to add user headers
  const getHeaders = () => {
    const u = latest.current.user;
    return {
      'Content-Type': 'application/json',
      'x-user-id': u?.id || 'system',
      'x-user-name': u?.name || 'System Auto'
    };
  };

  const send = (url: string, method: string, body?: unknown) =>
    apiFetch(url, { method, headers: getHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });

  type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

  /**
   * Optimistic helpers: the UI updates immediately (no waiting on a sleepy
   * backend), the server's version replaces it on success, and the change is
   * rolled back if the request fails (apiFetch shows the error toast).
   */
  const optimisticAdd = <T extends Keyed>(set: Setter<T>, item: T, request: Promise<T>) => {
    set(prev => [item, ...prev.filter(x => x.id !== item.id)]);
    request
      .then(created => set(prev => prev.map(x => (x.id === item.id ? created : x))))
      .catch(err => {
        console.error(err);
        set(prev => prev.filter(x => x.id !== item.id));
      });
  };

  const optimisticUpdate = <T extends Keyed>(set: Setter<T>, previous: T | undefined, next: T, request: Promise<T>) => {
    set(prev => prev.map(x => (x.id === next.id ? { ...x, ...next } : x)));
    request
      .then(updated => set(prev => prev.map(x => (x.id === next.id ? updated : x))))
      .catch(err => {
        console.error(err);
        if (previous) set(prev => prev.map(x => (x.id === next.id ? previous : x)));
      });
  };

  const optimisticRemove = <T extends Keyed>(set: Setter<T>, id: string, request: Promise<unknown>) => {
    let removed: T | undefined;
    set(prev => {
      removed = prev.find(x => x.id === id);
      return prev.filter(x => x.id !== id);
    });
    request.catch(err => {
      console.error(err);
      if (removed) set(prev => [removed!, ...prev]);
    });
  };

  const updateRoomStatus = (roomId: string, status: Room['status']) => {
    const previous = latest.current.rooms.find(r => r.id === roomId);
    if (!previous) return;
    optimisticUpdate(setRooms, previous, { ...previous, status }, send(`/api/rooms/${roomId}`, 'PUT', { status }));
  };

  const addGuest = (guest: Guest) => {
    optimisticAdd(setGuests, guest, send('/api/guests', 'POST', guest));
  };

  const updateGuest = (guest: Guest) => {
    const previous = latest.current.guests.find(g => g.id === guest.id);
    const patch = diffFields(previous, guest);
    if (!Object.keys(patch).length) return;
    optimisticUpdate(setGuests, previous, guest, send(`/api/guests/${guest.id}`, 'PUT', patch));
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => sortBookings([booking, ...prev.filter(b => b.id !== booking.id)]));
    send('/api/bookings', 'POST', booking)
      .then(created => setBookings(prev => prev.map(b => (b.id === booking.id ? created : b))))
      .catch(err => {
        console.error(err);
        setBookings(prev => prev.filter(b => b.id !== booking.id));
      });
  };

  const addLog = async (action: string, details: string) => {
    try {
      await send('/api/logs', 'POST', { action, details });
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
    const previous = latest.current.bookings.find(b => b.id === booking.id);
    const patch = diffFields(previous, booking);
    if (!Object.keys(patch).length) return;
    optimisticUpdate(setBookings, previous, booking, send(`/api/bookings/${booking.id}`, 'PUT', patch));
  };

  const deleteBooking = (bookingId: string) => {
    optimisticRemove(setBookings, bookingId, send(`/api/bookings/${bookingId}`, 'DELETE'));
  };

  const confirmChannelBooking = (bookingId: string) => {
    send(`/api/bookings/${bookingId}/confirm-channel`, 'POST')
      .then(updated => setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b))))
      .catch(console.error);
  };

  const rejectChannelBooking = (bookingId: string) => {
    send(`/api/bookings/${bookingId}/reject-channel`, 'POST')
      .then(updated => setBookings(prev => prev.map(b => (b.id === bookingId ? updated : b))))
      .catch(console.error);
  };

  const addPayment = (payment: PaymentTransaction, { applyToBooking = true }: { applyToBooking?: boolean } = {}) => {
    setPayments(prev => [payment, ...prev.filter(p => p.id !== payment.id)]);
    send('/api/payments', 'POST', { ...payment, applyToBooking })
      .then(res => {
        const { booking, guest, ...created } = res;
        setPayments(prev => prev.map(p => (p.id === payment.id ? created : p)));
        // The server applies the payment to the booking balance and guest LTV in
        // the same request and returns both.
        if (booking) setBookings(prev => prev.map(b => (b.id === booking.id ? booking : b)));
        if (guest) setGuests(prev => prev.map(g => (g.id === guest.id ? guest : g)));

        // Older backend (no `booking` key in the response): apply client-side as before
        if (!('booking' in res) && applyToBooking) {
          const b = latest.current.bookings.find(x => x.id === payment.bookingId);
          if (b) updateBooking({ ...b, paid: b.paid + payment.amount, balance: b.total - (b.paid + payment.amount) });
          const g = latest.current.guests.find(x => x.id === payment.guestId);
          if (g) updateGuest({ ...g, totalSpent: g.totalSpent + payment.amount });
        }
      })
      .catch(err => {
        console.error(err);
        setPayments(prev => prev.filter(p => p.id !== payment.id));
      });
  };

  const addInvoice = (invoice: StandaloneInvoice) => {
    optimisticAdd(setInvoices, invoice, send('/api/invoices', 'POST', invoice));
  };

  const addStoredInvoice = (storedInvoice: StoredInvoiceData) => {
    const item = { ...storedInvoice, id: storedInvoice.id || storedInvoice.invoiceId } as StoredInvoiceData & Keyed;
    optimisticAdd(setStoredInvoices as Setter<StoredInvoiceData & Keyed>, item, send('/api/stored-invoices', 'POST', storedInvoice));
  };

  const addComm = (comm: CommRecord) => {
    // The Communications page passes { channel, recipientId, templateName, status }
    const c = comm as CommRecord & { recipientId?: string; templateName?: string };
    const item = {
      ...c,
      id: c.id || generateId('COMM'),
      guestId: c.guestId || c.recipientId || '',
      recipientId: c.recipientId || c.guestId,
      template: c.template || c.templateName || '',
      templateName: c.templateName || c.template,
      timestamp: c.timestamp || new Date().toISOString()
    } as CommRecord;
    optimisticAdd(setComms, item, send('/api/comms', 'POST', item));
  };

  const addExpense = (expense: Expense) => {
    optimisticAdd(setExpenses, expense, send('/api/expenses', 'POST', expense));
  };

  const deleteExpense = (expenseId: string) => {
    optimisticRemove(setExpenses, expenseId, send(`/api/expenses/${expenseId}`, 'DELETE'));
  };

  const roomById = useMemo(() => new Map(rooms.map(r => [r.id, r])), [rooms]);
  const guestById = useMemo(() => new Map(guests.map(g => [g.id, g])), [guests]);
  const bookingById = useMemo(() => new Map(bookings.map(b => [b.id, b])), [bookings]);

  // Action callbacks only touch setters, refs and `latest`, so one stable set is enough.
  const actions = useRef({
    login, logout, refreshData, updateRoomStatus, addGuest, updateGuest, addBooking, updateBooking,
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
    isLoading, lastSyncedAt
  }), [actions, user, rooms, roomById, guests, guestById, bookings, bookingById, payments, comms, logs, invoices, storedInvoices, expenses, isLoading, lastSyncedAt]);

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
