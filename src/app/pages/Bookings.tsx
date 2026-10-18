import { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate, generateId } from '../lib/utils';
import { BookingStatus, Booking } from '../data/types';
import { Search, Plus, MoreHorizontal, FileText, CheckCircle2, ChevronRight, X, CreditCard, Download, Share2, SlidersHorizontal, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { NewBookingModal } from '../components/NewBookingModal';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import { PaymentModal } from '../components/PaymentModal';
import { PublicRateSettingsModal } from '../components/PublicRateSettingsModal';
import { PaymentMode } from '../data/types';
import { exportToCsv } from '../lib/exportCsv';
import { useProgressiveList } from '../lib/useProgressiveList';

export function Bookings() {
  const { bookings, guestById, roomById, updateBooking, deleteBooking, addPayment, confirmChannelBooking, rejectChannelBooking, addLog, user, isSyncing } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('status') as BookingStatus | 'All') || 'All';
  const urlSearch = searchParams.get('search') || '';
  // The input is driven by local state: binding it straight to the URL made
  // every keystroke a (transition-wrapped) navigation, so fast typing dropped
  // characters. The URL is kept in sync below.
  const [search, setSearchInput] = useState(urlSearch);

  const setActiveTab = (tab: BookingStatus | 'All') => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'All') params.delete('status');
    else params.set('status', tab);
    setSearchParams(params);
  };

  const lastPushedSearch = useRef(urlSearch);

  // External URL changes (command palette, back button) → input. Our own
  // debounced writes echo back here too; ignore those so they can't clobber
  // characters typed since.
  useEffect(() => {
    if (urlSearch === lastPushedSearch.current) return;
    lastPushedSearch.current = urlSearch;
    setSearchInput(urlSearch);
  }, [urlSearch]);

  // Input → URL (debounced; replace so typing doesn't add history entries)
  useEffect(() => {
    if (search === lastPushedSearch.current) return;
    const t = setTimeout(() => {
      lastPushedSearch.current = search;
      setSearchParams(prev => {
        const params = new URLSearchParams(prev);
        if (!search) params.delete('search');
        else params.set('search', search);
        return params;
      }, { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [search, setSearchParams]);

  const setSearch = setSearchInput;

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
  const [isRateSettingsOpen, setIsRateSettingsOpen] = useState(false);

  const tabs: (BookingStatus | 'All')[] = ['All', 'Booked', 'Confirmed', 'Checked-In', 'Checked-Out'];

  // Filtering runs on a deferred copy of the query so the input stays responsive
  const deferredSearch = useDeferredValue(search);
  const filteredBookings = useMemo(() => bookings
    .filter(b => {
      if (activeTab !== 'All' && b.status !== activeTab) return false;
      if (deferredSearch) {
        const g = guestById.get(b.guestId);
        const r = roomById.get(b.roomId);
        const query = deferredSearch.toLowerCase();
        if (!b.id.toLowerCase().includes(query) &&
            (!g || !g.name.toLowerCase().includes(query)) &&
            (!g || !g.phone.includes(query)) &&
            (!r || !r.number.includes(query))) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => (b.checkIn || b.createdAt || '').localeCompare(a.checkIn || a.createdAt || '')),
    [bookings, guestById, roomById, activeTab, deferredSearch]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookings) counts[b.status] = (counts[b.status] || 0) + 1;
    return counts;
  }, [bookings]);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Checked-In': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25';
      case 'Confirmed': return 'bg-secondary text-foreground border border-border';
      case 'Booked': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25';
      case 'Checked-Out': return 'bg-muted text-muted-foreground border border-border';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const handleAction = (b: Booking, action: string) => {
    if (action === 'Check-in' && b.status !== 'Checked-In') {
      updateBooking({ ...b, status: 'Checked-In' });
    } else if (action === 'Check-out') {
      updateBooking({ ...b, status: 'Checked-Out' });
    } else if (action === 'Record Payment') {
      setPaymentModalBooking(b);
    }
  };

  // Memoized so a keystroke's urgent render (input update) reuses the rows;
  // they're only rebuilt when the deferred filter result changes.
  const { visible: visibleBookings, hasMore, remaining, sentinelRef } = useProgressiveList(filteredBookings, `${activeTab}|${deferredSearch}`);

  const tableRows = useMemo(() => visibleBookings.map(b => {
    const guest = guestById.get(b.guestId);
    const room = roomById.get(b.roomId);
    return (
      <tr key={b.id} className="hover:bg-muted/50 group cursor-pointer" onClick={() => setSelectedBooking(b)}>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}><input type="checkbox" className="rounded" /></td>
        <td className="px-4 py-3 font-medium text-primary hover:underline">{b.id}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{guest?.name}</p>
          <p className="text-xs text-muted-foreground">{guest?.phone}</p>
        </td>
        <td className="px-4 py-3">
          {b.source && b.source !== 'Direct' ? (
            <div>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-medium">
                {b.source}
              </span>
              {b.channelBookingId && (
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">#{b.channelBookingId}</p>
              )}
              {b.bookedBy && (
                <p className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={b.bookedBy}>{b.bookedBy}</p>
              )}
              {b.bookerCountry && (
                <p className="text-[10px] text-muted-foreground uppercase">{b.bookerCountry}</p>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Direct</span>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="text-foreground">Room {room?.number}</p>
          <p className="text-xs text-muted-foreground">{room?.category}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-foreground">{formatDate(b.checkIn)}</p>
          <p className="text-xs text-muted-foreground">to {formatDate(b.checkOut)} ({b.nights}N)</p>
          {b.checkInTime && (
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5" title={`Checked in at ${new Date(b.checkInTime).toLocaleString()}`}>
              In: {new Date(b.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {b.checkOutTime && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono" title={`Checked out at ${new Date(b.checkOutTime).toLocaleString()}`}>
              Out: {new Date(b.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </td>
        <td className="px-4 py-3 text-right font-medium text-foreground">
          {formatCurrency(b.total)}
        </td>
        <td className="px-4 py-3 text-right">
          {(b.commission && b.commission > 0) ? (
            <span className="text-xs text-orange-600 font-medium">{formatCurrency(b.commission)}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {b.balance > 0 ? (
            <span className="text-red-600 font-medium">{formatCurrency(b.balance)}</span>
          ) : (
            <span className="text-muted-foreground/80">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1 items-start">
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md ${getStatusColor(b.status)}`}>
              {b.status}
            </span>
            {b.channelStatus === 'pending_confirmation' && (
              <div className="flex gap-1 mt-1 z-10" onClick={e => e.stopPropagation()}>
                <button onClick={() => confirmChannelBooking(b.id)} className="text-[10px] bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">Confirm</button>
                <button onClick={() => rejectChannelBooking(b.id)} className="text-[10px] bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">Reject</button>
              </div>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete reservation ${b.id}?`)) {
                  deleteBooking(b.id);
                  toast.success(`Booking ${b.id} deleted`);
                }
              }}
              className="p-1.5 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              title="Delete Booking"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="relative inline-block text-left">
              <button className="p-1 text-muted-foreground/80 hover:text-primary cursor-pointer">
                <MoreHorizontal className="w-5 h-5" />
              </button>
              
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible z-20 transition-all p-1">
                <button onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }} className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-secondary rounded-lg cursor-pointer">View Details</button>
                {b.status === 'Confirmed' && <button onClick={(e) => { e.stopPropagation(); handleAction(b,'Check-in'); }} className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-500/10 rounded-lg cursor-pointer">Check In</button>}
                {b.status === 'Checked-In' && <button onClick={(e) => { e.stopPropagation(); handleAction(b,'Check-out'); }} className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-muted rounded-lg cursor-pointer">Check Out</button>}
                {b.balance > 0 && <button onClick={(e) => { e.stopPropagation(); handleAction(b,'Record Payment'); }} className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-secondary rounded-lg cursor-pointer">Record Payment</button>}
                <button onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete reservation ${b.id}?`)) {
                    deleteBooking(b.id);
                    toast.success(`Booking ${b.id} deleted`);
                  }
                }} className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-1.5 font-semibold cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Booking
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    )
  }), [visibleBookings, guestById, roomById]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
            {isSyncing && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                <span>Syncing live...</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {bookings.length} total bookings · Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              const exportData = filteredBookings.map(b => {
                const guest = guestById.get(b.guestId);
                const room = roomById.get(b.roomId);
                return {
                  ID: b.id,
                  Guest: guest?.name || 'Unknown',
                  Phone: guest?.phone || 'Unknown',
                  Room: room ? `Room ${room.number}` : 'Unknown',
                  CheckIn: b.checkIn,
                  CheckOut: b.checkOut,
                  Status: b.status,
                  Total: b.total,
                  Paid: b.paid,
                  Balance: b.balance
                };
              });
              exportToCsv('bookings_export', exportData);
              addLog('File Download', 'Exported Bookings list to CSV');
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground border border-border px-3 sm:px-4 py-2 rounded-full font-medium hover:bg-muted transition-colors text-xs sm:text-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => {
              const link = `${window.location.origin}/book`;
              navigator.clipboard.writeText(link);
              toast.success(`Guest Booking Link copied! Share this with customers: ${link}`);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground border border-border px-3 sm:px-3.5 py-2 rounded-full font-medium hover:bg-muted transition-colors text-xs sm:text-sm cursor-pointer font-mono whitespace-nowrap"
            title="Copy guest booking form link to clipboard"
          >
            <Share2 className="w-3.5 h-3.5 text-primary" /> Guest Link
          </button>
          <button
            onClick={() => setIsRateSettingsOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground border border-border px-3 sm:px-3.5 py-2 rounded-full font-medium hover:bg-muted transition-colors text-xs sm:text-sm cursor-pointer font-mono whitespace-nowrap"
            title="Super Admin: Update room rates on the public booking page (/book)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" /> Rates
          </button>
          <button
            onClick={() => setIsNewBookingOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold hover:opacity-90 transition-opacity text-xs sm:text-sm cursor-pointer whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" /> New Booking
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1 bg-card border border-border rounded-lg overflow-x-auto -mx-1 sm:mx-0 px-1 sm:px-1">
        {tabs.map(tab => {
          const count = tab === 'All' ? bookings.length : (statusCounts[tab] || 0);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === tab ? 'bg-foreground text-background font-semibold shadow-none' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <span>{tab}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                activeTab === tab ? 'bg-background/20 text-background border-transparent' : 'bg-secondary text-muted-foreground border-border'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-card p-3 sm:p-4 rounded-t-xl border border-border border-b-0 shrink-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80" />
          <input 
            type="text" 
            placeholder="Search by guest, ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Showing {filteredBookings.length} results
        </div>
      </div>

      {/* Table */}
      <div 
        data-lenis-prevent
        onWheel={(e) => e.stopPropagation()}
        className="bg-card border text-sm border-border rounded-b-xl overflow-y-auto overflow-x-auto overscroll-contain flex-1 min-h-[350px] max-h-[calc(100vh-270px)]"
        style={{ overscrollBehavior: 'contain' }}
      >
        <table className="w-full min-w-[850px] text-left whitespace-nowrap">
          <thead className="bg-secondary sticky top-0 z-10">
            <tr className="border-b border-border text-xs font-semibold text-foreground">
              <th className="px-4 py-3"><input type="checkbox" className="rounded" /></th>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Guest & Phone</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Check In/Out</th>
              <th className="px-4 py-3 text-right">Total (₹)</th>
              <th className="px-4 py-3 text-right">Commission</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {tableRows}
            {hasMore && (
              <tr ref={sentinelRef}>
                <td colSpan={11} className="px-4 py-4 text-center text-xs text-muted-foreground">Loading {remaining} more…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <NewBookingModal isOpen={isNewBookingOpen} onClose={() => setIsNewBookingOpen(false)} />
      <PublicRateSettingsModal isOpen={isRateSettingsOpen} onClose={() => setIsRateSettingsOpen(false)} />

      {/* Booking Detail Drawer overlay */}
      <BookingDetailDrawer booking={selectedBooking} isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} />
      <PaymentModal 
        isOpen={!!paymentModalBooking} 
        onClose={() => setPaymentModalBooking(null)}
        defaultAmount={paymentModalBooking?.balance || 0}
        onSubmit={(amount, mode: PaymentMode) => {
          if (paymentModalBooking) {
            addPayment({
              id: generateId('RCPT'),
              bookingId: paymentModalBooking.id,
              guestId: paymentModalBooking.guestId,
              date: new Date().toISOString().split('T')[0],
              mode,
              amount,
              status: 'Completed'
            }); // the server applies it to the booking balance and returns the updated booking
          }
        }}
      />
    </div>
  );
}
