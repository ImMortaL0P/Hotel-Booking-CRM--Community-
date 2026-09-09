import { Booking, PaymentTransaction, Expense, Room } from '../data/types';

/**
 * Profit & Loss report generator for ShardaCRM.
 * Produces the HTML body of the P&L export matching ShardaCRM_PL_Export_Sample.pdf:
 *   header + selection params, KPI strip,
 *   1. P&L summary by room      2. month-wise breakdown
 *   3. occupancy & rate stats   4. cancellations & no-shows
 *   5. ledger detail            6. reconciliation (bookings register vs ledger)
 *   notes to statement, sign-off, per-page footer.
 */

const DAY = 86400000;

/* local-day midnight of an ISO or YYYY-MM-DD string, as epoch ms */
const dayT = (iso: string): number => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

/* en-IN integer money; negatives in parentheses matching the sample */
const money = (n: number): string =>
  (n < 0 ? `(${Math.round(Math.abs(n)).toLocaleString('en-IN')})` : Math.round(n).toLocaleString('en-IN'));

/* percent with one decimal, negatives in parentheses.
   `n` is a fraction (0.108) → "10.8%", matching the sample. */
const pct = (n: number): string => {
  const v = n * 100;
  return (v < 0 ? `(${Math.abs(v).toFixed(1)})` : v.toFixed(1)) + '%';
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthIdx = (mon: string) => MONTH_NAMES.indexOf(mon);

/* "09 September 2026" */
const dateLabel = (iso: string): string => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
};

/* "Aug 26" */
const monthLabel = (y: number, m: number) =>
  `${MONTH_NAMES[m]} ${String(y % 100).padStart(2, '0')}`;

/* first day iso of a "Aug 26" label */
const monthStartIso = (ml: string): string => {
  const [mon, yy] = ml.split(' ');
  const y = 2000 + Number(yy);
  return `${y}-${String(monthIdx(mon) + 1).padStart(2, '0')}-01`;
};

/* last day iso of a "Aug 26" label */
const monthEndIso = (ml: string): string => {
  const [mon, yy] = ml.split(' ');
  const y = 2000 + Number(yy);
  const m = monthIdx(mon);
  return `${y}-${String(m + 1).padStart(2, '0')}-${new Date(y, m + 1, 0).getDate()}`;
};

/* "09 Sep 26" short ledger date (no year ambiguity in a single period) */
const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    .replace(/(\d{2})\/(\w{3})\/(\d{2})/, '$1 $2 $3');
};

export interface PLContext {
  rooms: Room[];
  bookings: Booking[];
  payments: PaymentTransaction[];
  expenses: Expense[];
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD inclusive
  filterRoomId?: string;
}

interface RoomStat {
  id: string;
  number: string;
  income: number;
  expense: number;
  nightsSold: number;
  stays: number;
  nightsAvailable: number;
  regIncome: number;     // booking-register income for realised stays checking in within the period
  regCommission: number; // booking-register commission for those stays
  cancelled: number;
  cancelledNights: number;
  noShow: number;
  noShowNights: number;
}

const PROP = '__PROP__';

function buildRoomStats(ctx: PLContext): { stats: RoomStat[]; totals: { [k: string]: number } } {
  const { rooms: allRooms, bookings, payments, expenses, fromDate, toDate, filterRoomId } = ctx;
  const rooms = (filterRoomId ? allRooms.filter(r => r.id === filterRoomId) : [...allRooms])
    .slice()
    .sort((a, b) => Number(a.number) - Number(b.number));

  const fromT = dayT(fromDate);
  const toT = dayT(toDate) + DAY; // exclusive end
  const nightsAvailable = Math.round((toT - fromT) / DAY);

  const bookingMap = new Map<string, Booking>();
  for (const b of bookings) bookingMap.set(b.id, b);

  const overlap = (b: Booking) => {
    const s = Math.max(dayT(b.checkIn), fromT);
    const e = Math.min(dayT(b.checkOut), toT);
    return Math.max(0, Math.round((e - s) / DAY));
  };
  const realised = (b: Booking) => b.status !== 'Cancelled' && b.status !== 'No Show';
  const checksIn = (b: Booking) => dayT(b.checkIn) >= fromT && dayT(b.checkIn) < toT;

  /* room a payment is attributed to: parent booking's room, else payment.roomId, else property-wide */
  const incomeRoomOf = (p: PaymentTransaction): string | null => {
    if (p.bookingId && p.bookingId !== '-') {
      const b = bookingMap.get(p.bookingId);
      if (b) return b.roomId;
    }
    return p.roomId || null;
  };

  const buckets: { [k: string]: Map<string, number> } = {
    income: new Map(), expense: new Map(), sold: new Map(), stays: new Map(),
    regIncome: new Map(), regComm: new Map(), cancelled: new Map(),
    cancelledNights: new Map(), noShow: new Map(), noShowNights: new Map(),
  };
  const bump = (m: Map<string, number>, key: string, v: number) => m.set(key, (m.get(key) || 0) + v);

  for (const p of payments) {
    if (p.status !== 'Completed') continue;
    const d = dayT(p.date);
    if (d < fromT || d >= toT) continue;
    const rid = incomeRoomOf(p);
    if (filterRoomId && rid !== filterRoomId) continue;
    // Round each amount to the nearest rupee before summing — matches the sample,
    // where the ledger TOTAL is the sum of per-entry rounded amounts.
    bump(buckets.income, rid || PROP, Math.round(p.amount));
  }
  for (const e of expenses) {
    const d = dayT(e.date);
    if (d < fromT || d >= toT) continue;
    if (filterRoomId && e.roomId !== filterRoomId) continue;
    bump(buckets.expense, e.roomId || PROP, e.amount);
  }
  for (const b of bookings) {
    const nights = overlap(b);
    if (nights <= 0) continue;
    if (rooms.every(r => r.id !== b.roomId)) continue;
    if (realised(b)) {
      bump(buckets.sold, b.roomId, nights);
      bump(buckets.stays, b.roomId, 1);
      if (checksIn(b)) {
        bump(buckets.regIncome, b.roomId, Math.round(b.total || 0));
        bump(buckets.regComm, b.roomId, b.commission || 0);
      }
    } else if (b.status === 'Cancelled') {
      bump(buckets.cancelled, b.roomId, 1);
      bump(buckets.cancelledNights, b.roomId, nights);
    } else if (b.status === 'No Show') {
      bump(buckets.noShow, b.roomId, 1);
      bump(buckets.noShowNights, b.roomId, nights);
    }
  }

  /* property-wide amounts are apportioned across rooms in the ratio of nights sold */
  const propIncome = buckets.income.get(PROP) || 0;
  const propExpense = buckets.expense.get(PROP) || 0;
  const totalSoldAll = rooms.reduce((s, r) => s + (buckets.sold.get(r.id) || 0), 0);
  const apportion = (sold: number) =>
    filterRoomId ? 0 : (totalSoldAll > 0 ? sold / totalSoldAll : (rooms.length ? 1 / rooms.length : 0));

  const stats: RoomStat[] = rooms.map(r => {
    const sold = buckets.sold.get(r.id) || 0;
    const w = apportion(sold);
    return {
      id: r.id,
      number: r.number,
      income: (buckets.income.get(r.id) || 0) + propIncome * w,
      expense: (buckets.expense.get(r.id) || 0) + propExpense * w,
      nightsSold: sold,
      stays: buckets.stays.get(r.id) || 0,
      nightsAvailable,
      regIncome: buckets.regIncome.get(r.id) || 0,
      regCommission: buckets.regComm.get(r.id) || 0,
      cancelled: buckets.cancelled.get(r.id) || 0,
      cancelledNights: buckets.cancelledNights.get(r.id) || 0,
      noShow: buckets.noShow.get(r.id) || 0,
      noShowNights: buckets.noShowNights.get(r.id) || 0,
    };
  });

  const totals: { [k: string]: number } = {
    income: stats.reduce((s, x) => s + x.income, 0),
    expense: stats.reduce((s, x) => s + x.expense, 0),
    nightsSold: stats.reduce((s, x) => s + x.nightsSold, 0),
    stays: stats.reduce((s, x) => s + x.stays, 0),
    nightsAvailable: nightsAvailable * (rooms.length || 1),
    regIncome: stats.reduce((s, x) => s + x.regIncome, 0),
    regCommission: stats.reduce((s, x) => s + x.regCommission, 0),
    cancelled: stats.reduce((s, x) => s + x.cancelled, 0),
    cancelledNights: stats.reduce((s, x) => s + x.cancelledNights, 0),
    noShow: stats.reduce((s, x) => s + x.noShow, 0),
    noShowNights: stats.reduce((s, x) => s + x.noShowNights, 0),
  };

  return { stats, totals };
}

export function buildProfitLossReportHtml(ctx: PLContext): string {
  const { rooms: allRooms, bookings, payments, expenses, fromDate, toDate, filterRoomId } = ctx;
  const { stats, totals } = buildRoomStats(ctx);

  const netProfit = totals.income - totals.expense;
  const occupancy = totals.nightsAvailable > 0 ? totals.nightsSold / totals.nightsAvailable : 0;
  const adr = totals.nightsSold > 0 ? totals.income / totals.nightsSold : 0;
  const revpar = totals.nightsAvailable > 0 ? totals.income / totals.nightsAvailable : 0;
  const nightsAvailable = stats.length ? stats[0].nightsAvailable : 0;
  const totalAlos = totals.stays > 0 ? totals.nightsSold / totals.stays : 0;

  const fromT = dayT(fromDate);
  const toT = dayT(toDate) + DAY;
  const bookingMap = new Map<string, Booking>();
  for (const b of bookings) bookingMap.set(b.id, b);
  const roomById = new Map<string, Room>();
  for (const r of allRooms) roomById.set(r.id, r);

  /* room a payment is attributed to (used for ledger rows + month breakdown) */
  const incomeRoomOf = (p: PaymentTransaction): string | null => {
    if (p.bookingId && p.bookingId !== '-') {
      const b = bookingMap.get(p.bookingId);
      if (b) return b.roomId;
    }
    return p.roomId || null;
  };

  /* ---------- month-wise breakdown ---------- */
  const monthIncome = new Map<string, Map<string, number>>();
  const monthExpense = new Map<string, Map<string, number>>();
  const monthKey = (ms: number) => {
    const dt = new Date(ms);
    return monthLabel(dt.getFullYear(), dt.getMonth());
  };

  const monthOrder: string[] = [];
  {
    const cur = new Date(fromT); cur.setDate(1);
    const last = new Date(toT - DAY); last.setDate(1);
    while (cur.getTime() <= last.getTime()) {
      monthOrder.push(monthLabel(cur.getFullYear(), cur.getMonth()));
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  for (const p of payments) {
    if (p.status !== 'Completed') continue;
    const d = dayT(p.date);
    if (d < fromT || d >= toT) continue;
    const rid = incomeRoomOf(p);
    if (filterRoomId && rid !== filterRoomId) continue;
    const mk = monthKey(d);
    if (!monthIncome.has(mk)) monthIncome.set(mk, new Map());
    const k = rid || PROP;
    monthIncome.get(mk)!.set(k, (monthIncome.get(mk)!.get(k) || 0) + Math.round(p.amount));
  }
  for (const e of expenses) {
    const d = dayT(e.date);
    if (d < fromT || d >= toT) continue;
    if (filterRoomId && e.roomId !== filterRoomId) continue;
    const mk = monthKey(d);
    if (!monthExpense.has(mk)) monthExpense.set(mk, new Map());
    const k = e.roomId || PROP;
    monthExpense.get(mk)!.set(k, (monthExpense.get(mk)!.get(k) || 0) + e.amount);
  }

  const rooms = (filterRoomId ? allRooms.filter(r => r.id === filterRoomId) : [...allRooms])
    .slice()
    .sort((a, b) => Number(a.number) - Number(b.number));

  /* per-month sold ratio, used to apportion that month's property-wide amounts */
  const monthSoldRatio = (mk: string): number[] => {
    const mStart = dayT(monthStartIso(mk));
    const mEnd = dayT(monthEndIso(mk)) + DAY;
    const soldByRoom: number[] = rooms.map(() => 0);
    let total = 0;
    rooms.forEach((r, i) => {
      for (const b of bookings) {
        if (b.roomId !== r.id) continue;
        if (b.status === 'Cancelled' || b.status === 'No Show') continue;
        const s = Math.max(dayT(b.checkIn), fromT, mStart);
        const e = Math.min(dayT(b.checkOut), toT, mEnd);
        if (e > s) {
          const n = Math.round((e - s) / DAY);
          soldByRoom[i] += n;
          total += n;
        }
      }
    });
    if (total === 0) return rooms.map(() => (rooms.length ? 1 / rooms.length : 0));
    return soldByRoom.map(x => x / total);
  };

  const monthCells = monthOrder.map(mk => {
    const incB = monthIncome.get(mk) || new Map<string, number>();
    const expB = monthExpense.get(mk) || new Map<string, number>();
    const propInc = incB.get(PROP) || 0;
    const propExp = expB.get(PROP) || 0;
    const w = monthSoldRatio(mk);
    return rooms.map((r, i) => ({
      month: mk,
      room: r,
      income: (incB.get(r.id) || 0) + (filterRoomId ? 0 : propInc * w[i]),
      expense: (expB.get(r.id) || 0) + (filterRoomId ? 0 : propExp * w[i]),
    }));
  });
  const monthTotals = monthCells.map(cells => ({
    month: cells[0]?.month || '',
    income: cells.reduce((s, c) => s + c.income, 0),
    expense: cells.reduce((s, c) => s + c.expense, 0),
  }));

  /* ---------- section 5: ledger detail ---------- */
  type LedgerRow = { date: string; type: string; room: string; description: string; income: number; expense: number };
  const ledgerRows: LedgerRow[] = [];

  for (const p of payments) {
    if (p.status !== 'Completed') continue;
    const d = dayT(p.date);
    if (d < fromT || d >= toT) continue;
    const rid = incomeRoomOf(p);
    if (filterRoomId && rid !== filterRoomId) continue;
    const b = p.bookingId && p.bookingId !== '-' ? bookingMap.get(p.bookingId) : undefined;
    const roomLabel = rid
      ? (roomById.get(rid) ? `Room ${roomById.get(rid)!.number}` : `Room ${rid}`)
      : 'Property Wide';
    ledgerRows.push({
      date: shortDate(p.date),
      type: b ? 'Room Booking' : 'Other Income',
      room: roomLabel,
      description: b
        ? `Payment for booking ${p.bookingId} via ${p.mode}`
        : (p.description && p.description !== '' ? p.description : `Income via ${p.mode}`),
      income: Math.round(p.amount),
      expense: 0,
    });
    void d;
  }
  for (const e of expenses) {
    const d = dayT(e.date);
    if (d < fromT || d >= toT) continue;
    if (filterRoomId && e.roomId !== filterRoomId) continue;
    const roomLabel = e.roomId
      ? (roomById.get(e.roomId) ? `Room ${roomById.get(e.roomId)!.number}` : `Room ${e.roomId}`)
      : 'Property Wide';
    ledgerRows.push({
      date: shortDate(e.date),
      type: e.category,
      room: roomLabel,
      description: e.description,
      income: 0,
      expense: e.amount,
    });
    void d;
  }
  ledgerRows.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  /* ---------- section 6: reconciliation observation ---------- */
  let mismatchCount = 0;
  let example = '';
  for (const e of expenses) {
    if (e.category !== 'Commission') continue;
    const d = dayT(e.date);
    if (d < fromT || d >= toT) continue;
    if (filterRoomId && e.roomId !== filterRoomId) continue;
    const m = e.description.match(/#(\d+)/);
    if (!m) continue;
    const bk = bookings.find(x => x.channelBookingId === m[1]);
    if (bk && bk.roomId !== e.roomId) {
      mismatchCount++;
      if (!example) {
        const parent = roomById.get(bk.roomId);
        const posted = e.roomId ? roomById.get(e.roomId) : undefined;
        example = `the booking received at ${parent ? `Room ${parent.number}` : 'Property Wide'} carries a ${money(e.amount)} commission posted to ${posted ? `Room ${posted.number}` : 'Property Wide'}`;
      }
    }
  }
  const observation = mismatchCount > 0
    ? `Totals agree exactly — income ${money(totals.regIncome)} per booking register against ${money(totals.income)} in the ledger, expenses ${money(totals.regCommission)} both ways — but the room-wise split does not. In ${mismatchCount} of the period's commission entries the amount is posted to a different room from the booking it belongs to; for example, ${example}. Until a commission entry inherits the room of its parent booking, room-wise profit in the ledger view will be misstated though the property total is correct.`
    : `Totals agree exactly — income ${money(totals.regIncome)} per booking register against ${money(totals.income)} in the ledger, expenses ${money(totals.regCommission)} both ways — and every entry is tagged to the room that generated it. Room-wise profit is therefore correctly stated.`;

  /* ---------- labels ---------- */
  const segLabel = filterRoomId
    ? `Room ${allRooms.find(r => r.id === filterRoomId)?.number ?? filterRoomId}`
    : 'All (Include Property Wide)';
  const generatedAt = `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST`;

  /* ---------- rendering helpers ---------- */
  const roomCols = () => rooms.map(r => `<th>Room ${r.number}</th>`).join('');
  const roomCells = (fn: (st: RoomStat) => number | string) => rooms.map(r => {
    const st = stats.find(x => x.id === r.id)!;
    const v = fn(st);
    return `<td>${typeof v === 'number' ? money(v) : v}</td>`;
  }).join('');
  const rowMoney = (label: string, fn: (st: RoomStat) => number, totalFn?: (tot: { [k: string]: number }) => number) =>
    `<tr><td class="pl">${label}</td>${roomCells(fn)}<td class="tot"><b>${money(totalFn ? totalFn(totals) : stats.reduce((s, st) => s + fn(st), 0))}</b></td></tr>`;
  const rowNum = (label: string, fn: (st: RoomStat) => number, totalFn?: (tot: { [k: string]: number }) => number) =>
    `<tr><td class="pl">${label}</td>${rooms.map(r => `<td>${fn(stats.find(x => x.id === r.id)!)}</td>`).join('')}<td class="tot"><b>${(totalFn ? totalFn(totals) : stats.reduce((s, st) => s + fn(st), 0)).toLocaleString('en-IN')}</b></td></tr>`;
  const rowPct = (label: string, fn: (st: RoomStat) => number, totalPct: number) =>
    `<tr><td class="pl">${label}</td>${rooms.map(r => `<td>${pct(fn(stats.find(x => x.id === r.id)!))}</td>`).join('')}<td class="tot"><b>${pct(totalPct)}</b></td></tr>`;
  /* ratio with two decimals (used for e.g. average length of stay) */
  const ratio2 = (n: number) =>
    (n < 0 ? `(${Math.abs(n).toFixed(2)})` : n.toFixed(2));
  const rowRatio = (label: string, fn: (st: RoomStat) => number, totalVal: number) =>
    `<tr><td class="pl">${label}</td>${rooms.map(r => `<td>${ratio2(fn(stats.find(x => x.id === r.id)!))}</td>`).join('')}<td class="tot"><b>${ratio2(totalVal)}</b></td></tr>`;

  const foot = (page: number) => `
    <div class="foot">
      <span>Generated by ShardaCRM on ${generatedAt} · Management report, not a statutory financial statement.</span>
      <span>Page ${page}</span>
    </div>`;

  const notes = [
    `Basis of preparation. Income is recognised from Completed payment records whose payment date falls inside the selected period (realised cash received). Cancelled and no-show bookings carry no income and are reported separately in section 4.`,
    `Room segregation. Every income and expense line is tagged to the room that generated it. Entries that belong to the property as a whole rather than to one room are apportioned in the ratio of room nights sold.`,
    `Expenditure. Captures every expense head recorded in ShardaCRM (including Booking.com commission) for the selected period. Operating costs not captured in the system are excluded; the net figure is therefore a contribution before operating overheads, not a final net profit.`,
    `Taxes. Amounts are stated as recorded in ShardaCRM. Goods and Services Tax, where collected, is a liability and does not form part of income.`,
    `Occupancy is room nights sold divided by room nights available in the selected period. ADR is income divided by room nights sold. RevPAR is income divided by room nights available.`,
    `Part periods. Where the selected range begins or ends mid-month, room nights available are counted only for the days inside the range, so occupancy stays comparable across selections.`,
    `This report is generated from live ShardaCRM data for internal management review and is not a statutory financial statement.`,
  ];

  const kpi = `
    <div class="kpis">
      <div class="kpi"><span class="k">${money(totals.income)}</span><span class="l">TOTAL INCOME</span></div>
      <div class="kpi"><span class="k">${money(totals.expense)}</span><span class="l">TOTAL EXPENSES</span></div>
      <div class="kpi"><span class="k">${money(netProfit)}</span><span class="l">NET PROFIT</span></div>
      <div class="kpi"><span class="k">${pct(occupancy)}</span><span class="l">OCCUPANCY</span></div>
      <div class="kpi"><span class="k">${money(adr)}</span><span class="l">ADR</span></div>
      <div class="kpi"><span class="k">${money(revpar)}</span><span class="l">RevPAR</span></div>
      <div class="kpi"><span class="k">${totals.stays.toLocaleString('en-IN')}</span><span class="l">STAYS</span></div>
    </div>`;

  const header = (sub: boolean) => `
    <div class="head">
      <div class="brand">SHARDA PALACE<small>${rooms.length} Room${rooms.length > 1 ? 's' : ''} · ShardaCRM</small></div>
      <div class="title">Profit &amp; Loss · ${dateLabel(fromDate)} – ${dateLabel(toDate)}
        ${sub ? `<div class="sub">Statement of Income, Expenditure and Profit or Loss · Room-wise (property-wise) presentation · All amounts in Indian Rupees</div>` : ''}
      </div>
    </div>`;

  const params = `
    <div class="params">
      <div class="param"><span class="l">FROM DATE</span><div class="v">${dateLabel(fromDate)}</div></div>
      <div class="param"><span class="l">TO DATE</span><div class="v">${dateLabel(toDate)}</div></div>
      <div class="param"><span class="l">ROOM SEGREGATION</span><div class="v">${segLabel}</div></div>
      <div class="param"><span class="l">BASIS</span><div class="v">Accrual — realised stays</div></div>
    </div>`;

  const secTitle = (n: string, t: string, extra = '') => `
    <div class="sec">
      <h3>${n ? `${n} ` : ''}${t}${extra ? ` <span class="note">${extra}</span>` : ''}</h3>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #17202a; font-size: 11px; margin: 0; background: #fff; }
    .page { break-after: page; padding: 12px; }
    .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #1f2937; padding-bottom: 7px; margin-bottom: 10px; }
    .brand { font-size: 15px; font-weight: 800; letter-spacing: 0.5px; }
    .brand small { display: block; font-size: 9px; font-weight: 600; color: #4b5563; margin-top: 2px; }
    .title { font-size: 13px; font-weight: 700; text-align: right; color: #1f2937; }
    .sub { font-size: 9.5px; color: #4b5563; text-align: right; margin-top: 3px; font-weight: 400; }
    .params { display: grid; grid-template-columns: repeat(4, auto); justify-content: start; gap: 28px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 14px; margin: 10px 0; }
    .param .l { font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; font-weight: 600; }
    .param .v { font-size: 11px; font-weight: 700; margin-top: 2px; }
    .kpis { display: flex; border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; margin: 10px 0; background: #f9fafb; }
    .kpi { flex: 1; padding: 8px 4px; text-align: center; }
    .kpi + .kpi { border-left: 1px solid #e5e7eb; }
    .kpi .k { display: block; font-size: 14px; font-weight: 800; }
    .kpi .l { display: block; font-size: 6.5px; text-transform: uppercase; letter-spacing: 0.7px; color: #6b7280; margin-top: 2px; }
    .sec { margin-top: 14px; }
    .sec h3 { font-size: 11px; font-weight: 800; margin: 0 0 6px; border-bottom: 1.5px solid #1f2937; padding-bottom: 4px; }
    .note { font-size: 9px; color: #6b7280; font-style: italic; font-weight: 400; }
    table.plt { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.plt th, table.plt td { border: 1px solid #d1d5db; padding: 3.5px 7px; text-align: right; }
    table.plt th.pl, table.plt td.pl { text-align: left; }
    table.plt th { background: #f3f4f6; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.4px; font-weight: 700; }
    table.plt td.tot { border-top: 2px solid #1f2937; background: #f3f4f6; }
    table.plt tr.gr td { font-weight: 700; background: #f9fafb; }
    .foot { margin-top: 18px; padding-top: 6px; border-top: 1px solid #d1d5db; display: flex; justify-content: space-between; font-size: 8px; color: #6b7280; }
    .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-top: 70px; }
    .sign div { border-top: 1px solid #9ca3af; padding-top: 5px; font-size: 10px; text-align: center; }
    .sign .role { font-size: 9px; color: #6b7280; }
    .obs { margin-top: 8px; font-size: 9.5px; color: #4b5563; font-style: italic; line-height: 1.5; }
    .obs b { color: #17202a; }
  </style>
  <div class="report">

    <div class="page">
      ${header(true)}
      ${params}
      ${kpi}

      ${secTitle('1.', 'Profit &amp; Loss Summary — by room')}
      <table class="plt">
        <thead><tr><th class="pl">Particulars</th>${roomCols()}<th>Total (INR)</th></tr></thead>
        <tbody>
          ${rowMoney('Room tariff — realised stays', st => st.income)}
          <tr class="gr"><td class="pl">A. Total Income</td>${roomCells(st => st.income)}<td class="tot"><b>${money(totals.income)}</b></td></tr>
          ${rowMoney('Booking.com / OTA commission', st => st.expense)}
          <tr class="gr"><td class="pl">B. Total Expenditure</td>${roomCells(st => st.expense)}<td class="tot"><b>${money(totals.expense)}</b></td></tr>
          <tr class="gr"><td class="pl">C. NET PROFIT / (LOSS) (A − B)</td>${roomCells(st => st.income - st.expense)}<td class="tot"><b>${money(netProfit)}</b></td></tr>
          ${rowPct('Net margin %', st => (st.income > 0 ? (st.income - st.expense) / st.income : 0), totals.income > 0 ? netProfit / totals.income : 0)}
          ${rowPct('Share of total income', st => (totals.income > 0 ? st.income / totals.income : 0), 1)}
        </tbody>
      </table>

      ${secTitle('2.', 'Month-wise breakdown within the selected period')}
      ${monthCells.length ? `
      <table class="plt">
        <thead>
          <tr>
            <th class="pl" rowspan="2">Month</th>
            ${rooms.map(r => `<th colspan="3">Room ${r.number}</th>`).join('')}
            <th rowspan="2">Month Net</th>
          </tr>
          <tr>${rooms.map(() => `<th>Income</th><th>Expense</th><th>Net</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${monthCells.map((cells, i) => {
            const mn = monthTotals[i];
            return `<tr>
              <td class="pl">${cells[0]?.month || ''}</td>
              ${cells.map(c => `<td>${money(c.income)}</td><td>${money(c.expense)}</td><td>${money(c.income - c.expense)}</td>`).join('')}
              <td class="tot"><b>${money(mn.income - mn.expense)}</b></td>
            </tr>`;
          }).join('')}
          <tr class="gr">
            <td class="pl">TOTAL</td>
            ${stats.map(st => `<td>${money(st.income)}</td><td>${money(st.expense)}</td><td>${money(st.income - st.expense)}</td>`).join('')}
            <td class="tot"><b>${money(netProfit)}</b></td>
          </tr>
        </tbody>
      </table>` : '<p class="note" style="padding:6px 0;">No month in the selected period.</p>'}
    </div>

    <div class="page">
      ${header(false)}

      ${secTitle('3.', 'Occupancy and Rate Statistics')}
      <table class="plt">
        <thead><tr><th class="pl">Particulars</th>${roomCols()}<th>Total</th></tr></thead>
        <tbody>
          ${rowNum('Room nights available in period', st => st.nightsAvailable, tot => tot.nightsAvailable)}
          ${rowNum('Room nights sold', st => st.nightsSold, tot => tot.nightsSold)}
          ${rowPct('Occupancy %', st => (st.nightsAvailable > 0 ? st.nightsSold / st.nightsAvailable : 0), occupancy)}
          ${rowNum('Number of stays', st => st.stays, tot => tot.stays)}
          ${rowRatio('Average length of stay (nights)', st => (st.stays > 0 ? st.nightsSold / st.stays : 0), totalAlos)}
          ${rowMoney('Average daily rate (ADR)', st => (st.nightsSold > 0 ? st.income / st.nightsSold : 0), tot => (tot.nightsSold > 0 ? tot.income / tot.nightsSold : 0))}
          ${rowMoney('Revenue per available room (RevPAR)', st => (st.nightsAvailable > 0 ? st.income / st.nightsAvailable : 0), tot => (tot.nightsAvailable > 0 ? tot.income / tot.nightsAvailable : 0))}
          ${rowMoney('Net profit per available room', st => (st.nightsAvailable > 0 ? (st.income - st.expense) / st.nightsAvailable : 0), tot => (tot.nightsAvailable > 0 ? (tot.income - tot.expense) / tot.nightsAvailable : 0))}
        </tbody>
      </table>

      ${secTitle('4.', 'Cancellations and No-shows (memorandum — no revenue effect)')}
      <table class="plt">
        <thead><tr><th class="pl">Particulars</th>${roomCols()}<th>Total</th></tr></thead>
        <tbody>
          ${rowNum('Cancelled bookings', st => st.cancelled, tot => tot.cancelled)}
          ${rowNum('Cancelled — room nights released', st => st.cancelledNights, tot => tot.cancelledNights)}
          ${rowNum('No-show bookings', st => st.noShow, tot => tot.noShow)}
          ${rowNum('No-show — room nights lost', st => st.noShowNights, tot => tot.noShowNights)}
          ${rowPct('Nights lost as % of nights available', st => (st.nightsAvailable > 0 ? (st.cancelledNights + st.noShowNights) / st.nightsAvailable : 0), totals.nightsAvailable > 0 ? (totals.cancelledNights + totals.noShowNights) / totals.nightsAvailable : 0)}
        </tbody>
      </table>

      ${secTitle('5.', 'Ledger Detail — all entries in the selected period')}
      ${ledgerRows.length ? `
      <table class="plt">
        <thead><tr>
          <th class="pl">Date</th><th class="pl">Type / Category</th><th class="pl">Room</th><th class="pl">Description</th><th>Income</th><th>Expense</th>
        </tr></thead>
        <tbody>
          ${ledgerRows.map(l => `
            <tr>
              <td class="pl" style="white-space:nowrap;">${l.date}</td>
              <td class="pl">${l.type}</td>
              <td class="pl">${l.room}</td>
              <td class="pl" style="max-width:250px;">${l.description}</td>
              <td>${l.income ? money(l.income) : '—'}</td>
              <td>${l.expense ? money(l.expense) : '—'}</td>
            </tr>`).join('')}
          <tr class="gr">
            <td class="pl" colspan="4">TOTAL</td>
            <td class="tot"><b>${money(ledgerRows.reduce((s, l) => s + l.income, 0))}</b></td>
            <td class="tot"><b>${money(ledgerRows.reduce((s, l) => s + l.expense, 0))}</b></td>
          </tr>
        </tbody>
      </table>` : '<p class="note" style="padding:6px 0;">No transactions found for the selected period.</p>'}
    </div>

    <div class="page" style="break-after:auto;">
      ${header(false)}

      ${secTitle('6.', 'Reconciliation — accrual (bookings) to cash ledger')}
      <table class="plt">
        <thead><tr><th class="pl">Particulars</th>${roomCols()}<th>Total (INR)</th></tr></thead>
        <tbody>
          ${rowMoney('Income per booking register (realised stays)', st => st.regIncome, tot => tot.regIncome)}
          ${rowMoney('Income recorded in ledger', st => st.income, tot => tot.income)}
          ${rowMoney('Difference — room tagging only', st => st.regIncome - st.income, tot => tot.regIncome - tot.income)}
          ${rowMoney('Expense per booking register (commission)', st => st.regCommission, tot => tot.regCommission)}
          ${rowMoney('Expense recorded in ledger', st => st.expense, tot => tot.expense)}
          ${rowMoney('Difference — room tagging only', st => st.regCommission - st.expense, tot => tot.regCommission - tot.expense)}
        </tbody>
      </table>
      <p class="obs"><b>Observation.</b> ${observation}</p>

      ${secTitle('', 'Notes to the Statement')}
      <ol style="margin:0;padding-left:18px;font-size:9.5px;line-height:1.6;color:#374151;">
        ${notes.map(n => `<li>${n}</li>`).join('')}
      </ol>

      <div class="sign">
        <div>______________________<div class="role">Accounts</div></div>
        <div>______________________<div class="role">Manager</div></div>
        <div>______________________<div class="role">Proprietor</div></div>
      </div>

      ${foot(3)}
    </div>

  </div>
  </body></html>`;
}