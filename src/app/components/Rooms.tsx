import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { mockRooms } from '../lib/mockData';
import { Room } from '../types';
import { Bed, Wifi, Coffee, Tv, Wind } from 'lucide-react';

export function Rooms() {
  const [rooms, setRooms] = useState<Room[]>(mockRooms);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRooms = rooms.filter((room) => {
    const matchesType = typeFilter === 'all' || room.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-700';
      case 'occupied':
        return 'bg-blue-100 text-blue-700';
      case 'maintenance':
        return 'bg-orange-100 text-orange-700';
      case 'cleaning':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'suite':
        return 'bg-purple-100 text-purple-700';
      case 'deluxe':
        return 'bg-blue-100 text-blue-700';
      case 'double':
        return 'bg-green-100 text-green-700';
      case 'single':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const updateRoomStatus = (roomId: string, newStatus: Room['status']) => {
    setRooms(rooms.map(r => 
      r.id === roomId ? { ...r, status: newStatus } : r
    ));
  };

  const roomsByFloor = rooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, Room[]>);

  const stats = {
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length
  };

  return (
    <div>
      <div className="mb-8">
        <h1>Room Management</h1>
        <p className="text-gray-600">View and manage hotel room inventory</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-green-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 group-hover:text-green-700 transition-colors">Available</p>
                <p className="text-gray-900 group-hover:text-green-900 transition-colors">{stats.available} rooms</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Bed className="w-6 h-6 text-green-600 group-hover:text-primary-foreground transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-blue-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 group-hover:text-blue-700 transition-colors">Occupied</p>
                <p className="text-gray-900 group-hover:text-blue-900 transition-colors">{stats.occupied} rooms</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Bed className="w-6 h-6 text-blue-600 group-hover:text-primary-foreground transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-yellow-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 group-hover:text-yellow-700 transition-colors">Cleaning</p>
                <p className="text-gray-900 group-hover:text-yellow-900 transition-colors">{stats.cleaning} rooms</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Bed className="w-6 h-6 text-yellow-600 group-hover:text-primary-foreground transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-orange-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 group-hover:text-orange-700 transition-colors">Maintenance</p>
                <p className="text-gray-900 group-hover:text-orange-900 transition-colors">{stats.maintenance} rooms</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <Bed className="w-6 h-6 text-orange-600 group-hover:text-primary-foreground transition-colors" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="double">Double</SelectItem>
            <SelectItem value="deluxe">Deluxe</SelectItem>
            <SelectItem value="suite">Suite</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map((room) => (
          <Card key={room.id} className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:scale-[1.02] hover:border-purple-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="group-hover:text-purple-700 transition-colors">Room {room.roomNumber}</CardTitle>
                <Badge className={getStatusColor(room.status)}>
                  {room.status}
                </Badge>
              </div>
              <div className="flex gap-2 mt-2">
                <Badge className={getTypeColor(room.type)}>
                  {room.type}
                </Badge>
                <Badge variant="outline">
                  Floor {room.floor}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Price per night</span>
                  <span className="text-gray-900 group-hover:text-purple-700 transition-colors">${room.pricePerNight}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Capacity</span>
                  <span className="text-gray-900">{room.capacity} guests</span>
                </div>

                <div>
                  <p className="text-gray-600 mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.slice(0, 4).map((amenity) => (
                      <div
                        key={amenity}
                        className="px-2 py-1 bg-gray-100 rounded text-gray-700 group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors"
                      >
                        {amenity}
                      </div>
                    ))}
                    {room.amenities.length > 4 && (
                      <div className="px-2 py-1 bg-gray-100 rounded text-gray-700 group-hover:bg-purple-50 group-hover:text-purple-700 transition-colors">
                        +{room.amenities.length - 4} more
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Label className="mb-2 block text-gray-700">Update Status</Label>
                  <Select
                    value={room.status}
                    onValueChange={(value) => updateRoomStatus(room.id, value as Room['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" variant="outline">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Label({ children, className = '', ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}