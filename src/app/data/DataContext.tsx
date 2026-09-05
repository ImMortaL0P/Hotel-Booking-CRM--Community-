import React, { createContext, useContext, useState, useEffect } from 'react';
import { Room, Guest, Booking, PaymentTransaction, CommRecord, User } from './types';

interface DataContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  
  rooms: Room[];
  updateRoomStatus: (roomId: string, status: Room['status']) => void;
  
  guests: Guest[];
  addGuest: (guest: Guest) => void;
  updateGuest: (guest: Guest) => void;
  
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBooking: (booking: Booking) => void;
  deleteBooking: (bookingId: string) => void;
  
  payments: PaymentTransaction[];
  addPayment: (payment: PaymentTransaction) => void;
  
  comms: CommRecord[];
  addComm: (comm: CommRecord) => void;
  
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [comms, setComms] = useState<CommRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/initialize`)
      .then(res => res.json())
      .then(data => {
        setRooms(data.rooms || []);
        setGuests(data.guests || []);
        setBookings(data.bookings || []);
        setPayments(data.payments || []);
        setComms(data.comms || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load initial data from Atlas', err);
        setIsLoading(false);
      });
  }, []);

  // Sync room statuses based on bookings automatically
  useEffect(() => {
    if (isLoading || rooms.length === 0) return;
    
    // Auto sync logic simplified
    setRooms(prevRooms => prevRooms.map(room => {
      const activeBooking = bookings.find(b => b.roomId === room.id && (b.status === 'Checked-In'));
      if (activeBooking) return { ...room, status: 'Occupied' as const };
            
      return { ...room, status: room.status === 'Occupied' ? 'Available' : room.status };
    }));
  }, [bookings, isLoading]); // only reruns when bookings change

  const login = (userData: User) => setUser(userData);
  const logout = () => setUser(null);

  const updateRoomStatus = (roomId: string, status: Room['status']) => {
    // Optimistic
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status } : r));
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/rooms/${roomId}`, {
       method: 'PUT',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify({ status })
    }).catch(console.error);
  };

  const addGuest = (guest: Guest) => {
    setGuests(prev => [guest, ...prev]);
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/guests`, {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(guest)
    }).catch(console.error);
  };
  
  const updateGuest = (guest: Guest) => {
    setGuests(prev => prev.map(g => g.id === guest.id ? guest : g));
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/guests/${guest.id}`, {
       method: 'PUT',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(guest)
    }).catch(console.error);
  };

  const addBooking = (booking: Booking) => {
    setBookings(prev => [booking, ...prev]);
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/bookings`, {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(booking)
    }).catch(console.error);
  };

  const updateBooking = (booking: Booking) => {
    setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/bookings/${booking.id}`, {
       method: 'PUT',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(booking)
    }).catch(console.error);
  };
  
  const deleteBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/bookings/${bookingId}`, { method: 'DELETE' }).catch(console.error);
  };

  const addPayment = (payment: PaymentTransaction) => {
    setPayments(prev => [payment, ...prev]);
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/payments`, {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(payment)
    }).then(() => {
      // Refresh logic since payment affects bookings & guests
      // Realistically we can just optimistic update here too.
      const booking = bookings.find(b => b.id === payment.bookingId);
      if (booking) {
        const newPaid = booking.paid + payment.amount;
        const newBalance = booking.total - newPaid;
        updateBooking({ ...booking, paid: newPaid, balance: newBalance });
        
        const guest = guests.find(g => g.id === payment.guestId);
        if (guest) {
          updateGuest({ ...guest, totalSpent: guest.totalSpent + payment.amount });
        }
      }
    }).catch(console.error);
  };

  const addComm = (comm: CommRecord) => {
    setComms(prev => [comm, ...prev]);
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/comms`, {
       method: 'POST',
       headers: {'Content-Type': 'application/json'},
       body: JSON.stringify(comm)
    }).catch(console.error);
  };

  return (
    <DataContext.Provider value={{
      user, login, logout,
      rooms, updateRoomStatus,
      guests, addGuest, updateGuest,
      bookings, addBooking, updateBooking, deleteBooking,
      payments, addPayment,
      comms, addComm,
      isLoading
    }}>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center bg-[#FAF6F0]">
          <div className="text-center">
             <div className="w-12 h-12 border-4 border-[#7B1E22] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-gray-600 font-medium">Connecting to ShardaCRM Platform...</p>
          </div>
        </div>
      ) : children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
