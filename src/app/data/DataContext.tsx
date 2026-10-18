import { apiFetch, ApiError } from '../lib/api';
import { readSnapshot, writeSnapshot, clearSnapshot } from '../lib/dataCache';
import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { generateId } from '../lib/utils';
import { Room, Guest, Booking, PaymentTransaction, CommRecord, User, ActivityLog, StandaloneInvoice, Expense, StoredInvoiceData } from './types';
import { 
  INITAL_ROOMS, 
  INITAL_GUESTS, 
  INITAL_BOOKINGS, 
  INITAL_PAYMENTS, 
  INITAL_COMMS 
} from './seedData';

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
  markAllRoomsAvailable: () => void;

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
  isPriorityLoading: boolean;
  isSecondaryLoading: boolean;
  isSyncing: boolean;
  syncStage: 'idle' | 'priority' | 'secondary' | 'syncing';
  syncProgressText: string;
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
const DESK_QUEUE_KEY = 'shardacrm_desk_queue';
const LOCAL_STORAGE_CACHE_KEY = 'shardacrm_cached_dataset';

function getDeskQueue(): { bookings: Booking[]; guests: Guest[] } {
  try {
    if (typeof window === 'undefined') return { bookings: [], guests: [] };
    const raw = localStorage.getItem(DESK_QUEUE_KEY);
    const data = raw ? JSON.parse(raw) : { bookings: [], guests: [] };
    const queueBookings: Booking[] = Array.isArray(data.bookings) ? data.bookings : [];
    const queueGuests: Guest[] = Array.isArray(data.guests) ? data.guests : [];

    // Automatically recover and reconcile any online reservations saved in 'sharda_my_bookings'
    const customerHistory = JSON.parse(localStorage.getItem('sharda_my_bookings') || '[]');
    if (Array.isArray(customerHistory) && customerHistory.length > 0) {
      let queueModified = false;
      for (const item of customerHistory) {
        const bId = item.refId || `SP-${Date.now().toString().slice(-6)}`;
        if (!queueBookings.some((b: any) => b.id === bId)) {
          const gId = `guest-${bId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
          const cat = item.roomCategory || item.category || 'Double Bed Room';
          const rId = cat === 'Family Bed Room' ? 'rm-103' : 'rm-101';
          const cIn = item.checkIn?.includes('T') ? item.checkIn : `${(item.checkIn || new Date().toISOString().split('T')[0])}T12:00:00`;
          const cOut = item.checkOut?.includes('T') ? item.checkOut : `${(item.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0])}T11:00:00`;
          const total = item.totalAmount || 1500;
          const paid = item.advanceFee || item.advanceAmount || 0;
          const bal = item.balanceDue ?? (total - paid);

          const newG: Guest = {
            id: gId,
            name: item.guestName || 'Online Guest',
            phone: item.guestPhone || '',
            email: item.guestEmail || '',
            city: item.guestAddress || 'Online Portal',
            state: 'Jharkhand',
            idProofType: 'Aadhaar',
            idProofNumber: '',
            totalStays: 1,
            lastStay: cIn,
            totalSpent: paid,
            isVIP: false,
            notes: item.specialRequests || '',
            avatarInitial: (item.guestName || 'G')[0].toUpperCase()
          };

          const newB: Booking = {
            id: bId,
            guestId: gId,
            roomId: rId,
            checkIn: cIn,
            checkOut: cOut,
            adults: item.adults || 1,
            children: item.children || 0,
            nights: item.nights || 1,
            subtotal: Math.round(total / 1.12),
            gst: total - Math.round(total / 1.12),
            total,
            paid,
            balance: bal,
            status: item.status || 'Booked',
            createdAt: item.createdAt || new Date().toISOString(),
            notes: item.specialRequests || '',
            source: 'Website'
          };

          queueBookings.unshift(newB);
          queueGuests.unshift(newG);
          queueModified = true;
        }
      }
      if (queueModified) {
        localStorage.setItem(DESK_QUEUE_KEY, JSON.stringify({ bookings: queueBookings, guests: queueGuests }));
      }
    }

    return { bookings: queueBookings, guests: queueGuests };
  } catch {
    return { bookings: [], guests: [] };
  }
}

function getCachedInitialData(): Partial<Dataset> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const cachedInit = useMemo(() => getCachedInitialData(), []);
  const initialDeskQueue = useMemo(() => getDeskQueue(), []);

  const [rooms, setRooms] = useState<Room[]>(() => {
    return cachedInit?.rooms?.length ? cachedInit.rooms : INITAL_ROOMS;
  });
  const [guests, setGuests] = useState<Guest[]>(() => {
    const base = cachedInit?.guests?.length ? cachedInit.guests : INITAL_GUESTS;
    return mergeById(base, initialDeskQueue.guests);
  });
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const base = cachedInit?.bookings?.length ? cachedInit.bookings : INITAL_BOOKINGS;
    return sortBookings(mergeById(base, initialDeskQueue.bookings));
  });
  const [payments, setPayments] = useState<PaymentTransaction[]>(() => {
    return cachedInit?.payments?.length ? cachedInit.payments : INITAL_PAYMENTS;
  });
  const [comms, setComms] = useState<CommRecord[]>(() => {
    return cachedInit?.comms?.length ? cachedInit.comms : INITAL_COMMS;
  });
  const [logs, setLogs] = useState<ActivityLog[]>(() => cachedInit?.logs || []);
  const [invoices, setInvoices] = useState<StandaloneInvoice[]>(() => cachedInit?.invoices || []);
  const [storedInvoices, setStoredInvoices] = useState<StoredInvoiceData[]>(() => cachedInit?.storedInvoices || []);
  const [expenses, setExpenses] = useState<Expense[]>(() => cachedInit?.expenses || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isPriorityLoading, setIsPriorityLoading] = useState(false);
  const [isSecondaryLoading, setIsSecondaryLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStage, setSyncStage] = useState<'idle' | 'priority' | 'secondary' | 'syncing'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const syncProgressText = useMemo(() => {
    if (isPriorityLoading) return 'Syncing reservations, rooms & revenue...';
    if (isSecondaryLoading) return 'Loading expenses, invoices & audit records...';
    if (isSyncing) return 'Checking live property updates...';
    return '';
  }, [isPriorityLoading, isSecondaryLoading, isSyncing]);

  /** Server cursor for incremental sync; null until a full load succeeds */
  const cursor = useRef<string | null>(null);
  const syncing = useRef<Promise<void> | null>(null);

  const applyPriority = (data: Partial<Dataset>) => {
    if (data.rooms) {
      const incomingRooms = data.rooms.filter(r => !['rm-201', 'rm-202', 'rm-203', '201', '202', '203'].includes(r.id) && r.status !== 'Coming Soon');
      const incomingIds = new Set(incomingRooms.map(r => r.id));
      const mergedRooms = [...incomingRooms];
      for (const initRoom of INITAL_ROOMS) {
        if (!incomingIds.has(initRoom.id)) mergedRooms.push(initRoom);
      }
      setRooms(mergedRooms);
    }

    const deskQueue = getDeskQueue();
    if (data.guests) {
      const baseGuests = data.guests.length > 0 ? data.guests : INITAL_GUESTS;
      setGuests(mergeById(baseGuests, deskQueue.guests));
    }
    if (data.bookings) {
      const baseBookings = data.bookings.length > 0 ? data.bookings : INITAL_BOOKINGS;
      setBookings(sortBookings(mergeById(baseBookings, deskQueue.bookings)));
    }
    if (data.payments) {
      setPayments(data.payments);
    }
  };

  const applySecondary = (data: Partial<Dataset>) => {
    if (data.comms) setComms(data.comms);
    if (data.logs) setLogs(data.logs);
    if (data.invoices) setInvoices(data.invoices);
    if (data.storedInvoices) setStoredInvoices(data.storedInvoices);
    if (data.expenses) setExpenses(data.expenses);
  };

  const applyFull = (data: Partial<Dataset>) => {
    applyPriority(data);
    applySecondary(data);
  };

  const applyDelta = (d: Partial<Dataset> & { deleted?: Record<string, string[]> }) => {
    const del = d.deleted || {};
    setRooms(prev => {
      const merged = mergeById(prev, d.rooms, del.rooms);
      const filtered = merged.filter(r => !['rm-201', 'rm-202', 'rm-203', '201', '202', '203'].includes(r.id) && r.status !== 'Coming Soon');
      const ids = new Set(filtered.map(r => r.id));
      for (const initRoom of INITAL_ROOMS) {
        if (!ids.has(initRoom.id)) filtered.push(initRoom);
      }
      return filtered;
    });

    const deskQueue = getDeskQueue();
    setGuests(prev => mergeById(mergeById(prev, d.guests, del.guests), deskQueue.guests));
    setBookings(prev => {
      const next = mergeById(mergeById(prev, d.bookings, del.bookings), deskQueue.bookings);
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

  const loadSequential = async (quiet = true) => {
    setIsSyncing(true);
    setIsPriorityLoading(true);
    setSyncStage('priority');

    // Launch BOTH network requests concurrently so secondary is already in-flight while priority hydrates
    const priorityPromise = apiFetch('/api/initialize?priority=1', {}, { quiet, timeoutMs: 25000 }).catch(err => {
      console.warn('Priority load note:', err);
      return null;
    });

    const secondaryPromise = apiFetch('/api/initialize?secondary=1', {}, { quiet, timeoutMs: 35000 }).catch(err => {
      console.warn('Secondary load note:', err);
      return null;
    });

    try {
      // Step 1: Priority load (Dashboard & Bookings First) - ultra-fast response
      const priority = await priorityPromise;
      if (priority) {
        applyPriority(priority);
        if (priority.serverTime) cursor.current = priority.serverTime;
        setLastSyncedAt(new Date());
        // Fast-track essential data to localStorage immediately for instant 0ms reload
        try {
          localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify({
            rooms: priority.rooms,
            guests: priority.guests,
            bookings: priority.bookings,
            payments: priority.payments
          }));
        } catch {}
      }
    } finally {
      setIsPriorityLoading(false);
      setIsSecondaryLoading(true);
      setSyncStage('secondary');
    }

    try {
      // Step 2: Background Secondary load (Invoices, Expenses, Comms, Logs)
      const secondary = await secondaryPromise;
      if (secondary) {
        applySecondary(secondary);
        if (secondary.serverTime) cursor.current = secondary.serverTime;
        setLastSyncedAt(new Date());
      }
    } finally {
      setIsSecondaryLoading(false);
      setIsSyncing(false);
      setSyncStage('idle');
    }
  };

  const loadFull = async (quiet = false) => {
    return loadSequential(quiet);
  };

  /**
   * Incremental refresh: only rows changed since the last sync (a few hundred
   * bytes when nothing changed, vs. the whole database for /api/initialize).
   * Concurrent callers share one request.
   */
  const syncNow = (quiet = true): Promise<void> => {
    if (syncing.current) return syncing.current;
    syncing.current = (async () => {
      setIsSyncing(true);
      setSyncStage('syncing');
      try {
        if (!cursor.current) return await loadFull(quiet);
        const delta = await apiFetch(`/api/sync?since=${encodeURIComponent(cursor.current)}`, {}, { quiet, timeoutMs: 10000 });
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
      } finally {
        setIsSyncing(false);
        setSyncStage('idle');
      }
    })().finally(() => { syncing.current = null; });
    return syncing.current;
  };

  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('token');
      const savedUserStr = localStorage.getItem('user');
      let localUser: User | null = null;
      if (savedUserStr) {
        try { localUser = JSON.parse(savedUserStr); } catch {}
      }

      if (!token) {
        clearSnapshot();
        setIsLoading(false);
        return;
      }

      if (localUser) {
        setUser(localUser);
      }

      // Render the last-known data immediately, then revalidate in the background
      const snap = await readSnapshot<Dataset, User>();
      if (snap?.user && snap.data) {
        applyFull(snap.data);
        setUser(snap.user);
        cursor.current = snap.serverTime;
        setIsLoading(false);
        apiFetch('/api/auth/verify', {}, { quiet: true, timeoutMs: 5000 })
          .then(res => { 
            if (res && res.user) {
              setUser(res.user);
              localStorage.setItem('user', JSON.stringify(res.user));
            }
          })
          .catch(() => {
            // Keep session alive even if network drops or cold server
          });
        syncNow(true);
        return;
      }

      // No cache: verify the token and fetch the dataset in parallel
      try {
        const [verifyRes] = await Promise.all([
          apiFetch('/api/auth/verify', {}, { quiet: true, timeoutMs: 5000 }).catch(() => null),
          loadFull(true).catch(err => console.error('Failed to load initial data', err))
        ]);
        if (verifyRes && verifyRes.user) {
          setUser(verifyRes.user);
          localStorage.setItem('user', JSON.stringify(verifyRes.user));
        } else if (localUser) {
          setUser(localUser);
        } else if (!token.startsWith('mock-token-')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch {
        if (!localUser && !token.startsWith('mock-token-')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    initApp();
  }, []);

  // Listen for real-time online booking submissions from the guest booking portal (same tab & cross-tab)
  useEffect(() => {
    const onNewBooking = (e: any) => {
      const { booking, guest } = e.detail || {};
      if (!booking) return;

      setBookings(prev => sortBookings([booking, ...prev.filter(b => b.id !== booking.id)]));
      if (guest) {
        setGuests(prev => [guest, ...prev.filter(g => g.id !== guest.id)]);
      }

      toast.info(`🔔 New Online Booking: ${guest?.name || 'Guest'} (${booking.id})`, {
        description: `Room ${booking.roomId.replace('rm-', '')} · Status: Booked (Pending Confirmation). Open Bookings to confirm.`,
        duration: 8000
      });
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === DESK_QUEUE_KEY || e.key === 'sharda_my_bookings') {
        const queue = getDeskQueue();
        if (queue.bookings && queue.bookings.length > 0) {
          setBookings(prev => sortBookings(mergeById(prev, queue.bookings)));
        }
        if (queue.guests && queue.guests.length > 0) {
          setGuests(prev => mergeById(prev, queue.guests));
        }
      }
    };

    window.addEventListener('shardacrm_new_booking', onNewBooking);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('shardacrm_new_booking', onNewBooking);
      window.removeEventListener('storage', onStorage);
    };
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
  // Persist the dataset for instant startup next time (both IndexedDB and synchronous localStorage)
  useEffect(() => {
    if (!user || isLoading) return;
    const t = setTimeout(() => {
      if (cursor.current) {
        writeSnapshot<Dataset, User>({
          userId: user.id,
          user,
          serverTime: cursor.current,
          data: { rooms, guests, bookings, payments, comms, logs, invoices, storedInvoices, expenses }
        });
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify({
          rooms, guests, bookings, payments
        }));
      } catch {}
    }, 1000);
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

  const login = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsLoading(false); // Immediate 0ms entry into the dashboard
    loadSequential(true).catch(err => console.warn('Initial server sync note:', err));
  };

  const refreshData = () => syncNow(true);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearSnapshot().catch(() => {});
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
    apiFetch(url, { method, headers: getHeaders(), body: body === undefined ? undefined : JSON.stringify(body) }, { quiet: true });

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

  const markAllRoomsAvailable = () => {
    // 1. Mark any active checked-in bookings as Checked-Out so auto-sync does not re-occupy rooms
    setBookings(prev => prev.map(b => b.status === 'Checked-In' ? { ...b, status: 'Checked-Out' as const } : b));
    // 2. Mark all rooms as Available
    setRooms(prev => prev.map(r => ({ ...r, status: 'Available' as const })));
    // 3. Send updates to backend for each room
    latest.current.rooms.forEach(r => {
      send(`/api/rooms/${r.id}`, 'PUT', { status: 'Available' }).catch(() => {});
    });
  };

  const addGuest = (guest: Guest) => {
    setGuests(prev => [guest, ...prev.filter(g => g.id !== guest.id)]);
    try {
      const raw = localStorage.getItem(DESK_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : { bookings: [], guests: [] };
      queue.guests = [guest, ...(queue.guests || []).filter((g: any) => g.id !== guest.id)];
      localStorage.setItem(DESK_QUEUE_KEY, JSON.stringify(queue));
    } catch {}
    send('/api/guests', 'POST', guest).catch(err => console.warn('addGuest server note:', err));
  };

  const updateGuest = (guest: Guest) => {
    setGuests(prev => prev.map(g => (g.id === guest.id ? guest : g)));
    try {
      const raw = localStorage.getItem(DESK_QUEUE_KEY);
      if (raw) {
        const queue = JSON.parse(raw);
        if (queue.guests) {
          queue.guests = queue.guests.map((g: any) => g.id === guest.id ? guest : g);
          localStorage.setItem(DESK_QUEUE_KEY, JSON.stringify(queue));
        }
      }
    } catch {}

    const previous = latest.current.guests.find(g => g.id === guest.id);
    const patch = diffFields(previous, guest);
    if (!Object.keys(patch).length) return;
    send(`/api/guests/${guest.id}`, 'PUT', patch).catch(err => console.warn('updateGuest server note:', err));
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => sortBookings([booking, ...prev.filter(b => b.id !== booking.id)]));
    try {
      const raw = localStorage.getItem(DESK_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : { bookings: [], guests: [] };
      queue.bookings = [booking, ...(queue.bookings || []).filter((b: any) => b.id !== booking.id)];
      localStorage.setItem(DESK_QUEUE_KEY, JSON.stringify(queue));
    } catch {}

    send('/api/bookings', 'POST', booking)
      .then(created => setBookings(prev => prev.map(b => (b.id === booking.id ? created : b))))
      .catch(err => console.warn('addBooking server note:', err));
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
    // 1. Instantly update CRM local state
    setBookings(prev => prev.map(b => (b.id === booking.id ? booking : b)));

    // 2. Persist to shared desk queue
    try {
      const raw = localStorage.getItem(DESK_QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : { bookings: [], guests: [] };
      if (!queue.bookings) queue.bookings = [];
      const idx = queue.bookings.findIndex((b: any) => b.id === booking.id);
      if (idx >= 0) {
        queue.bookings[idx] = booking;
      } else {
        queue.bookings.push(booking);
      }
      localStorage.setItem(DESK_QUEUE_KEY, JSON.stringify(queue));
    } catch {}

    // Also update sharda_my_bookings cache to reflect confirmation
    try {
      const history = JSON.parse(localStorage.getItem('sharda_my_bookings') || '[]');
      if (Array.isArray(history)) {
        const updated = history.map((h: any) => {
          if (h.refId === booking.id || h.id === booking.id) {
            return { ...h, status: booking.status };
          }
          return h;
        });
        localStorage.setItem('sharda_my_bookings', JSON.stringify(updated));
      }
    } catch {}

    // 3. Dispatch to server if connected
    const previous = latest.current.bookings.find(b => b.id === booking.id);
    const patch = diffFields(previous, booking);
    if (!Object.keys(patch).length) return;
    send(`/api/bookings/${booking.id}`, 'PUT', patch).catch(err => {
      console.warn('Backend update booking note:', err);
    });
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
    login, logout, refreshData, updateRoomStatus, markAllRoomsAvailable, addGuest, updateGuest, addBooking, updateBooking,
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
    isLoading, isPriorityLoading, isSecondaryLoading, isSyncing, syncStage, syncProgressText, lastSyncedAt
  }), [actions, user, rooms, roomById, guests, guestById, bookings, bookingById, payments, comms, logs, invoices, storedInvoices, expenses, isLoading, isPriorityLoading, isSecondaryLoading, isSyncing, syncStage, syncProgressText, lastSyncedAt]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
