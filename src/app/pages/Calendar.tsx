import { useState, useMemo } from 'react';
import { useData } from '../data/DataContext';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { NewBookingModal } from '../components/NewBookingModal';

export function Calendar() {
  const { rooms, bookings } = useData();
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 8, 1)); // September 2026
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [prefilledBooking, setPrefilledBooking] = useState<{roomId?: string, checkIn?: string, checkOut?: string}>({});

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return {
      date: d,
      dayNumber: i + 1,
      dayName: d.toLocaleString('default', { weekday: 'short' }),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dateString: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    };
  });

  // Calculate daily occupancy %
  const dailyOccupancy = days.map(day => {
    let occupied = 0;
    rooms.forEach(room => {
      const isOccupied = bookings.some(b => {
        if (b.roomId !== room.id || b.status === 'Cancelled') return false;
        // Check if day.date String is between checkIn and checkOut (exclusive of checkout date itself usually for occupancy, but let's do inclusive of night of)
        const checkIn = new Date(b.checkIn).getTime();
        const checkOut = new Date(b.checkOut).getTime();
        const current = day.date.getTime();
        return current >= checkIn && current < checkOut;
      });
      if (isOccupied) occupied++;
    });
    return Math.round((occupied / rooms.length) * 100);
  });

  const handleCellClick = (roomId: string, dateString: string) => {
    // Create checkOut as next day
    const checkInDate = new Date(dateString);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 1);
    const checkOutString = `${checkOutDate.getFullYear()}-${String(checkOutDate.getMonth() + 1).padStart(2, '0')}-${String(checkOutDate.getDate()).padStart(2, '0')}`;

    setPrefilledBooking({
      roomId,
      checkIn: dateString,
      checkOut: checkOutString
    });
    setIsBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[#e6dfd8] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#e6dfd8] flex items-center justify-between shrink-0 bg-[#FAF6F0]">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[#2d1b1c] w-48">{monthName}</h1>
          <div className="flex bg-white rounded border border-[#e6dfd8] overflow-hidden shadow-sm">
            <button onClick={prevMonth} className="px-2 py-1 hover:bg-gray-50 border-r border-[#e6dfd8] text-gray-600"><ChevronLeft className="w-5 h-5"/></button>
            <button onClick={() => setCurrentDate(new Date(2026, 8, 1))} className="px-4 py-1 text-sm font-semibold hover:bg-gray-50 text-gray-700">Today</button>
            <button onClick={nextMonth} className="px-2 py-1 hover:bg-gray-50 border-l border-[#e6dfd8] text-gray-600"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-[#7B1E22] rounded-sm"></div> Confirmed/Checked-In</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded-sm"></div> Pending</div>
        </div>
      </div>

      {/* Wrapper for scrolling */}
      <div className="flex-1 overflow-auto relative">
        <div style={{ width: `calc(150px + ${daysInMonth * 40}px)` }} className="min-w-full">
          
          {/* Days Header */}
          <div className="flex border-b border-[#e6dfd8] sticky top-0 z-20 bg-white">
            <div className="w-[150px] shrink-0 p-3 border-r border-[#e6dfd8] bg-gray-50 font-semibold text-xs text-gray-500 uppercase flex items-end">
              Room
            </div>
            {days.map(day => (
              <div 
                key={day.dayNumber} 
                className={`w-[40px] shrink-0 border-r border-[#e6dfd8] p-1 flex flex-col items-center justify-center text-xs
                            ${day.isWeekend ? 'bg-gray-50' : 'bg-white'}`}
              >
                <span className="text-gray-400 font-medium">{day.dayName.charAt(0)}</span>
                <span className={`font-bold ${day.dateString === '2026-09-02' ? 'bg-[#7B1E22] text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-900'}`}>
                  {day.dayNumber}
                </span>
              </div>
            ))}
          </div>

          {/* Occupancy Strip */}
          <div className="flex border-b border-[#e6dfd8] bg-gray-50 sticky top-[61px] z-10">
            <div className="w-[150px] shrink-0 p-2 border-r border-[#e6dfd8] text-xs font-semibold text-gray-500 text-right">
              Occupancy %
            </div>
            {dailyOccupancy.map((occ, i) => (
              <div key={i} className={`w-[40px] shrink-0 border-r border-[#e6dfd8] text-[9px] font-bold flex items-center justify-center
                ${occ > 80 ? 'text-green-700 bg-green-100' : occ > 50 ? 'text-amber-700 bg-amber-100' : 'text-gray-500'}`}>
                {occ}%
              </div>
            ))}
          </div>

          {/* Rooms Grid */}
          <div className="divide-y divide-[#e6dfd8]">
            {['Deluxe Double', 'Family Suite'].map((category) => {
              const catRooms = rooms.filter(r => r.category === category);
              
              return (
                <div key={category}>
                  {/* Category separator */}
                  <div className="bg-gray-100 text-xs font-bold text-gray-500 px-3 py-1 flex sticky left-0 z-10">
                    {category}
                  </div>
                  
                  {catRooms.map(room => {
                    // Check bookings for this room
                    const roomBookings = bookings.filter(b => b.roomId === room.id && b.status !== 'Cancelled');
                    
                    return (
                      <div key={room.id} className="flex relative hover:bg-gray-50 group">
                        {/* Room label sticky left */}
                        <div className="w-[150px] shrink-0 p-2 border-r border-[#e6dfd8] bg-white sticky left-0 z-10 font-medium text-sm flex items-center justify-between group-hover:bg-gray-50">
                          <span className="font-bold text-[#7B1E22]">{room.number}</span>
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">Fl {room.floor}</span>
                        </div>
                        
                        {/* Day cells */}
                        <div className="flex relative">
                          {days.map(day => (
                             <div 
                               key={day.dayNumber}
                               onClick={() => handleCellClick(room.id, day.dateString)}
                               className={`w-[40px] h-[40px] shrink-0 border-r border-[#e6dfd8] cursor-pointer hover:bg-red-50 transition-colors
                                          ${day.isWeekend ? 'bg-gray-50/50' : 'bg-transparent'}`}
                             ></div>
                          ))}
                          
                          {/* Bookings Blocks Overlay */}
                          {roomBookings.map(booking => {
                            const checkInTime = new Date(booking.checkIn).getTime();
                            const checkOutTime = new Date(booking.checkOut).getTime();
                            const monthStartTime = days[0].date.getTime();
                            const monthEndTime = days[days.length-1].date.getTime() + (24*60*60*1000);
                            
                            // Skip if outside this month
                            if (checkOutTime <= monthStartTime || checkInTime >= monthEndTime) return null;
                            
                            // Calculate positions
                            const startIdx = Math.max(0, Math.floor((checkInTime - monthStartTime) / (24*60*60*1000)));
                            const endIdx = Math.min(daysInMonth, Math.floor((checkOutTime - monthStartTime) / (24*60*60*1000)));
                            const duration = endIdx - startIdx;
                            
                            // Starts before this month?
                            const isContinuation = checkInTime < monthStartTime;
                            // Ends after this month?
                            const hasContinuation = checkOutTime > monthEndTime;
                            
                            const leftPos = startIdx * 40;
                            const width = duration * 40;
                            
                            const bgColor = booking.status === 'Pending' ? 'bg-amber-500 hover:bg-amber-600' : 
                                           booking.status === 'Checked-Out' ? 'bg-gray-400 hover:bg-gray-500' : 
                                           'bg-[#7B1E22] hover:bg-[#8C1D24]';

                            return (
                              <div
                                key={booking.id}
                                className={`absolute h-[32px] top-[4px] ${bgColor} text-white shadow-sm rounded-sm text-[10px] leading-tight p-1 overflow-hidden z-20 cursor-pointer transition-colors group/booking`}
                                style={{ 
                                  left: `${leftPos}px`, 
                                  width: `${width}px`,
                                  borderTopLeftRadius: isContinuation ? '0' : '4px',
                                  borderBottomLeftRadius: isContinuation ? '0' : '4px',
                                  borderTopRightRadius: hasContinuation ? '0' : '4px',
                                  borderBottomRightRadius: hasContinuation ? '0' : '4px',
                                  opacity: 0.95
                                }}
                                onClick={(e) => { e.stopPropagation(); /* would open booking detail */ }}
                                title={`${booking.guestName} (${booking.id})\n${booking.status}`}
                              >
                                <div className="font-bold truncate">{booking.guestName}</div>
                                <div className="opacity-80 truncate">{booking.id}</div>
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
          defaultRoomId={prefilledBooking.roomId} defaultDate={prefilledBooking.checkIn}
        />
      )}
    </div>
  );
}
