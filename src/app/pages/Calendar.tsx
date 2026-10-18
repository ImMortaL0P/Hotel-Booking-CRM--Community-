import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useData } from '../data/DataContext';
import { ChevronLeft, ChevronRight, Users, LogIn, LogOut, DoorOpen } from 'lucide-react';
import { NewBookingModal } from '../components/NewBookingModal';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import { Booking } from '../data/types';

export function Calendar() {
  const { rooms, bookings, guestById } = useData();
  // ?date=YYYY-MM-DD opens the timeline on that day (used by links from Email Import)
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(() => {
    const m = searchParams.get('date')?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  });

  // Sync date when URL query param changes
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const m = dateParam.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        setCurrentDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      }
    }
  }, [searchParams]);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<{roomId?: string, checkIn?: string, checkOut?: string}>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const START_HOUR = 11; // Hotel checkout time is 11:00 AM; 24-hour operational cycle runs 11 AM -> 11 AM

  const timelineStartTime = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const d = currentDate.getDate();
    return new Date(y, m, d, START_HOUR, 0, 0, 0).getTime();
  }, [currentDate]);

  const timelineEndTime = useMemo(() => {
    return timelineStartTime + 24 * 60 * 60 * 1000;
  }, [timelineStartTime]);

  const nextDayDate = useMemo(() => new Date(timelineEndTime), [timelineEndTime]);

  const titleDate = `${currentDate.toLocaleString('default', { weekday: 'short', day: 'numeric', month: 'short' })} 11:00 AM → ${nextDayDate.toLocaleString('default', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} 11:00 AM`;

  const nextDay = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
  const prevDay = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
  const goToToday = () => setCurrentDate(new Date());

  const days = useMemo(() => [{
    date: currentDate,
    dayNumber: currentDate.getDate(),
    dayName: currentDate.toLocaleString('default', { weekday: 'short' }),
    isWeekend: currentDate.getDay() === 0 || currentDate.getDay() === 6,
    dateString: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
  }], [currentDate]);

  // 24 hours starting at 11:00 AM: 11, 12, ..., 23, 00, 01, ..., 10
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => (START_HOUR + i) % 24), []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const roomLabelWidth = 200;
  const timelineWidth = Math.max(containerWidth - roomLabelWidth, 960);
  const hourWidth = timelineWidth / 24;
  const dayWidth = timelineWidth;

  const bookingsByRoom = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookings.forEach(b => {
      if (!b.roomId) return;
      const key = b.roomId;
      if (!map[key]) map[key] = [];
      map[key].push(b);
      if (key.startsWith('rm-')) {
        const numKey = key.replace('rm-', '');
        if (!map[numKey]) map[numKey] = [];
        map[numKey].push(b);
      } else {
        const rmKey = `rm-${key}`;
        if (!map[rmKey]) map[rmKey] = [];
        map[rmKey].push(b);
      }
    });
    return map;
  }, [bookings]);

  const handleCellClick = (roomId: string, hourIdx: number) => {
    const cellTime = new Date(timelineStartTime + hourIdx * 60 * 60 * 1000);
    const y = cellTime.getFullYear();
    const m = String(cellTime.getMonth() + 1).padStart(2, '0');
    const d = String(cellTime.getDate()).padStart(2, '0');
    const hh = String(cellTime.getHours()).padStart(2, '0');

    const outTime = new Date(timelineEndTime);
    const outY = outTime.getFullYear();
    const outM = String(outTime.getMonth() + 1).padStart(2, '0');
    const outD = String(outTime.getDate()).padStart(2, '0');

    setPrefilledBooking({
      roomId,
      checkIn: `${y}-${m}-${d}T${hh}:00`,
      checkOut: `${outY}-${outM}-${outD}T11:00`
    });
    setIsBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border overflow-hidden shadow-sm font-sans">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-full sm:w-80">
            <h1 className="text-sm sm:text-base font-bold text-foreground font-mono tracking-tight">{titleDate}</h1>
            <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Hotel Operational Cycle · 11:00 AM Checkout</span>
          </div>
          <div className="flex bg-background rounded-full border border-border overflow-hidden shadow-sm items-center p-0.5 self-start sm:self-auto max-w-full">
            <button onClick={prevDay} className="px-2.5 py-1 hover:bg-muted border-r border-border text-foreground transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4"/></button>
            <input
              type="date"
              value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-');
                  setCurrentDate(new Date(Number(y), Number(m) - 1, Number(d)));
                }
              }}
              className="px-2 sm:px-2.5 py-1 text-xs font-mono bg-transparent border-r border-border focus:outline-none text-foreground cursor-pointer"
            />
            <button onClick={goToToday} className="px-2.5 sm:px-3.5 py-1 text-xs font-mono font-medium hover:bg-muted text-foreground border-r border-border transition-colors cursor-pointer">Today</button>
            <button onClick={nextDay} className="px-2.5 py-1 hover:bg-muted text-foreground transition-colors cursor-pointer"><ChevronRight className="w-4 h-4"/></button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-mono">
          <div className="chip gap-1.5"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Checked-In</div>
          <div className="chip gap-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Confirmed</div>
          <div className="chip gap-1.5"><div className="w-2 h-2 bg-amber-500 rounded-full"></div> Booked</div>
          <div className="chip gap-1.5"><div className="w-2 h-2 bg-muted-foreground rounded-full"></div> Checked-Out</div>
        </div>
      </div>

      {/* Wrapper for scrolling */}
      <div ref={containerRef} className="flex-1 overflow-auto relative bg-muted/50">
        <div style={{ width: `${roomLabelWidth + days.length * dayWidth}px` }} className="min-w-full">

          {/* Days Header */}
          <div className="flex border-b border-border sticky top-0 z-30 bg-card">
            <div className="w-[200px] shrink-0 p-3 border-r border-border bg-muted font-mono uppercase text-xs text-muted-foreground tracking-wider flex items-center justify-center sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
              Room / 11 AM - 11 AM
            </div>
            {days.map(day => (
              <div
                key={day.dayNumber}
                style={{ width: dayWidth }}
                className={`shrink-0 border-r border-border flex flex-col ${day.isWeekend ? 'bg-muted/50' : 'bg-card'}`}
              >
                {/* Day Label */}
                <div className="w-full text-center py-2 border-b border-border/50 font-mono text-xs text-foreground flex items-center justify-center gap-2">
                  <span className={`px-3 py-0.5 rounded-full ${day.dateString === new Date().toISOString().split('T')[0] ? 'bg-foreground text-background font-semibold shadow-xs' : 'bg-secondary text-foreground'}`}>
                    {day.dayName}, {day.dayNumber} · 11:00 AM → 11:00 AM (+1d)
                  </span>
                </div>
                {/* Activity counts below the date */}
                {(() => {
                  const checkIns = bookings.filter(b => {
                    const t = new Date(b.checkIn).getTime();
                    return t >= timelineStartTime && t < timelineEndTime;
                  }).length;
                  const checkOuts = bookings.filter(b => {
                    const t = new Date(b.checkOut).getTime();
                    return t >= timelineStartTime && t < timelineEndTime;
                  }).length;
                  const active = bookings.filter(b => {
                    const s = new Date(b.checkIn).getTime();
                    const e = new Date(b.checkOut).getTime();
                    return s < timelineEndTime && e > timelineStartTime && b.status !== 'Checked-Out';
                  }).length;
                  return (
                    <div className="w-full flex items-center justify-center gap-4 py-1 text-[11px] font-mono border-b border-border/40">
                      <span className="flex items-center gap-1 text-green-600" title={`${checkIns} check-in(s) in this 24h cycle`}>
                        <LogIn className="w-3 h-3" /> {checkIns} check-in{checkIns !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-primary" title={`${checkOuts} check-out(s) at 11:00 AM`}>
                        <LogOut className="w-3 h-3" /> {checkOuts} check-out{checkOuts !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-foreground" title={`${active} active guest(s) staying`}>
                        <DoorOpen className="w-3 h-3" /> {active} staying
                      </span>
                    </div>
                  );
                })()}
                {/* Hours Label (starting from 11:00 AM) */}
                <div className="flex w-full font-mono">
                  {hours.map((h, idx) => (
                    <div key={idx} style={{ width: hourWidth }} className={`shrink-0 text-[10px] text-center py-1.5 border-r border-border/50 last:border-r-0 ${h === 11 ? 'bg-primary/10 text-primary font-bold' : h === 12 ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-semibold' : 'text-muted-foreground'}`}>
                      {String(h).padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="divide-y divide-border bg-card">
            {['Double Bed Room', 'Family Bed Room'].map((category) => {
              const catRooms = rooms.filter(r => r.category === category);
              if (catRooms.length === 0) return null;

              return (
                <div key={category}>
                  {/* Category separator */}
                  <div className="bg-secondary/70 text-xs font-mono uppercase tracking-wider text-muted-foreground px-4 py-2 flex sticky left-0 z-20 border-b border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {category}
                  </div>

                  {catRooms.map((room) => {
                    // Check bookings for this room (resilient to rm-101 or 101)
                    const roomBookings = bookingsByRoom[room.id] || bookingsByRoom[room.number] || bookingsByRoom[`rm-${room.number}`] || [];

                    return (
                      <div key={room.id} className="flex relative hover:bg-muted/30 group transition-colors">
                        {/* Room label sticky left */}
                        <div className="w-[200px] shrink-0 p-4 border-r border-border bg-card sticky left-0 z-20 flex flex-col justify-center group-hover:bg-muted/30 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] h-[100px]">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="font-bold text-base text-foreground font-mono truncate">Room {room.number}</span>
                            <span className={`chip text-[10px] py-0.5 px-2 ${
                              room.status === 'Available'
                                ? 'text-green-600 border-green-600/30'
                                : 'text-primary border-primary/30'
                            }`}>
                              {room.status}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono break-words w-full">Floor {room.floor} · ₹{room.tariff}/night</span>
                        </div>

                        {/* Day & Hour cells */}
                        <div className="flex relative items-center h-[100px]">
                          {days.map(day => (
                            <div key={day.dayNumber} className="flex h-full">
                              {hours.map((h, hourIdx) => (
                                <div
                                  key={h}
                                  style={{ width: hourWidth }}
                                  onClick={() => handleCellClick(room.id, hourIdx)}
                                  className={`h-full shrink-0 border-r border-border/40 transition-colors cursor-pointer hover:bg-muted/60 ${day.isWeekend ? 'bg-muted/20' : 'bg-transparent'}`}
                                ></div>
                              ))}
                            </div>
                          ))}

                          {/* Bookings Blocks Overlay */}
                          {roomBookings.map(booking => {
                            const guestMatch = guestById.get(booking.guestId);
                            const guestName = guestMatch?.name || booking.guestId;

                            const parseDateTime = (dtStr: string, defaultHour: number): number => {
                              if (!dtStr) return 0;
                              // 1. Timezone-explicit strings ('Z' or +05:30 / -05:00) parse directly with native Date
                              if (dtStr.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(dtStr)) {
                                const parsed = new Date(dtStr).getTime();
                                if (!isNaN(parsed)) return parsed;
                              }
                              // 2. ISO local string with time (YYYY-MM-DDTHH:mm:ss)
                              if (dtStr.includes('T')) {
                                const [datePart, timePart] = dtStr.split('T');
                                const [y, m, d] = datePart.split('-');
                                const cleanTime = timePart.replace(/[^0-9:]/g, '');
                                const [h, min] = cleanTime.split(':');
                                if ((h === '00' || !h) && (min === '00' || !min)) {
                                  return new Date(Number(y), Number(m) - 1, Number(d), defaultHour, 0, 0).getTime();
                                }
                                return new Date(Number(y), Number(m) - 1, Number(d), Number(h || defaultHour), Number(min || 0), 0).getTime();
                              }
                              // 3. Date-only string (YYYY-MM-DD)
                              const parts = dtStr.split('-');
                              if (parts.length >= 3) {
                                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), defaultHour, 0, 0).getTime();
                              }
                              const parsed = new Date(dtStr).getTime();
                              return isNaN(parsed) ? 0 : parsed;
                            };

                            // Check-in default 12:00 PM
                            const checkInTime = parseDateTime(booking.checkIn, 12);
                            // Check-out default 11:00 AM
                            const checkOutTime = parseDateTime(booking.checkOut, 11);

                            // Skip if outside this 24-hour cycle (11:00 AM to 11:00 AM next day)
                            if (checkOutTime <= timelineStartTime || checkInTime >= timelineEndTime) return null;

                            // Calculate position based on hours relative to timelineStartTime
                            const startOffsetHours = (checkInTime - timelineStartTime) / (1000 * 60 * 60);
                            const endOffsetHours = (checkOutTime - timelineStartTime) / (1000 * 60 * 60);

                            const boundedStart = Math.max(0, startOffsetHours);
                            const boundedEnd = Math.min(24, endOffsetHours);

                            const durationHours = boundedEnd - boundedStart;
                            if (durationHours <= 0) return null;

                            const isContinuation = checkInTime < timelineStartTime;
                            const hasContinuation = checkOutTime > timelineEndTime;

                            const leftPos = boundedStart * hourWidth;
                            const width = durationHours * hourWidth;

                            const isGreyStatus = booking.status === 'Checked-Out' || booking.status === 'Cancelled' || booking.status === 'No Show';

                            const bgColor = booking.status === 'Booked' ? 'bg-amber-500 hover:bg-amber-600' :
                                           booking.status === 'Confirmed' ? 'bg-blue-500 hover:bg-blue-600' :
                                           booking.status === 'Checked-In' ? 'bg-green-500 hover:bg-green-600' :
                                           'bg-slate-400 hover:bg-slate-500'; // Checked-Out - visible grey

                            const textColor = isGreyStatus ? 'text-slate-900' : 'text-primary-foreground';

                            return (
                              <div
                                key={booking.id}
                                className={`absolute top-[10px] h-[80px] ${bgColor} ${textColor} shadow-md text-xs leading-tight p-2 overflow-hidden z-10 cursor-pointer transition-all group/booking border border-white/20`}
                                style={{
                                  left: `${leftPos}px`,
                                  width: `${width}px`,
                                  borderTopLeftRadius: isContinuation ? '0' : '8px',
                                  borderBottomLeftRadius: isContinuation ? '0' : '8px',
                                  borderTopRightRadius: hasContinuation ? '0' : '8px',
                                  borderBottomRightRadius: hasContinuation ? '0' : '8px',
                                  opacity: 0.98
                                }}
                                onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                                title={`${guestName} • ${booking.status} • ${booking.nights} night(s) • ${booking.adults}A${booking.children > 0 ? ` ${booking.children}C` : ''}\nIn: ${new Date(checkInTime).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}\nOut: ${new Date(checkOutTime).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                              >
                                <div className="flex flex-col h-full justify-between">
                                  {/* Top: Guest Name */}
                                  <div className="font-bold text-sm truncate leading-tight">
                                    {guestName}
                                  </div>

                                  {/* Middle: Status + Nights */}
                                  <div className="flex items-center gap-2 text-[11px] opacity-90">
                                    <span className="font-medium">{booking.nights}N</span>
                                    <span className="opacity-60">•</span>
                                    <span>{booking.status}</span>
                                  </div>

                                  {/* Bottom: Check-in/out dates */}
                                  <div className="text-[10px] opacity-75 truncate">
                                    {new Date(checkInTime).toLocaleString('default', { month: 'short', day: 'numeric' })} → {new Date(checkOutTime).toLocaleString('default', { month: 'short', day: 'numeric' })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isBookingModalOpen && (
        <NewBookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          defaultRoomId={prefilledBooking.roomId}
          defaultDate={prefilledBooking.checkIn}
          defaultCheckOut={prefilledBooking.checkOut}
        />
      )}
      <BookingDetailDrawer booking={selectedBooking} isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} />
    </div>
  );
}