export type Role = 'manager' | 'front-desk' | 'superadmin' | 'owner';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
};

export type RoomCategory = 'Double Bed Room' | 'Family Bed Room';

export type RoomStatus = 'Available' | 'Occupied' | 'Maintenance' | 'Cleaning';

export interface Room {
  id: string;
  number: string;
  category: RoomCategory;
  floor: number;
  status: RoomStatus;
  tariff: number;
}

export type IDProofType = 'Aadhaar' | 'Voter ID' | 'PAN' | 'Driving Licence' | 'Passport';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  idProofType: IDProofType;
  idProofNumber: string;
  totalStays: number;
  lastStay: string;
  totalSpent: number;
  isVIP: boolean;
  notes?: string;
  avatarInitial: string;
}

export type BookingStatus = 'Booked' | 'Confirmed' | 'Checked-In' | 'Checked-Out';

export interface Booking {
  id: string;      // SP-2026-###
  guestId: string;
  roomId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string;
  adults: number;
  children: number;
  nights: number;
  subtotal: number;
  gst: number;     // 12%
  total: number;
  paid: number;
  balance: number;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';

export interface PaymentTransaction {
  id: string;      // RCPT-###
  bookingId: string;
  guestId: string;
  date: string;    // YYYY-MM-DD
  mode: PaymentMode;
  amount: number;
  status: 'Completed' | 'Pending' | 'Refunded';
}

export type CommsChannel = 'Email' | 'WhatsApp' | 'SMS';

export interface CommRecord {
  id: string;
  guestId: string;
  channel: CommsChannel;
  template: string;
  timestamp: string; // ISO or human string
  status: 'Delivered' | 'Sent' | 'Failed';
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  userId: string;
  userName: string;
  timestamp: string;
}

export type ExpenseCategory = 'Staff Payment' | 'Maintenance' | 'Furniture' | 'Utility' | 'Inventory' | 'Other';

export interface Expense {
  id: string;
  date: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  roomId?: string; // e.g. "ROOM_ID" or blank if property-wide
  recordedBy: string;
}

export interface StandaloneInvoice {
  id: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  items: { description: string; amount: number }[];
  subtotal: number;
  gst: number;
  total: number;
}

export interface StoredInvoiceData {
  id?: string;
  invoiceId: string;
  date: string;
  billedTo: {
    name: string;
    address: string;
    cityState: string;
    phone: string;
    idPrefix?: string;
  };
  checkIn?: string;
  checkOut?: string;
  roomPlan?: string;
  paymentStatus: string;
  items: {
    id: number;
    description: string;
    unitPrice: number;
    qty: number;
    discount: number;
    gstPct: number;
    amount: number;
  }[];
  subtotal: number;
  gstTotal: number;
  total: number;
  staySummary?: {
    nights: number;
    adults: number;
    children: number;
    room: string;
    paymentMode: string;
    amountReceived: number;
    balance: number;
  };
}
