export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBookings: number;
  totalSpent: number;
  vipStatus: boolean;
  createdAt: string;
  lastBooking?: string;
  address?: string;
  notes?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  totalPrice: number;
  specialRequests?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  type: 'single' | 'double' | 'suite' | 'deluxe';
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  pricePerNight: number;
  floor: number;
  capacity: number;
  amenities: string[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'manager' | 'receptionist' | 'staff';
  department: string;
  phone: string;
  avatar?: string;
  status: 'active' | 'inactive';
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}