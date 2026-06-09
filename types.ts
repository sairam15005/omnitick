export enum IntentType {
  BOOK_TICKET = 'BOOK_TICKET',
  CHECK_AVAILABILITY = 'CHECK_AVAILABILITY',
  EVENT_INFO = 'EVENT_INFO',
  CANCEL_BOOKING = 'CANCEL_BOOKING',
  GENERAL_QUERY = 'GENERAL_QUERY'
}

export type UserRole = 'User' | 'Organizer' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
}

export interface Ticket {
  id: string;
  userId: string;
  eventId: string;
  eventName: string;
  date: string;
  location: string;
  price: number;
  type: 'General' | 'VIP' | 'Backstage';
  status: 'active' | 'cancelled' | 'used';
  blockchainHash: string; // Stored SHA-256 hash
  qrCode: string;
  bookingDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: IntentType;
  entities?: Record<string, any>;
  isTyping?: boolean;
}

export interface Event {
  id: string;
  name: string;
  category: string;
  location: string;
  date: string;
  time?: string;
  basePrice: number;
  available: number;
  total: number;
  image: string;
  latitude: number;
  longitude: number;
  organizerId: string;
  organizerName?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  isPublished?: boolean;
}

export interface Transaction {
  id: string;
  ticketId: string;
  paymentStatus: 'Paid' | 'Refunded' | 'Pending';
  amount: number;
  userId: string;
  createdAt: string;
}

export interface CheckInLog {
  id: string;
  ticketId: string;
  eventId: string;
  eventName: string;
  userId: string;
  userName: string;
  entryTime: string;
  deviceIp?: string;
  deviceName?: string;
  status: 'Allowed' | 'Rejected';
  reason?: string;
  isFraudAttempt: boolean;
  blockchainHash?: string;
}

export interface AnalyticsData {
  name: string;
  demand: number;
  sales: number;
}

export interface EventPrediction {
  id?: string;
  name: string;
  category: string;
  location: string;
  basePrice: number;
  date: string;
  successChance: number;
  expectedAttendance: number;
  risk: 'Low' | 'Medium' | 'High';
  explanation: string;
  suggestions: string[];
  confidenceScore: number;
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  preferredCategories: string[];
  preferredLocations: string[];
  maxPricePreference: number;
  searchHistory: string[];
  chatInteractionKeywords: string[];
  favoriteDatePreference: 'any' | 'weekends' | 'weekdays';
  updatedAt: string;
}
