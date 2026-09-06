import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { ChevronLeft, ChevronRight, Search, Clock, Users, CalendarDays, Key, LogIn, LogOut, DoorOpen } from 'lucide-react';
import { NewBookingModal } from '../components/NewBookingModal';
import { BookingDetailDrawer } from '../components/BookingDetailDrawer';
import { Booking } from '../data/types';

export function Calendar() {
  const { rooms, bookings, guests } = useData();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<{roomId?: string, checkIn?: string, checkOut?: string}>({});
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const titleDate = currentDate.toLocaleString('default', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

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

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const hourWidth = 40; // 40px per hour
  const dayWidth = 24 * hourWidth; // 960px per day

  const bookingsByRoom = useMemo(() => {
    const map: Record<string, typeof bookings> = {};
    bookings.forEach(b => {
      if (!map[b.roomId]) map[b.roomId] = [];
      map[b.roomId].push(b);
    });
    return map;
  }, [bookings]);

  const handleCellClick = (roomId: string, dateString: string, hour: number) => {
    const checkInDate = new Date(dateString);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const checkOutString = `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth() + 1).padStart(2, '0')}-${String(checkOutDate.getDate()).padStart(2, '0')}`;
    const hh = String(hour).padStart(2, '0');

    setPrefilledBooking({
      roomId,
      checkIn: `${dateString}T${hh}:00`,
      checkOut: `${checkOutString}T11:00`
    });
    setIsBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between shrink-0 bg-secondary">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground w-64">{titleDate}</h1>
          <div className="flex bg-card rounded border border-border overflow-hidden shadow-sm items-center">
            <button onClick={prevDay} className="px-3 py-1.5 hover:bg-muted/50 border-r border-border text-foreground"><ChevronLeft className="w-5 h-5"/></button>
            <input
              type="date"
              value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`}
              onChange={(e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-');
                  setCurrentDate(new Date(Number(y), Number(m) - 1, Number(d)));
                }
              }}
              className="px-2 py-1.5 text-sm bg-transparent border-r border-border focus:outline-none text-foreground cursor-pointer"
            />
            <button onClick={goToToday} className="px-5 py-1.5 text-sm font-semibold hover:bg-muted/50 text-foreground border-r border-border">Today</button>
            <button onClick={nextDay} className="px-3 py-1.5 hover:bg-muted/50 text-foreground"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-foreground bg-card px-4 py-2 rounded-lg border border-border">
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-green-500 rounded-sm"></div> Checked-In</div>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-blue-500 rounded-sm"></div> Confirmed</div>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-amber-500 rounded-sm"></div> Booked (Pending)</div>
          <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-muted rounded-sm"></div> Checked-Out</div>
        </div>
      </div>

      {/* Wrapper for scrolling */}
      <div className="flex-1 overflow-auto relative bg-muted/50">
        <div style={{ width: `calc(200px + ${days.length * dayWidth}px)` }} className="min-w-full">

          {/* Days Header */}
          <div className="flex border-b border-border sticky top-0 z-30 bg-card">
            <div className="w-[200px] shrink-0 p-3 border-r border-border bg-muted font-bold text-sm text-foreground flex items-center justify-center sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              Room / Time
            </div>
            {days.map(day => (
              <div
                key={day.dayNumber}
                style={{ width: dayWidth }}
                className={`shrink-0 border-r border-border flex flex-col ${day.isWeekend ? 'bg-muted/50' : 'bg-card'}`}
              >
                {/* Day Label */}
                <div className="w-full text-center py-2 border-b border-border/50 font-bold text-foreground text-sm flex items-center justify-center gap-2">
                  <span className={`px-2 py-0.5 rounded ${day.dateString === new Date().toISOString().split('T')[0] ? 'bg-primary text-primary-foreground' : ''}`}>
                    {day.dayName}, {day.dayNumber}
                  </span>
                </div>
                {/* Activity counts below the date */}
                {(() => {
                  const checkIns = bookings.filter(b => b.checkIn.split('T')[0] === day.dateString).length;
                  const checkOuts = bookings.filter(b => b.checkOut.split('T')[0] === day.dateString).length;
                  const active = bookings.filter(b => {
                    const s = b.checkIn.split('T')[0];
                    const e = b.checkOut.split('T')[0];
                    return s <= day.dateString && day.dateString < e && b.status !== 'Checked-Out';
                  }).length;
                  return (
                    <div className="w-full flex items-center justify-center gap-3 py-1 text-[10px] font-semibold border-b border-border/40">
                      <span className="flex items-center gap-1 text-green-600" title={`${checkIns} check-in(s)`}>
                        <LogIn className="w-3 h-3" />{checkIns}
                      </span>
                      <span className="flex items-center gap-1 text-red-500" title={`${checkOuts} check-out(s)`}>
                        <LogOut className="w-3 h-3" />{checkOuts}
                      </span>
                      <span className="flex items-center gap-1 text-blue-600" title={`${active} guest(s) staying`}>
                        <DoorOpen className="w-3 h-3" />{active}
                      </span>
                    </div>
                  );
                })()}
                {/* Hours Label */}
                <div className="flex w-full">
                  {hours.map(h => (
                    <div key={h} style={{ width: hourWidth }} className="shrink-0 text-[10px] text-muted-foreground font-medium text-center py-1 border-r border-border/50 last:border-r-0">
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
                  <div className="bg-muted text-sm font-bold text-foreground px-4 py-2 flex sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {category}
                  </div>

                  {catRooms.map((room) => {
                    // Check bookings for this room
                    const roomBookings = bookingsByRoom[room.id] || [];

                    return (
                      <div key={room.id} className="flex relative hover:bg-orange-50/30 group transition-colors">
                        {/* Room label sticky left */}
                        <div className="w-[200px] shrink-0 p-4 border-r border-border bg-card sticky left-0 z-20 flex flex-col justify-center group-hover:bg-orange-50/30 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] h-[100px]">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="font-bold text-lg text-primary truncate">Room {room.number}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${room.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {room.status}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-medium break-words w-full">Floor {room.floor} • ₹{room.tariff}/night</span>
                        </div>

                        {/* Day & Hour cells */}
                        <div className="flex relative items-center h-[100px]">
                          {days.map(day => (
                            <div key={day.dayNumber} className="flex h-full">
                              {hours.map(h => (
                                <div
                                  key={h}
                                  style={{ width: hourWidth }}
                                  onClick={() => handleCellClick(room.id, day.dateString, h)}
                                  className={`h-full shrink-0 border-r border-border/50 cursor-pointer hover:bg-muted transition-colors
                                            ${day.isWeekend ? 'bg-muted/50/50' : 'bg-transparent'}`}
                                ></div>
                              ))}
                            </div>
                          ))}

                          {/* Bookings Blocks Overlay */}
                          {roomBookings.map(booking => {
                            const guestMatch = guests.find(g => g.id === booking.guestId);
                            const guestName = guestMatch?.name || booking.guestId;

                            const parseDateTime = (dtStr: string, defaultHour: number) => {
                              if (dtStr.includes('T')) {
                                const [datePart, timePart] = dtStr.split('T');
                                const [y, m, d] = datePart.split('-');
                                const [h, min] = timePart.split(':');
                                return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), 0).getTime();
                              }
                              const [y, m, d] = dtStr.split('T')[0].split('-');
                              return new Date(Number(y), Number(m) - 1, Number(d), defaultHour, 0, 0).getTime();
                            };

                // Check-in default 12:00 PM
                const checkInTime = parseDateTime(booking.checkIn, 12);
                // Check-out default 11:00 AM
                const checkOutTime = parseDateTime(booking.checkOut, 11);

                            const monthStartTime = days[0].date.getTime();
                            const monthEndTime = days[days.length-1].date.getTime() + (24*60*60*1000);

                            // Skip if outside this day
                            if (checkOutTime <= monthStartTime || checkInTime >= monthEndTime) return null;

                            // Calculate position based on hours
                            const startOffsetHours = (checkInTime - monthStartTime) / (1000 * 60 * 60);
                            const endOffsetHours = (checkOutTime - monthStartTime) / (1000 * 60 * 60);

                            const boundedStart = Math.max(0, startOffsetHours);
                            const boundedEnd = Math.min(days.length * 24, endOffsetHours);

                            const durationHours = boundedEnd - boundedStart;

                            const isContinuation = checkInTime < monthStartTime;
                            const hasContinuation = checkOutTime > monthEndTime;

                            const leftPos = boundedStart * hourWidth;
                            const width = durationHours * hourWidth;

                            const bgColor = booking.status === 'Booked' ? 'bg-amber-500 hover:bg-amber-600' :
                                           booking.status === 'Confirmed' ? 'bg-blue-500 hover:bg-blue-600' :
                                           booking.status === 'Checked-In' ? 'bg-green-500 hover:bg-green-600' :
                                           'bg-muted hover:opacity-80'; // Checked-Out

                            return (
                              <div
                                key={booking.id}
                                className={`absolute top-[10px] h-[80px] ${bgColor} text-primary-foreground shadow-md text-xs leading-tight p-2.5 overflow-hidden z-10 cursor-pointer transition-all group/booking border border-white/20`}
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
                              >
                                <div className="flex flex-col h-full justify-between">
                                  {/* Top Row: Name and ID */}
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="font-bold text-sm truncate flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5 opacity-90" />
                                      {guestName}
                                    </div>
                                    <div className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0">
                                      {booking.id.split('-').pop()}
                                    </div>
                                  </div>

                                  {/* Middle Row: Status and Stay details */}
                                  <div className="flex gap-4 items-center mt-1 text-primary-foreground/90">
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <CalendarDays className="w-3 h-3 opacity-75" />
                                      {booking.nights} Night{booking.nights > 1 ? 's' : ''}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px]">
                                      <Users className="w-3 h-3 opacity-75" />
                                      {booking.adults}A {booking.children > 0 ? `${booking.children}C` : ''}
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-medium">
                                      <Key className="w-3 h-3 opacity-75" />
                                      {booking.status}
                                    </div>
                                  </div>

                                  {/* Bottom Row: Check-in / out specific times */}
                                  <div className="mt-auto pt-1 border-t border-white/20 flex justify-between items-center text-[10px] text-primary-foreground/80">
                                    <div className="flex items-center gap-1 font-medium">
                                      <Clock className="w-3 h-3" />
                                      In: {new Date(checkInTime).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                                    </div>
                                    <div className="flex items-center gap-1 font-medium">
                                      Out: {new Date(checkOutTime).toLocaleString('default', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}
                                      <Clock className="w-3 h-3" />
                                    </div>
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