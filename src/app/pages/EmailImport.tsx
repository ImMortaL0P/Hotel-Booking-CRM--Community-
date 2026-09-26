import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Mail, RefreshCw, Plus, Inbox, CheckCircle2, PencilLine, XCircle, Copy, AlertTriangle, MinusCircle,
  Ban, ChevronDown, ChevronRight, CalendarDays, RotateCcw, Info
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useData } from '../data/DataContext';
import { formatCurrency } from '../lib/utils';

type ImportStatus = 'imported' | 'updated' | 'cancelled' | 'duplicate' | 'needs_review' | 'ignored' | 'failed';

interface ParsedEmailBooking {
  action: 'NEW' | 'MODIFY' | 'CANCEL';
  source: string;
  channelBookingId?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  rooms: number;
  roomType?: string;
  roomCategory?: string;
  totalAmount?: number;
  commission?: number;
  prepaid: boolean;
  specialRequests?: string;
}

interface ImportRecord {
  id: string;
  provider: string;
  from: string;
  subject: string;
  receivedAt: string;
  status: ImportStatus;
  action: ParsedEmailBooking['action'] | null;
  source: string | null;
  channelBookingId: string | null;
  bookingIds: string[];
  message: string;
  parsed: ParsedEmailBooking | null;
  rawText: string;
  processedAt: string;
}

interface StatusResponse {
  provider: { id: string; label: string; isDummy: boolean };
  autoSyncMinutes: number;
  lastSync: { finishedAt: string; fetched: number; newMessages: number; counts: Partial<Record<ImportStatus, number>>; error?: string } | null;
  counts: Partial<Record<ImportStatus, number>>;
  records: ImportRecord[];
}

const STATUS_META: Record<ImportStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  imported: { label: 'Imported', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
  updated: { label: 'Updated', icon: PencilLine, className: 'bg-blue-100 text-blue-700 border-blue-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, className: 'bg-muted text-foreground/80 border-border' },
  needs_review: { label: 'Needs review', icon: AlertTriangle, className: 'bg-amber-100 text-amber-800 border-amber-200' },
  duplicate: { label: 'Duplicate', icon: Copy, className: 'bg-muted text-muted-foreground border-border' },
  ignored: { label: 'Not a booking', icon: MinusCircle, className: 'bg-muted text-muted-foreground border-border' },
  failed: { label: 'Failed', icon: Ban, className: 'bg-red-100 text-red-700 border-red-200' }
};
const STATUS_ORDER: ImportStatus[] = ['imported', 'updated', 'cancelled', 'needs_review', 'duplicate', 'ignored', 'failed'];

const fmtStay = (iso?: string) => (iso ? format(parseISO(iso), 'dd MMM, HH:mm') : '—');

export function EmailImport() {
  const { refreshData } = useData();
  const navigate = useNavigate();
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<ImportStatus | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch('/api/email-import/status'));
    } catch {
      // apiFetch already toasts
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch('/api/email-import/sync', { method: 'POST' });
      const c = res.summary.counts as Partial<Record<ImportStatus, number>>;
      const changed = (c.imported || 0) + (c.updated || 0) + (c.cancelled || 0);
      if (res.summary.newMessages === 0) toast.info('Inbox checked — no new emails');
      else toast.success(`${res.summary.newMessages} new email(s): ${STATUS_ORDER.filter(s => c[s]).map(s => `${c[s]} ${STATUS_META[s].label.toLowerCase()}`).join(', ')}`);
      if (c.needs_review) toast.warning(`${c.needs_review} email(s) need review`);
      await load();
      // New/changed bookings → refresh calendar, bookings, dashboard and ledger data
      if (changed || c.needs_review) await refreshData();
    } catch {
      // toast shown by apiFetch
    } finally {
      setSyncing(false);
    }
  };

  const addTestEmail = async () => {
    try {
      const res = await apiFetch('/api/email-import/dummy/test-email', { method: 'POST' });
      toast.success(`Test email added to the dummy inbox: "${res.message.subject}". Sync to import it.`);
    } catch {
      // toast shown by apiFetch
    }
  };

  const retry = async (rec: ImportRecord) => {
    setRetrying(rec.id);
    try {
      const res = await apiFetch(`/api/email-import/${rec.id}/reprocess`, { method: 'POST' });
      const status = res.record.status as ImportStatus;
      if (status === 'imported' || status === 'updated' || status === 'cancelled') {
        toast.success(`Email processed: ${res.record.message}`);
        await refreshData();
      } else {
        toast.warning(`Still ${STATUS_META[status].label.toLowerCase()}: ${res.record.message}`);
      }
      await load();
    } catch {
      // toast shown by apiFetch
    } finally {
      setRetrying(null);
    }
  };

  const records = useMemo(
    () => (data?.records || []).filter(r => filter === 'all' || r.status === filter),
    [data, filter]
  );

  if (loading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Loading inbox…</div>;
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" /> Email Booking Import
          </h1>
          <p className="text-sm text-muted-foreground">
            Reads OTA and website booking emails and adds them to bookings, the calendar and the ledger.
          </p>
        </div>
        <div className="flex gap-2">
          {data?.provider.isDummy && (
            <button
              onClick={addTestEmail}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground border border-border px-4 py-2.5 rounded-lg font-medium hover:bg-muted transition-colors text-sm"
            >
              <Plus className="w-4 h-4" /> Add test email
            </button>
          )}
          <button
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing…' : 'Sync inbox now'}
          </button>
        </div>
      </div>

      {/* Inbox connection */}
      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{data?.provider.label}</p>
              {data?.provider.isDummy ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Dummy</span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">Live IMAP</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.autoSyncMinutes ? `Checked automatically every ${data.autoSyncMinutes} min` : 'Manual sync only'}
              {data?.lastSync && ` · Last sync ${format(parseISO(data.lastSync.finishedAt), 'dd MMM, HH:mm')} (${data.lastSync.newMessages} new of ${data.lastSync.fetched})`}
            </p>
            {data?.lastSync?.error && <p className="text-xs text-destructive mt-1">Last sync failed: {data.lastSync.error}</p>}
          </div>
        </div>
        {data?.provider.isDummy && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-3 py-2 md:max-w-md">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Using sample emails. To read the real booking inbox, set <code className="font-mono">EMAIL_INBOX_PROVIDER=imap</code> and the <code className="font-mono">IMAP_*</code> settings on the server.
            </span>
          </div>
        )}
      </div>

      {/* Status filters */}
      <div className="flex gap-2 p-1 bg-card border border-border rounded-lg overflow-x-auto">
        {(['all', ...STATUS_ORDER] as const).map(s => {
          const count = s === 'all'
            ? Object.values(data?.counts || {}).reduce((a, b) => a + (b || 0), 0)
            : data?.counts[s] || 0;
          if (s !== 'all' && count === 0) return null;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${filter === s ? 'bg-secondary text-primary' : 'text-foreground hover:bg-muted/50'}`}
            >
              {s === 'all' ? 'All emails' : STATUS_META[s].label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${filter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Processed emails */}
      <div className="bg-card border border-border rounded-lg overflow-auto flex-1 min-h-[300px]">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary sticky top-0 z-10">
            <tr className="border-b border-border text-xs font-semibold text-foreground">
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Received</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Guest & stay</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {records.map(r => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              const p = r.parsed;
              const isOpen = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className="hover:bg-muted/50 cursor-pointer align-top" onClick={() => setExpanded(isOpen ? null : r.id)}>
                    <td className="px-4 py-3 text-muted-foreground">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(parseISO(r.receivedAt), 'dd MMM, HH:mm')}
                    </td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <div className="flex items-center gap-2 mb-0.5">
                        {r.source && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-medium shrink-0">{r.source}</span>
                        )}
                        {r.action && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                            {r.action === 'NEW' ? 'New' : r.action === 'MODIFY' ? 'Modified' : 'Cancelled'}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-foreground truncate" title={r.subject}>{r.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.from}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p && p.action !== 'CANCEL' ? (
                        <>
                          <p className="font-medium text-foreground">{p.guestName || '—'}</p>
                          <p className="text-xs text-muted-foreground">{fmtStay(p.checkIn)} → {fmtStay(p.checkOut)}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.adults ?? '?'} adult(s){p.children ? `, ${p.children} child` : ''} · {p.rooms > 1 ? `${p.rooms} × ` : ''}{p.roomCategory}
                          </p>
                        </>
                      ) : p ? (
                        <p className="text-muted-foreground">{p.guestName || ''} #{p.channelBookingId}</p>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {p?.totalAmount !== undefined ? (
                        <>
                          <p className="font-semibold text-foreground">{formatCurrency(p.totalAmount)}</p>
                          <p className="text-[10px] text-muted-foreground">{p.prepaid ? 'Prepaid' : 'Pay at hotel'}{p.commission ? ` · comm. ${formatCurrency(p.commission)}` : ''}</p>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[220px] max-w-[340px]">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${meta.className}`}>
                        <Icon className="w-3.5 h-3.5" /> {meta.label}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{r.message}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5" onClick={e => e.stopPropagation()}>
                        {r.bookingIds.map(id => (
                          <button key={id} onClick={() => navigate(`/bookings?search=${encodeURIComponent(id)}`)} className="text-xs font-medium text-primary hover:underline">
                            {id}
                          </button>
                        ))}
                        {r.bookingIds.length > 0 && p?.checkIn && (
                          <button onClick={() => navigate(`/calendar?date=${p.checkIn!.slice(0, 10)}`)} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Calendar
                          </button>
                        )}
                        {(r.status === 'needs_review' || r.status === 'failed') && r.bookingIds.length === 0 && (
                          <button
                            onClick={() => retry(r)}
                            disabled={retrying === r.id}
                            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${retrying === r.id ? 'animate-spin' : ''}`} /> Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-muted/30">
                      <td></td>
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Extracted details</h4>
                            {p ? (
                              <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1 text-xs">
                                {([
                                  ['Booking reference', p.channelBookingId],
                                  ['Source', p.source],
                                  ['Guest', p.guestName],
                                  ['Phone', p.guestPhone],
                                  ['Email', p.guestEmail],
                                  ['Check-in', p.checkIn && fmtStay(p.checkIn)],
                                  ['Check-out', p.checkOut && fmtStay(p.checkOut)],
                                  ['Guests', p.adults !== undefined ? `${p.adults} adults, ${p.children ?? 0} children` : undefined],
                                  ['Rooms', `${p.rooms} × ${p.roomType || p.roomCategory}`],
                                  ['Total', p.totalAmount !== undefined ? formatCurrency(p.totalAmount) : undefined],
                                  ['Commission', p.commission !== undefined ? formatCurrency(p.commission) : undefined],
                                  ['Payment', p.prepaid ? 'Prepaid to OTA' : 'Pay at hotel'],
                                  ['Special requests', p.specialRequests]
                                ] as [string, string | undefined][]).map(([k, v]) => (
                                  <Fragment key={k}>
                                    <dt className="text-muted-foreground">{k}</dt>
                                    <dd className={v ? 'text-foreground' : 'text-muted-foreground italic'}>{v || 'not found'}</dd>
                                  </Fragment>
                                ))}
                              </dl>
                            ) : <p className="text-xs text-muted-foreground">{r.message}</p>}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Original email</h4>
                            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap bg-card border border-border rounded-md p-3 max-h-72 overflow-auto font-mono text-foreground/90">{r.rawText}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  {data?.records.length ? 'No emails with this status.' : 'No emails processed yet — click "Sync inbox now".'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
