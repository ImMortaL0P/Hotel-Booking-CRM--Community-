import { useState } from 'react';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { RoomCategory, RoomStatus, Room } from '../data/types';
import { Search, Home, DoorClosed, BedDouble, Filter, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function Rooms() {
  const { rooms, bookings, updateRoomStatus } = useData();
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
    'Deluxe Double': filteredRooms.filter(r => r.category === 'Deluxe Double'),
    'Family Suite': filteredRooms.filter(r => r.category === 'Family Suite'),
  };

  const statusColors = {
    'Available': 'bg-green-100 text-green-800 border-green-200',
    'Occupied': 'bg-blue-100 text-blue-800 border-blue-200',
    'Cleaning': 'bg-amber-100 text-amber-800 border-amber-200',
    'Maintenance': 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIcons = {
    'Available': <CheckCircle2 className="w-3 h-3" />,
    'Occupied': <AlertCircle className="w-3 h-3" />,
    'Cleaning': <Sparkles className="w-3 h-3" />,
    'Maintenance': <DoorClosed className="w-3 h-3" />
  };

  const handleStatusChange = (roomId: string, newStatus: RoomStatus) => {
    updateRoomStatus(roomId, newStatus);
    toast.success(`Room status updated to ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2d1b1c]">Rooms</h1>
          <p className="text-sm text-gray-500">Manage room status and availability across 4 categories.</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-[#e6dfd8] shadow-sm">
           <div className="flex items-center gap-1 px-3 py-1 border-r border-[#e6dfd8]">
             <CheckCircle2 className="w-4 h-4 text-green-600" />
             <span className="text-sm font-semibold">{rooms.filter(r => r.status === 'Available').length} Available</span>
           </div>
           <div className="flex items-center gap-1 px-3 py-1">
             <AlertCircle className="w-4 h-4 text-blue-600" />
             <span className="text-sm font-semibold">{rooms.filter(r => r.status === 'Occupied').length} Occupied</span>
           </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-[#e6dfd8] shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 mr-2">Status:</span>
          {(['All', 'Available', 'Occupied', 'Cleaning', 'Maintenance'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                statusFilter === s ? 'bg-[#7B1E22] text-white border-[#7B1E22]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-600 mr-2">Category:</span>
          {(['All', 'Deluxe Double', 'Family Suite'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                categoryFilter === c ? 'bg-[#7B1E22] text-white border-[#7B1E22]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Categories loop */}
      {(['Deluxe Double', 'Family Suite'] as RoomCategory[]).map(cat => {
        if (groupedRooms[cat].length === 0) return null;
        
        return (
          <div key={cat} className="space-y-4">
            <h2 className="text-lg font-bold text-[#7B1E22] flex items-center gap-2 border-b border-[#e6dfd8] pb-2">
              <BedDouble className="w-5 h-5" /> 
              {cat} ({groupedRooms[cat].length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {groupedRooms[cat].map(room => {
                const isOccupied = room.status === 'Occupied';
                const booking = isOccupied ? activeBookings.find(b => b.roomId === room.id && (b.status === 'Checked-In' || b.status === 'Confirmed')) : null;

                return (
                  <div key={room.id} className="bg-white rounded-xl border border-[#e6dfd8] shadow-sm overflow-hidden flex flex-col hover:border-[#7B1E22] transition-colors group">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-[#FAF6F0]">
                      <span className="text-xl font-bold text-[#2d1b1c]">{room.number}</span>
                      <span className="text-xs text-gray-500 font-medium">Floor {room.floor}</span>
                    </div>
                    
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-sm font-semibold text-gray-700">{formatCurrency(room.tariff)}/nt</span>
                      </div>

                      <div className="mt-auto">
                        {isOccupied && booking ? (
                          <div className="bg-gray-50 p-2 rounded text-xs mb-3 border border-gray-100">
                             <p className="font-semibold text-gray-900 truncate">{booking.guestName}</p>
                             <p className="text-gray-500 mt-1">Out: {formatDate(booking.checkOut)}</p>
                          </div>
                        ) : (
                          <div className="h-12 flex items-center justify-center text-xs text-gray-400 italic mb-3">
                            {room.status === 'Available' ? 'Ready' : ''}
                          </div>
                        )}
                        
                        <div className="relative group/menu">
                          <button className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-bold border ${statusColors[room.status]}`}>
                            {statusIcons[room.status]} {room.status}
                          </button>
                          
                          {/* Hidden dropup menu on hover */}
                          <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-[#e6dfd8] rounded-md shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-10 p-1 flex flex-col gap-1">
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
        <div className="text-center py-12 bg-white rounded-xl border border-[#e6dfd8]">
           <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
           <p className="text-gray-500 font-medium">No rooms match these filters.</p>
        </div>
      )}
    </div>
  );
}
