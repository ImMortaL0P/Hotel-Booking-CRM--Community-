import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { mockBookings, mockCustomers, mockRooms } from '../lib/mockData';
import { Booking } from '../types';
import { Plus, Search, Calendar as CalendarIcon, Users } from 'lucide-react';

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddingBooking, setIsAddingBooking] = useState(false);

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.roomNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddBooking = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customerId = formData.get('customerId') as string;
    const roomId = formData.get('roomId') as string;
    const customer = mockCustomers.find(c => c.id === customerId);
    const room = mockRooms.find(r => r.id === roomId);
    
    if (!customer || !room) return;

    const checkIn = new Date(formData.get('checkIn') as string);
    const checkOut = new Date(formData.get('checkOut') as string);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const newBooking: Booking = {
      id: `B${String(bookings.length + 1).padStart(3, '0')}`,
      customerId: customer.id,
      customerName: customer.name,
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomType: room.type.charAt(0).toUpperCase() + room.type.slice(1),
      checkIn: formData.get('checkIn') as string,
      checkOut: formData.get('checkOut') as string,
      guests: parseInt(formData.get('guests') as string),
      status: 'confirmed',
      totalPrice: room.pricePerNight * nights,
      specialRequests: formData.get('specialRequests') as string,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setBookings([newBooking, ...bookings]);
    setIsAddingBooking(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'checked-in':
        return 'bg-green-100 text-green-700';
      case 'checked-out':
        return 'bg-gray-100 text-gray-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const updateBookingStatus = (bookingId: string, newStatus: Booking['status']) => {
    setBookings(bookings.map(b => 
      b.id === bookingId ? { ...b, status: newStatus } : b
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1>Bookings</h1>
          <p className="text-gray-600">Manage reservations and check-ins</p>
        </div>
        <Dialog open={isAddingBooking} onOpenChange={setIsAddingBooking}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBooking} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select name="customerId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="roomId">Room</Label>
                  <Select name="roomId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockRooms.filter(r => r.status === 'available').map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.roomNumber} - {room.type} (${room.pricePerNight}/night)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkIn">Check-in Date</Label>
                  <Input id="checkIn" name="checkIn" type="date" required />
                </div>
                <div>
                  <Label htmlFor="checkOut">Check-out Date</Label>
                  <Input id="checkOut" name="checkOut" type="date" required />
                </div>
              </div>
              <div>
                <Label htmlFor="guests">Number of Guests</Label>
                <Input id="guests" name="guests" type="number" min="1" defaultValue="1" required />
              </div>
              <div>
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Input id="specialRequests" name="specialRequests" placeholder="Optional" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddingBooking(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Booking</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search by customer name, booking ID, or room number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked-in">Checked In</SelectItem>
            <SelectItem value="checked-out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List */}
      <Card className="transition-all duration-300 hover:shadow-xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">Booking ID</th>
                  <th className="px-6 py-4 text-left">Customer</th>
                  <th className="px-6 py-4 text-left">Room</th>
                  <th className="px-6 py-4 text-left">Check-in</th>
                  <th className="px-6 py-4 text-left">Check-out</th>
                  <th className="px-6 py-4 text-left">Guests</th>
                  <th className="px-6 py-4 text-left">Total</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{booking.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">{booking.customerName}</p>
                        {booking.specialRequests && (
                          <p className="text-gray-500">{booking.specialRequests}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-900">Room {booking.roomNumber}</p>
                        <p className="text-gray-500">{booking.roomType}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{booking.checkIn}</td>
                    <td className="px-6 py-4 text-gray-900">{booking.checkOut}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-gray-900">
                        <Users className="w-4 h-4" />
                        {booking.guests}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">${booking.totalPrice}</td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Select 
                        value={booking.status}
                        onValueChange={(value) => updateBookingStatus(booking.id, value as Booking['status'])}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="checked-in">Check In</SelectItem>
                          <SelectItem value="checked-out">Check Out</SelectItem>
                          <SelectItem value="cancelled">Cancel</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}