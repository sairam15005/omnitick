import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { User, Event, Ticket, Transaction, CheckInLog, EventPrediction, UserPreferences } from '../types';

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure the data directory exists
const ensureDataDirectory = () => {
  try {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err: any) {
    console.warn("[Database Warn] Failed to create data directory (expected on read-only serverless environments):", err.message);
  }
};

export interface DatabaseSchema {
  users: User[];
  events: Event[];
  tickets: Ticket[];
  transactions: Transaction[];
  checkInLogs?: CheckInLog[]; // optional to support existing local files without crash but will be initialized
  predictions?: EventPrediction[];
  userPreferences?: UserPreferences[];
  ledger?: any[];
}

const INITIAL_SCHEMA: DatabaseSchema = {
  users: [
    {
      id: "usr-admin",
      name: "Sairam Admin",
      email: "SAIRAM1592005@gmail.com",
      role: "Admin",
      avatar: "https://i.pravatar.cc/100?img=12",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-organizer",
      name: "Saffron Events Ltd",
      email: "organizer@omnitick.in",
      role: "Organizer",
      avatar: "https://i.pravatar.cc/100?img=33",
      createdAt: new Date().toISOString()
    },
    {
      id: "usr-normal",
      name: "Aarav Sharma",
      email: "aarav@gmail.com",
      role: "User",
      avatar: "https://i.pravatar.cc/100?img=15",
      createdAt: new Date().toISOString()
    }
  ],
  events: [
    { 
      id: '1', 
      name: 'IPL 2026: MI vs CSK', 
      category: 'Sports', 
      location: 'Wankhede Stadium, Mumbai', 
      date: '2026-04-15', 
      time: '19:30',
      basePrice: 1500, 
      available: 45, 
      total: 33000, 
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800',
      latitude: 18.9389,
      longitude: 72.8258,
      organizerId: 'usr-organizer',
      organizerName: 'Saffron Events Ltd',
      status: 'Approved',
      isPublished: true
    },
    { 
      id: '2', 
      name: 'Sunburn Festival Goa', 
      category: 'Music', 
      location: 'Vagator Beach, Goa', 
      date: '2026-12-28', 
      time: '16:00',
      basePrice: 4500, 
      available: 120, 
      total: 50000, 
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
      latitude: 15.6030,
      longitude: 73.7336,
      organizerId: 'usr-organizer',
      organizerName: 'Saffron Events Ltd',
      status: 'Approved',
      isPublished: true
    },
    { 
      id: '3', 
      name: 'India Art Fair 2026', 
      category: 'Expo', 
      location: 'NSIC Grounds, New Delhi', 
      date: '2026-02-01', 
      time: '10:00',
      basePrice: 700, 
      available: 300, 
      total: 5000, 
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
      latitude: 28.5528,
      longitude: 77.2691,
      organizerId: 'usr-organizer',
      organizerName: 'Saffron Events Ltd',
      status: 'Approved',
      isPublished: true
    },
    { 
      id: '4', 
      name: 'Bangalore Tech Summit', 
      category: 'Conference', 
      location: 'Bangalore Palace, Bengaluru', 
      date: '2026-11-18', 
      time: '09:00',
      basePrice: 2500, 
      available: 200, 
      total: 2000, 
      image: 'https://images.unsplash.com/photo-1540575861501-7ce0e1d1aa99?auto=format&fit=crop&q=80&w=800',
      latitude: 12.9980,
      longitude: 77.5920,
      organizerId: 'usr-organizer',
      organizerName: 'Saffron Events Ltd',
      status: 'Approved',
      isPublished: true
    },
    { 
      id: '5', 
      name: 'Holi Music Festival', 
      category: 'Music', 
      location: 'Pushkar Lake, Rajasthan', 
      date: '2026-03-14', 
      time: '11:00',
      basePrice: 1200, 
      available: 80, 
      total: 1000, 
      image: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=800',
      latitude: 26.4897,
      longitude: 74.5511,
      organizerId: 'usr-organizer',
      organizerName: 'Saffron Events Ltd',
      status: 'Approved',
      isPublished: true
    },
    { 
      id: '6', 
      name: 'Classical Dance Festival', 
      category: 'Culture', 
      location: 'Khajuraho Temples, MP', 
      date: '2026-01-20', 
      time: '18:00',
      basePrice: 500, 
      available: 150, 
      total: 500, 
      image: 'https://images.unsplash.com/photo-1582373449142-65d880b703b1?auto=format&fit=crop&q=80&w=800',
      latitude: 24.8519,
      longitude: 79.9221,
      organizerId: 'usr-organizer',
      organizerName: 'Saffron Events Ltd',
      status: 'Approved',
      isPublished: true
    }
  ],
  tickets: [],
  transactions: [],
  checkInLogs: [],
  predictions: [],
  userPreferences: []
};

// Plain JS Password hashing fallback values for simple demo passwords
export const demoPasswords: Record<string, string> = {
  "SAIRAM1592005@gmail.com": "$2a$10$7Xy739pL9g00Sve6V6A8Auz7V1TbyS.u66M/99OQMyvE9v4Wp5Ype", // admin123
  "organizer@omnitick.in": "$2a$10$7Xy739pL9g00Sve6V6A8Auz7V1TbyS.u66M/99OQMyvE9v4Wp5Ype", // admin123
  "aarav@gmail.com": "$2a$10$7Xy739pL9g00Sve6V6A8Auz7V1TbyS.u66M/99OQMyvE9v4Wp5Ype" // admin123
};

// --- LAZY SUPABASE INITIALIZATION ENGINE ---
let supabaseInstance: any = null;
let wrappedSupabaseInstance: any = null;
const disabledTables = new Set<string>();

const isTableEnabled = (tableName: string): boolean => {
  return !disabledTables.has(tableName);
};

// Safe Query Proxy Helpers to capture Supabase connection/network failures
function makeSafeProxy(target: any, tableName: string): any {
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === 'then') {
        const originalThen = obj.then;
        if (typeof originalThen === 'function') {
          return (onfulfilled?: any, onrejected?: any) => {
            const wrappedPromise = new Promise((resolve) => {
              originalThen.call(
                obj,
                (val: any) => {
                  if (val && typeof val === 'object') {
                    if (val.error) {
                      const errMsg = val.error.message || '';
                      if (errMsg.includes("Could not find") || errMsg.includes("relation") || errMsg.includes("cache")) {
                        disabledTables.add(tableName);
                      }
                    }
                  }
                  resolve(val);
                },
                (err: any) => {
                  disabledTables.add(tableName);
                  console.warn(`[Database Proxy Fallback] Supabase query on table '${tableName}' failed:`, err?.message || err);
                  resolve({ data: null, error: err });
                }
              );
            });
            return wrappedPromise.then(onfulfilled, onrejected);
          };
        }
      }

      const val = obj[prop];
      if (typeof val === 'function') {
        return (...args: any[]) => {
          const res = val.apply(obj, args);
          if (res && (typeof res === 'object' || typeof res === 'function')) {
            return makeSafeProxy(res, tableName);
          }
          return res;
        };
      }
      if (val && (typeof val === 'object' || typeof val === 'function')) {
        return makeSafeProxy(val, tableName);
      }
      return val;
    }
  });
}

const wrapSupabaseClient = (client: any) => {
  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'from') {
        return (tableName: string) => {
          const builder = target.from(tableName);
          return makeSafeProxy(builder, tableName);
        };
      }
      const val = target[prop];
      if (typeof val === 'function') {
        return (...args: any[]) => val.apply(target, args);
      }
      return val;
    }
  });
};

const getSupabaseClient = () => {
  if (wrappedSupabaseInstance) return wrappedSupabaseInstance;
  if (supabaseInstance) {
    wrappedSupabaseInstance = wrapSupabaseClient(supabaseInstance);
    return wrappedSupabaseInstance;
  }

  const url = process.env.SUPABASE_URL;
  // Prioritize service role key on server-side to safley bypass RLS configs for operators/admins
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false
        }
      });
      console.log("⚡ [OmniTick Base] Supabase database client integrated successfully.");
      wrappedSupabaseInstance = wrapSupabaseClient(supabaseInstance);
      return wrappedSupabaseInstance;
    } catch (err) {
      console.warn("[Database Warn] Failed to initiate Supabase client:", err);
    }
  }
  return null;
};

// --- DATA ACCESS TRANSLATION HELPERS ---
const mapUserFromDb = (row: any): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  avatar: row.avatar || undefined,
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined
});

const mapUserToDb = (usr: User, passwordHash?: string): any => {
  return {
    id: usr.id,
    name: usr.name,
    email: usr.email,
    role: usr.role,
    avatar: usr.avatar,
    created_at: usr.createdAt || new Date().toISOString(),
    password_hash: passwordHash
  };
};

const mapEventFromDb = (row: any): Event => ({
  id: row.id,
  name: row.name,
  category: row.category,
  location: row.location,
  date: row.date,
  time: row.time || undefined,
  basePrice: Number(row.base_price),
  available: Number(row.available),
  total: Number(row.total),
  image: row.image,
  latitude: Number(row.latitude),
  longitude: Number(row.longitude),
  organizerId: row.organizer_id,
  organizerName: row.organizer_name || undefined,
  status: row.status,
  isPublished: !!row.is_published
});

const mapEventToDb = (evt: Partial<Event>): any => {
  const row: any = {};
  if (evt.id !== undefined) row.id = evt.id;
  if (evt.name !== undefined) row.name = evt.name;
  if (evt.category !== undefined) row.category = evt.category;
  if (evt.location !== undefined) row.location = evt.location;
  if (evt.date !== undefined) row.date = evt.date;
  if (evt.time !== undefined) row.time = evt.time;
  if (evt.basePrice !== undefined) row.base_price = evt.basePrice;
  if (evt.available !== undefined) row.available = evt.available;
  if (evt.total !== undefined) row.total = evt.total;
  if (evt.image !== undefined) row.image = evt.image;
  if (evt.latitude !== undefined) row.latitude = evt.latitude;
  if (evt.longitude !== undefined) row.longitude = evt.longitude;
  if (evt.organizerId !== undefined) row.organizer_id = evt.organizerId;
  if (evt.organizerName !== undefined) row.organizer_name = evt.organizerName;
  if (evt.status !== undefined) row.status = evt.status;
  if (evt.isPublished !== undefined) row.is_published = evt.isPublished;
  return row;
};

const mapTicketFromDb = (row: any): Ticket => ({
  id: row.id,
  userId: row.user_id || row.userId,
  eventId: row.event_id || row.eventId,
  eventName: row.event_name || row.eventName,
  date: row.date,
  location: row.location,
  price: Number(row.price),
  type: row.type,
  status: row.status,
  blockchainHash: row.blockchain_hash || row.blockchainHash,
  qrCode: row.qr_code || row.qrCode,
  bookingDate: row.booking_date ? new Date(row.booking_date).toISOString() : (row.bookingDate ? new Date(row.bookingDate).toISOString() : new Date().toISOString())
});

const mapTicketToDb = (tkt: Ticket): any => ({
  id: tkt.id,
  user_id: tkt.userId,
  event_id: tkt.eventId,
  event_name: tkt.eventName,
  date: tkt.date,
  location: tkt.location,
  price: tkt.price,
  type: tkt.type,
  status: tkt.status,
  blockchain_hash: tkt.blockchainHash,
  qr_code: tkt.qrCode,
  booking_date: tkt.bookingDate || new Date().toISOString()
});

const mapTransactionFromDb = (row: any): Transaction => ({
  id: row.id,
  ticketId: row.ticket_id || row.ticketId,
  paymentStatus: row.payment_status || row.paymentStatus,
  amount: Number(row.amount),
  userId: row.user_id || row.userId,
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : (row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString())
});

const mapTransactionToDb = (tx: Transaction): any => ({
  id: tx.id,
  ticket_id: tx.ticketId,
  payment_status: tx.paymentStatus,
  amount: tx.amount,
  user_id: tx.userId,
  created_at: tx.createdAt || new Date().toISOString()
});

const mapCheckInLogFromDb = (row: any): CheckInLog => ({
  id: row.id,
  ticketId: row.ticket_id || row.ticketId,
  eventId: row.event_id || row.eventId,
  eventName: row.event_name || row.eventName,
  userId: row.user_id || row.userId,
  userName: row.user_name || row.userName,
  entryTime: row.entry_time ? new Date(row.entry_time).toISOString() : (row.entryTime ? new Date(row.entryTime).toISOString() : new Date().toISOString()),
  deviceIp: row.device_ip || row.deviceIp || undefined,
  deviceName: row.device_name || row.deviceName || undefined,
  status: row.status as any,
  reason: row.reason || undefined,
  isFraudAttempt: !!(row.is_fraud_attempt || row.isFraudAttempt),
  blockchainHash: row.blockchain_hash || row.blockchainHash || undefined
});

const mapCheckInLogToDb = (log: CheckInLog): any => ({
  id: log.id,
  ticket_id: log.ticketId,
  event_id: log.eventId,
  event_name: log.eventName,
  user_id: log.userId,
  user_name: log.userName,
  entry_time: log.entryTime || new Date().toISOString(),
  device_ip: log.deviceIp || null,
  device_name: log.deviceName || null,
  status: log.status,
  reason: log.reason || null,
  is_fraud_attempt: log.isFraudAttempt,
  blockchain_hash: log.blockchainHash || null
});


// -------------------------------------------------------------
// MAIN DATABASE CLASS IMPLEMENTATION WITH DYNAMICS UPGRADES
// -------------------------------------------------------------
export class Database {
  private static load(): DatabaseSchema {
    try {
      ensureDataDirectory();
      if (!fs.existsSync(DB_FILE_PATH)) {
        try {
          fs.writeFileSync(DB_FILE_PATH, JSON.stringify(INITIAL_SCHEMA, null, 2), 'utf-8');
        } catch (writeErr: any) {
          console.warn("[Database Warn] Failed to write initial schema file locally (using memory instead):", writeErr.message);
        }
        return INITIAL_SCHEMA;
      }
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content) as DatabaseSchema;
      if (!parsed.predictions) {
        parsed.predictions = [];
      }
      if (!parsed.userPreferences) {
        parsed.userPreferences = [];
      }
      return parsed;
    } catch (e: any) {
      console.warn("[Database Fallback] Failed to read database file, defaulting to in-memory INITIAL_SCHEMA:", e.message);
      return INITIAL_SCHEMA;
    }
  }

  private static save(data: DatabaseSchema) {
    try {
      ensureDataDirectory();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e: any) {
      console.warn("[Database Warn] Failed to save database update to disk (this is normal on read-only serverless platforms):", e.message);
    }
  }

  // --- Users API ---
  public static async getUsers(): Promise<User[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('users')) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('users');
        }
        console.warn("[Database Fallback] getUsers via local JSON cache:", error.message);
      } else if (data) {
        return data.map(mapUserFromDb);
      }
    }
    return this.load().users;
  }

  public static async getUserById(id: string): Promise<User | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('users')) {
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('users');
        }
        console.warn(`[Database Fallback] getUserById(${id}) via local JSON cache:`, error.message);
      } else if (data) {
        if (data.password_hash) {
          demoPasswords[data.email.toLowerCase()] = data.password_hash;
        }
        return mapUserFromDb(data);
      }
    }
    const localUser = this.load().users.find(u => u.id === id);
    if (localUser && (localUser as any).password_hash) {
      demoPasswords[localUser.email.toLowerCase()] = (localUser as any).password_hash;
    }
    return localUser;
  }

  public static async getUserByEmail(email: string): Promise<User | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('users')) {
      const { data, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('users');
        }
        console.warn(`[Database Fallback] getUserByEmail(${email}) via local JSON cache:`, error.message);
      } else if (data) {
        if (data.password_hash) {
          demoPasswords[email.toLowerCase()] = data.password_hash;
        }
        return mapUserFromDb(data);
      }
    }
    const localUser = this.load().users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (localUser && (localUser as any).password_hash) {
      demoPasswords[email.toLowerCase()] = (localUser as any).password_hash;
    }
    return localUser;
  }

  public static async createUser(user: User): Promise<User> {
    const supabase = getSupabaseClient();
    const hash = demoPasswords[user.email.toLowerCase()];
    if (supabase && isTableEnabled('users')) {
      const { error } = await supabase.from('users').insert(mapUserToDb(user, hash));
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('users');
        }
        console.warn("[Database Fallback] createUser fell back to local storage:", error.message);
      } else {
        return user;
      }
    }
    const data = this.load();
    data.users.push(user);
    this.save(data);
    return user;
  }

  public static async updateUserRole(userId: string, role: string): Promise<User | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('users')) {
      const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select()
        .maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('users');
        }
        console.warn("[Database Fallback] updateUserRole fell back to local storage:", error.message);
      } else if (data) {
        return mapUserFromDb(data);
      }
    }
    const data = this.load();
    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      data.users[userIndex].role = role as any;
      this.save(data);
      return data.users[userIndex];
    }
    return undefined;
  }

  // --- Events API ---
  public static async getEvents(): Promise<Event[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('events')) {
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('events');
        }
        console.warn("[Database Fallback] getEvents via local JSON cache:", error.message);
      } else if (data) {
        return data.map(mapEventFromDb);
      }
    }
    return this.load().events;
  }

  public static async getEventById(id: string): Promise<Event | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('events')) {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('events');
        }
        console.warn(`[Database Fallback] getEventById(${id}) via local JSON cache:`, error.message);
      } else if (data) {
        return mapEventFromDb(data);
      }
    }
    return this.load().events.find(e => e.id === id);
  }

  public static async createEvent(event: Event): Promise<Event> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('events')) {
      const { error } = await supabase.from('events').insert(mapEventToDb(event));
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('events');
        }
        console.warn("[Database Fallback] createEvent fell back to local storage:", error.message);
      } else {
        return event;
      }
    }
    const data = this.load();
    data.events.push(event);
    this.save(data);
    return event;
  }

  public static async updateEvent(id: string, updatedEvent: Partial<Event>): Promise<Event | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('events')) {
      const { data, error } = await supabase
        .from('events')
        .update(mapEventToDb(updatedEvent))
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('events');
        }
        console.warn(`[Database Fallback] updateEvent(${id}) fell back to local storage:`, error.message);
      } else if (data) {
        return mapEventFromDb(data);
      }
    }
    const data = this.load();
    const index = data.events.findIndex(e => e.id === id);
    if (index !== -1) {
      data.events[index] = { ...data.events[index], ...updatedEvent };
      this.save(data);
      return data.events[index];
    }
    return undefined;
  }

  public static async deleteEvent(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('events')) {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('events');
        }
        console.warn(`[Database Fallback] deleteEvent(${id}) fell back to local storage:`, error.message);
      } else {
        return true;
      }
    }
    const data = this.load();
    const initialLen = data.events.length;
    data.events = data.events.filter(e => e.id !== id);
    this.save(data);
    return data.events.length < initialLen;
  }

  // --- Tickets API ---
  public static async getTickets(): Promise<Ticket[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('tickets')) {
      const { data, error } = await supabase.from('tickets').select('*');
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('tickets');
        }
        console.warn("[Database Fallback] getTickets via local JSON cache:", error.message);
      } else if (data) {
        return data.map(mapTicketFromDb);
      }
    }
    return this.load().tickets;
  }

  public static async getTicketsByUserId(userId: string): Promise<Ticket[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('tickets')) {
      const { data, error } = await supabase.from('tickets').select('*').eq('user_id', userId);
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('tickets');
        }
        console.warn(`[Database Fallback] getTicketsByUserId(${userId}) via local JSON cache:`, error.message);
      } else if (data) {
        return data.map(mapTicketFromDb);
      }
    }
    return this.load().tickets.filter(t => t.userId === userId);
  }

  public static async getTicketById(id: string): Promise<Ticket | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('tickets')) {
      const { data, error } = await supabase.from('tickets').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('tickets');
        }
        console.warn(`[Database Fallback] getTicketById(${id}) via local JSON cache:`, error.message);
      } else if (data) {
        return mapTicketFromDb(data);
      }
    }
    return this.load().tickets.find(t => t.id === id);
  }

  public static async getTicketByHash(hash: string): Promise<Ticket | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('tickets')) {
      const { data, error } = await supabase.from('tickets').select('*').eq('blockchain_hash', hash).maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('tickets');
        }
        console.warn("[Database Fallback] getTicketByHash via local JSON cache:", error.message);
      } else if (data) {
        return mapTicketFromDb(data);
      }
    }
    return this.load().tickets.find(t => t.blockchainHash === hash);
  }

  public static async createTicket(ticket: Ticket): Promise<Ticket> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('tickets')) {
      const { error } = await supabase.from('tickets').insert(mapTicketToDb(ticket));
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('tickets');
        }
        console.warn("[Database Fallback] createTicket fell back to local storage:", error.message);
      } else {
        return ticket;
      }
    }
    const data = this.load();
    data.tickets.push(ticket);
    this.save(data);
    return ticket;
  }

  public static async updateTicketStatus(id: string, status: 'active' | 'cancelled' | 'used'): Promise<Ticket | undefined> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('tickets')) {
      const { data, error } = await supabase
        .from('tickets')
        .update({ status })
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('tickets');
        }
        console.warn(`[Database Fallback] updateTicketStatus(${id}) fell back to local storage:`, error.message);
      } else if (data) {
        return mapTicketFromDb(data);
      }
    }
    const data = this.load();
    const index = data.tickets.findIndex(t => t.id === id);
    if (index !== -1) {
      data.tickets[index].status = status;
      this.save(data);
      return data.tickets[index];
    }
    return undefined;
  }

  // --- Transactions API ---
  public static async getTransactions(): Promise<Transaction[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('transactions')) {
      const { data, error } = await supabase.from('transactions').select('*');
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('transactions');
        }
        console.warn("[Database Fallback] getTransactions via local JSON cache:", error.message);
      } else if (data) {
        return data.map(mapTransactionFromDb);
      }
    }
    return this.load().transactions;
  }

  public static async createTransaction(tx: Transaction): Promise<Transaction> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('transactions')) {
      const { error } = await supabase.from('transactions').insert(mapTransactionToDb(tx));
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('transactions');
        }
        console.warn("[Database Fallback] createTransaction fell back to local storage:", error.message);
      } else {
        return tx;
      }
    }
    const data = this.load();
    data.transactions.push(tx);
    this.save(data);
    return tx;
  }

  // --- Check-In Logs API ---
  public static async getCheckInLogs(): Promise<CheckInLog[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('check_in_logs')) {
      const { data, error } = await supabase.from('check_in_logs').select('*').order('entry_time', { ascending: false });
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('check_in_logs');
        }
        console.warn("[Database Fallback] getCheckInLogs via local JSON cache:", error.message);
      } else if (data) {
        return data.map(mapCheckInLogFromDb);
      }
    }
    const local = this.load();
    return (local.checkInLogs || []).sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
  }

  public static async createCheckInLog(log: CheckInLog): Promise<CheckInLog> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('check_in_logs')) {
      const { error } = await supabase.from('check_in_logs').insert(mapCheckInLogToDb(log));
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('check_in_logs');
        }
        console.warn("[Database Fallback] createCheckInLog fell back to local storage:", error.message);
      } else {
        return log;
      }
    }
    const data = this.load();
    if (!data.checkInLogs) {
      data.checkInLogs = [];
    }
    data.checkInLogs.push(log);
    this.save(data);
    return log;
  }

  public static async getPredictions(): Promise<EventPrediction[]> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('predictions')) {
      const { data, error } = await supabase.from('predictions').select('*');
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('predictions');
        }
        console.warn("[Database Fallback] getPredictions fell back to local storage:", error.message);
      } else if (data) {
        return data.map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          location: p.location,
          basePrice: p.base_price,
          date: p.date,
          successChance: p.success_chance,
          expectedAttendance: p.expected_attendance,
          risk: p.risk,
          explanation: p.explanation,
          suggestions: typeof p.suggestions === 'string' ? JSON.parse(p.suggestions) : p.suggestions,
          confidenceScore: p.confidence_score,
          createdAt: p.created_at
        }));
      }
    }
    const local = this.load();
    return (local.predictions || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static async createPrediction(pred: EventPrediction): Promise<EventPrediction> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('predictions')) {
      const dbPred = {
        id: pred.id || `pred-${Math.random().toString(36).substr(2, 9)}`,
        name: pred.name,
        category: pred.category,
        location: pred.location,
        base_price: pred.basePrice,
        date: pred.date,
        success_chance: pred.successChance,
        expected_attendance: pred.expectedAttendance,
        risk: pred.risk,
        explanation: pred.explanation,
        suggestions: JSON.stringify(pred.suggestions),
        confidence_score: pred.confidenceScore,
        created_at: pred.createdAt
      };
      const { error } = await supabase.from('predictions').insert(dbPred);
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('predictions');
        }
        console.warn("[Database Fallback] createPrediction fell back to local storage:", error.message);
      } else {
        return { ...pred, id: dbPred.id };
      }
    }
    const data = this.load();
    if (!data.predictions) {
      data.predictions = [];
    }
    const newPred = { ...pred, id: pred.id || `pred-${Math.random().toString(36).substr(2, 9)}` };
    data.predictions.push(newPred);
    this.save(data);
    return newPred;
  }

  public static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('user_preferences')) {
      const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle();
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('user_preferences');
        }
        console.warn("[Database Fallback] getUserPreferences fell back to local storage:", error.message);
      } else if (data) {
        return {
          userId: data.user_id,
          preferredCategories: typeof data.preferred_categories === 'string' ? JSON.parse(data.preferred_categories) : data.preferred_categories,
          preferredLocations: typeof data.preferred_locations === 'string' ? JSON.parse(data.preferred_locations) : data.preferred_locations,
          maxPricePreference: data.max_price_preference,
          searchHistory: typeof data.search_history === 'string' ? JSON.parse(data.search_history) : data.search_history,
          chatInteractionKeywords: typeof data.chat_interaction_keywords === 'string' ? JSON.parse(data.chat_interaction_keywords) : data.chat_interaction_keywords,
          favoriteDatePreference: data.favorite_date_preference,
          updatedAt: data.updated_at
        };
      }
    }
    const local = this.load();
    const found = (local.userPreferences || []).find(up => up.userId === userId);
    if (found) {
      return found;
    }
    return {
      userId,
      preferredCategories: [],
      preferredLocations: [],
      maxPricePreference: 10000,
      searchHistory: [],
      chatInteractionKeywords: [],
      favoriteDatePreference: 'any',
      updatedAt: new Date().toISOString()
    };
  }

  public static async saveUserPreferences(prefs: UserPreferences): Promise<UserPreferences> {
    const supabase = getSupabaseClient();
    if (supabase && isTableEnabled('user_preferences')) {
      const dbPrefs = {
        user_id: prefs.userId,
        preferred_categories: JSON.stringify(prefs.preferredCategories),
        preferred_locations: JSON.stringify(prefs.preferredLocations),
        max_price_preference: prefs.maxPricePreference,
        search_history: JSON.stringify(prefs.searchHistory),
        chat_interaction_keywords: JSON.stringify(prefs.chatInteractionKeywords),
        favorite_date_preference: prefs.favoriteDatePreference,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('user_preferences').upsert(dbPrefs);
      if (error) {
        if (error.message.includes("Could not find") || error.message.includes("relation") || error.message.includes("cache")) {
          disabledTables.add('user_preferences');
        }
        console.warn("[Database Fallback] saveUserPreferences fell back to local storage:", error.message);
      } else {
        return { ...prefs, updatedAt: dbPrefs.updated_at };
      }
    }
    const data = this.load();
    if (!data.userPreferences) {
      data.userPreferences = [];
    }
    const index = data.userPreferences.findIndex(up => up.userId === prefs.userId);
    const updatedPref = { ...prefs, updatedAt: new Date().toISOString() };
    if (index !== -1) {
      data.userPreferences[index] = updatedPref;
    } else {
      data.userPreferences.push(updatedPref);
    }
    this.save(data);
    return updatedPref;
  }
}
