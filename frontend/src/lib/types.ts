export type Role = 'owner' | 'staff' | 'accountant';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  status?: UserStatus;
  email?: string;
  phone?: string;
  lineUserId?: string | null;
  lineLinkCode?: string | null;
  termsAcceptedAt?: string | null;
  termsVersion?: string | null;
  assignedProperties?: Array<{ id: string; name: string }>;
  createdAt?: string;
}

export type PropertyType = 'หอพัก' | 'บ้าน' | 'คอนโด';

export interface PropertyDetail {
  label: string;
  value: string;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  address?: string;
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  latitude?: string | null;
  longitude?: string | null;
  totalRooms: number;
  waterRate: string;
  electricityRate: string;
  description?: string;
  details: PropertyDetail[];
  images: string[];
  ownerId: string;
  rooms?: Room[];
}

export type RoomStatus = 'ว่าง' | 'ไม่ว่าง' | 'ซ่อม';

export interface Room {
  id: string;
  propertyId: string;
  roomNumber: string;
  roomType: string;
  baseRentPrice: string;
  status: RoomStatus;
  meterWaterInitial: string;
  meterElectricityInitial: string;
  description?: string;
  details: PropertyDetail[];
  images: string[];
  property?: { id: string; name: string };
  tenants?: Tenant[];
}

export type TenantStatus = 'เช่าอยู่' | 'หมดสัญญา' | 'ยกเลิก';

export interface Tenant {
  id: string;
  roomId: string;
  name: string;
  phone?: string;
  email?: string;
  idCard?: string;
  moveInDate?: string;
  contractEndDate?: string;
  depositAmount: string;
  status: TenantStatus;
  room?: Room;
}

export interface MeterReading {
  id: string;
  roomId: string;
  readingDate: string;
  waterPrevious: string;
  waterCurrent: string;
  electricityPrevious: string;
  electricityCurrent: string;
  waterUnitUsed: string;
  electricityUnitUsed: string;
  ocrStatus: 'Manual' | 'Scanned';
}

export interface PendingRoomReading {
  room: Room;
  latestReading: MeterReading | null;
  hasReadingThisMonth: boolean;
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  roomId: string;
  invoiceDate: string;
  billingMonth: string;
  baseRent: string;
  waterCharge: string;
  electricityCharge: string;
  otherCharges: string;
  totalAmount: string;
  status: InvoiceStatus;
  dueDate: string;
  room?: Room;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amountPaid: string;
  paymentMethod: 'bank_transfer' | 'qr' | 'cash';
  paymentReference?: string;
}

export interface MeetingMinute {
  id: string;
  title?: string;
  recordedByName: string;
  recordedByUserId: string;
  recordDate: string;
  location?: string;
  attendees?: string;
  content: string;
  details: PropertyDetail[];
  recipientIds: string[];
  recordedByUser?: { id: string; name: string };
  createdAt: string;
}

export type TransactionType = 'income' | 'expense';

export interface AppTransaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: string;
  date: string;
  description?: string;
  propertyId: string;
  property?: { id: string; name: string };
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  profit: number;
  byCategory: Array<{ type: TransactionType; category: string; amount: number }>;
}

export interface DashboardSummary {
  totalProperties: number;
  activeTenants: number;
  monthIncome: number;
  overdueInvoices: number;
  roomStatus: { total: number; occupied: number; vacant: number; maintenance: number };
  recentTransactions: Array<{
    id: string;
    type: 'income' | 'expense';
    category: string;
    amount: string;
    date: string;
    description?: string;
  }>;
}
