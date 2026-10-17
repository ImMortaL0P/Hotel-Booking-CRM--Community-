import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { RoomCategory, RoomStatus, Room } from '../data/types';
import { Search, Home, DoorClosed, BedDouble, Filter, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function Rooms() {
  const { rooms, bookings, updateRoomStatus, markAllRoomsAvailable } = useData();
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | 'All'>('All');

  const filteredRooms = rooms.filter(r => {
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    return true;
  });

  const activeBookings = bookings.filter(b => b.status === 'Checked-In' || (b.status === 'Confirmed' && new Date(b.checkIn).toDateString() === new Date().toDateString()));

  // Group by category
  const groupedRooms: Record<RoomCategory, Room[]> = {
    'Double Bed Room': filteredRooms.filter(r => r.category === 'Double Bed Room'),
    'Family Bed Room': filteredRooms.filter(r => r.category === 'Family Bed Room'),
  };

  const statusColors: Record<RoomStatus, string> = {
    'Available': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25',
    'Occupied': 'bg-secondary text-foreground border-border',
    'Cleaning': 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
    'Maintenance': 'bg-primary/10 text-primary border-primary/25',
  };

  const statusIcons: Record<RoomStatus, React.ReactNode> = {
    'Available': <CheckCircle2 className="w-3 h-3" />,
    'Occupied': <AlertCircle className="w-3 h-3" />,
    'Cleaning': <Sparkles className="w-3 h-3" />,
    'Maintenance': <DoorClosed className="w-3 h-3" />,
  };

  const handleStatusChange = (roomId: string, newStatus: RoomStatus) => {
    updateRoomStatus(roomId, newStatus);
    toast.success(`Room status updated to ${newStatus}`);
  };

  const handleMarkAllAvailable = () => {
    markAllRoomsAvailable();
    toast.success('All rooms marked Available! ✨');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
          <p className="text-sm text-muted-foreground">Manage room status and availability across suites.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-card rounded-lg p-1 border border-border shadow-sm">
             <div className="flex items-center gap-1.5 px-3 py-1.5 border-r border-border">
               <CheckCircle2 className="w-4 h-4 text-emerald-600" />
               <span className="text-sm font-semibold">{rooms.filter(r => r.status === 'Available').length} Available</span>
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5">
               <AlertCircle className="w-4 h-4 text-blue-600" />
               <span className="text-sm font-semibold">{rooms.filter(r => r.status === 'Occupied').length} Occupied</span>
             </div>
          </div>
          <button
            onClick={handleMarkAllAvailable}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            title="Mark all rooms available and check out active stays"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark All Available</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground mr-2">Status:</span>
          {(['All', 'Available', 'Occupied', 'Cleaning', 'Maintenance'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-full border transition-colors cursor-pointer ${
                statusFilter === s ? 'bg-foreground text-background border-transparent font-semibold' : 'bg-secondary text-foreground border-border hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-muted/80 hidden md:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground mr-2">Category:</span>
          {(['All', 'Double Bed Room', 'Family Bed Room'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 text-xs font-mono font-medium rounded-full border transition-colors cursor-pointer ${
                categoryFilter === c ? 'bg-foreground text-background border-transparent font-semibold' : 'bg-secondary text-foreground border-border hover:bg-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Categories loop */}
      {(['Double Bed Room', 'Family Bed Room'] as RoomCategory[]).map(cat => {
        if (groupedRooms[cat].length === 0) return null;
        
        return (
          <div key={cat} className="space-y-4">
            <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2 border-b border-border pb-2">
              <BedDouble className="w-4 h-4 text-primary" /> 
              {cat} <span className="font-mono text-xs text-muted-foreground font-normal">({groupedRooms[cat].length})</span>
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {groupedRooms[cat].map(room => {
                const isOccupied = room.status === 'Occupied';
                const booking = isOccupied ? activeBookings.find(b => b.roomId === room.id && (b.status === 'Checked-In' || b.status === 'Confirmed')) : null;

                return (
                  <div key={room.id} className="bg-card rounded-lg border border-border shadow-none overflow-hidden flex flex-col hover:border-primary/60 transition-colors group">
                    <div className="p-3 border-b border-border/50 flex justify-between items-center bg-secondary/50">
                      <span className="text-lg font-mono font-bold text-foreground">{room.number}</span>
                      <span className="text-xs font-mono text-muted-foreground font-medium">F{room.floor}</span>
                    </div>
                    
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-sm font-mono font-semibold text-foreground">{formatCurrency(room.tariff)}/nt</span>
                      </div>

                      <div className="mt-auto">
                        {isOccupied && booking ? (
                          <div className="bg-muted/50 p-2 rounded text-xs mb-3 border border-border/50">
                             <p className="font-semibold text-foreground truncate">{booking.guestName}</p>
                             <p className="text-muted-foreground mt-1">Out: {formatDate(booking.checkOut)}</p>
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center text-xs text-muted-foreground italic mb-3 text-center">
                            {room.status === 'Available' ? 'Ready' : ''}
                          </div>
                        )}
                        
                        <div className="relative group/menu">
                          <button className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-bold border ${statusColors[room.status]}`}>
                            {statusIcons[room.status]} {room.status}
                          </button>
                            
                            {/* Hidden dropup menu on hover */}
                            <div className="absolute bottom-full left-0 w-full mb-1 bg-card border border-border rounded-md shadow-sm opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1 flex flex-col gap-1">
                              {(['Available', 'Cleaning', 'Maintenance'] as RoomStatus[]).filter(s => s !== 'Occupied' && s !== room.status).map(s => (
                                <button 
                                  key={s} 
                                  onClick={() => handleStatusChange(room.id, s)}
                                  className={`text-xs py-1.5 px-2 rounded text-left ${statusColors[s]} hover:opacity-80 transition-opacity`}
                                >
                                  Set to {s}
                                </button>
                              ))}
                            </div>
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
      
      {filteredRooms.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
           <Home className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
           <p className="text-muted-foreground font-medium">No rooms match these filters.</p>
        </div>
      )}
    </div>
  );
}
