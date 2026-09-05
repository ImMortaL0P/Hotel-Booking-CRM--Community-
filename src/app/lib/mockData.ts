import { Customer, Booking, Room, AdminUser } from '../types';

export const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    totalBookings: 12,
    totalSpent: 8400,
    vipStatus: true,
    createdAt: '2023-01-15',
    lastBooking: '2024-10-20',
    address: '123 Main St, New York, NY',
    notes: 'Prefers room on high floors'
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 234-5678',
    totalBookings: 5,
    totalSpent: 2800,
    vipStatus: false,
    createdAt: '2023-06-20',
    lastBooking: '2024-09-15',
    address: '456 Oak Ave, San Francisco, CA'
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@email.com',
    phone: '+1 (555) 345-6789',
    totalBookings: 8,
    totalSpent: 5600,
    vipStatus: true,
    createdAt: '2023-03-10',
    lastBooking: '2024-11-01',
    notes: 'Allergic to feather pillows'
  },
  {
    id: '4',
    name: 'David Williams',
    email: 'david.w@email.com',
    phone: '+1 (555) 456-7890',
    totalBookings: 3,
    totalSpent: 1500,
    vipStatus: false,
    createdAt: '2024-02-05',
    lastBooking: '2024-08-12'
  },
  {
    id: '5',
    name: 'Jessica Martinez',
    email: 'jessica.m@email.com',
    phone: '+1 (555) 567-8901',
    totalBookings: 15,
    totalSpent: 12000,
    vipStatus: true,
    createdAt: '2022-11-20',
    lastBooking: '2024-11-10',
    notes: 'Regular business traveler'
  }
];

export const mockBookings: Booking[] = [
  {
    id: 'B001',
    customerId: '1',
    customerName: 'Sarah Johnson',
    roomId: 'R101',
    roomNumber: '101',
    roomType: 'Suite',
    checkIn: '2024-11-15',
    checkOut: '2024-11-18',
    guests: 2,
    status: 'checked-in',
    totalPrice: 900,
    specialRequests: 'Late checkout requested',
    createdAt: '2024-11-01'
  },
  {
    id: 'B002',
    customerId: '3',
    customerName: 'Emily Rodriguez',
    roomId: 'R205',
    roomNumber: '205',
    roomType: 'Deluxe',
    checkIn: '2024-11-16',
    checkOut: '2024-11-20',
    guests: 2,
    status: 'confirmed',
    totalPrice: 800,
    specialRequests: 'Hypoallergenic pillows',
    createdAt: '2024-10-28'
  },
  {
    id: 'B003',
    customerId: '5',
    customerName: 'Jessica Martinez',
    roomId: 'R302',
    roomNumber: '302',
    roomType: 'Double',
    checkIn: '2024-11-12',
    checkOut: '2024-11-14',
    guests: 1,
    status: 'checked-out',
    totalPrice: 300,
    createdAt: '2024-11-05'
  },
  {
    id: 'B004',
    customerId: '2',
    customerName: 'Michael Chen',
    roomId: 'R401',
    roomNumber: '401',
    roomType: 'Suite',
    checkIn: '2024-11-20',
    checkOut: '2024-11-25',
    guests: 3,
    status: 'confirmed',
    totalPrice: 1500,
    createdAt: '2024-11-08'
  },
  {
    id: 'B005',
    customerId: '4',
    customerName: 'David Williams',
    roomId: 'R103',
    roomNumber: '103',
    roomType: 'Single',
    checkIn: '2024-11-14',
    checkOut: '2024-11-16',
    guests: 1,
    status: 'checked-in',
    totalPrice: 200,
    createdAt: '2024-11-10'
  }
];

export const mockRooms: Room[] = [
  {
    id: 'R101',
    roomNumber: '101',
    type: 'suite',
    status: 'occupied',
    pricePerNight: 300,
    floor: 1,
    capacity: 4,
    amenities: ['King Bed', 'Ocean View', 'Mini Bar', 'Balcony', 'Jacuzzi']
  },
  {
    id: 'R102',
    roomNumber: '102',
    type: 'deluxe',
    status: 'available',
    pricePerNight: 200,
    floor: 1,
    capacity: 3,
    amenities: ['Queen Bed', 'City View', 'Mini Bar', 'Workspace']
  },
  {
    id: 'R103',
    roomNumber: '103',
    type: 'single',
    status: 'occupied',
    pricePerNight: 100,
    floor: 1,
    capacity: 1,
    amenities: ['Single Bed', 'WiFi', 'TV']
  },
  {
    id: 'R201',
    roomNumber: '201',
    type: 'double',
    status: 'available',
    pricePerNight: 150,
    floor: 2,
    capacity: 2,
    amenities: ['Double Bed', 'WiFi', 'TV', 'Mini Fridge']
  },
  {
    id: 'R205',
    roomNumber: '205',
    type: 'deluxe',
    status: 'available',
    pricePerNight: 200,
    floor: 2,
    capacity: 3,
    amenities: ['Queen Bed', 'Ocean View', 'Mini Bar', 'Balcony']
  },
  {
    id: 'R302',
    roomNumber: '302',
    type: 'double',
    status: 'cleaning',
    pricePerNight: 150,
    floor: 3,
    capacity: 2,
    amenities: ['Double Bed', 'WiFi', 'TV', 'Mini Fridge']
  },
  {
    id: 'R401',
    roomNumber: '401',
    type: 'suite',
    status: 'available',
    pricePerNight: 300,
    floor: 4,
    capacity: 4,
    amenities: ['King Bed', 'Penthouse View', 'Full Kitchen', 'Living Room', 'Jacuzzi']
  },
  {
    id: 'R402',
    roomNumber: '402',
    type: 'suite',
    status: 'maintenance',
    pricePerNight: 300,
    floor: 4,
    capacity: 4,
    amenities: ['King Bed', 'Ocean View', 'Mini Bar', 'Balcony']
  }
];

export const mockAdminUsers: AdminUser[] = [
  {
    id: 'A001',
    name: 'John Smith',
    email: 'john.smith@hotelcrm.com',
    role: 'super-admin',
    department: 'Management',
    phone: '+1 (555) 100-1000',
    status: 'active',
    permissions: ['all'],
    createdAt: '2023-01-10',
    lastLogin: '2024-11-14'
  },
  {
    id: 'A002',
    name: 'Emma Wilson',
    email: 'emma.wilson@hotelcrm.com',
    role: 'manager',
    department: 'Operations',
    phone: '+1 (555) 100-1001',
    status: 'active',
    permissions: ['bookings', 'customers', 'rooms', 'reports'],
    createdAt: '2023-03-15',
    lastLogin: '2024-11-13'
  },
  {
    id: 'A003',
    name: 'Michael Brown',
    email: 'michael.brown@hotelcrm.com',
    role: 'receptionist',
    department: 'Front Desk',
    phone: '+1 (555) 100-1002',
    status: 'active',
    permissions: ['bookings', 'customers', 'check-in'],
    createdAt: '2023-06-20',
    lastLogin: '2024-11-14'
  },
  {
    id: 'A004',
    name: 'Sophia Davis',
    email: 'sophia.davis@hotelcrm.com',
    role: 'receptionist',
    department: 'Front Desk',
    phone: '+1 (555) 100-1003',
    status: 'active',
    permissions: ['bookings', 'customers', 'check-in'],
    createdAt: '2023-08-12',
    lastLogin: '2024-11-14'
  },
  {
    id: 'A005',
    name: 'James Miller',
    email: 'james.miller@hotelcrm.com',
    role: 'staff',
    department: 'Housekeeping',
    phone: '+1 (555) 100-1004',
    status: 'active',
    permissions: ['rooms'],
    createdAt: '2024-01-05',
    lastLogin: '2024-11-13'
  },
  {
    id: 'A006',
    name: 'Olivia Garcia',
    email: 'olivia.garcia@hotelcrm.com',
    role: 'staff',
    department: 'Maintenance',
    phone: '+1 (555) 100-1005',
    status: 'inactive',
    permissions: ['rooms'],
    createdAt: '2023-11-20',
    lastLogin: '2024-10-28'
  }
];