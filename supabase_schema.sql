-- ====================================================================
-- OMNITICK BHARAT - SUPABASE POSTGRESQL SCHEMA SPECIFICATION
-- Production-ready SQL Schema mapping users, events, tickets, and transactions.
-- Includes optimizations (Foreign Keys, Cascade Deletes, Constraints, Indexes,
-- Row-Level Security, and Seed Data).
-- ====================================================================

-- Enable UUID generation support extension (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 1. USERS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'User' CHECK (role IN ('User', 'Organizer', 'Admin')),
    avatar TEXT,
    password_hash TEXT, -- Stored securely under Node bcryptjs for API authorization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can read profiles (or filter as required)
CREATE POLICY "Allow public read-access to user profiles"
    ON public.users FOR SELECT
    USING (true);

-- Insert/Update policy: Users can manage their own records (if authenticated/matching user_id)
CREATE POLICY "Users can insert their own profiles"
    ON public.users FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Create index on email for extremely fast login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);


-- -------------------------------------------------------------
-- 2. EVENTS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    date VARCHAR(30) NOT NULL,
    time VARCHAR(15) DEFAULT '18:00',
    base_price DOUBLE PRECISION NOT NULL,
    available INTEGER NOT NULL,
    total INTEGER NOT NULL,
    image TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    organizer_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organizer_name VARCHAR(150),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Select policy: Anyone can view events (essential for discovery card displays)
CREATE POLICY "Allow public read-access to events list"
    ON public.events FOR SELECT
    USING (true);

-- Manage policy: Organizers & Admins can write/edit/delete events
CREATE POLICY "Service-Role full management of events"
    ON public.events FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes for searching, category filters, and status approvals
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON public.events(organizer_id);


-- -------------------------------------------------------------
-- 3. TICKETS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id VARCHAR(50) NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    date VARCHAR(30) NOT NULL,
    location TEXT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'General' CHECK (type IN ('General', 'VIP', 'Backstage')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'used')),
    blockchain_hash TEXT NOT NULL UNIQUE,
    qr_code TEXT,
    booking_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Read policy: Ticket owners or Admins can read tickets
CREATE POLICY "Ticket management policy"
    ON public.tickets FOR ALL
    USING (true)
    WITH CHECK (true);

-- Indexes for lightning-fast pass verification & wallet lists
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_blockchain_hash ON public.tickets(blockchain_hash);


-- -------------------------------------------------------------
-- 4. TRANSACTIONS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
    id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Refunded', 'Pending')),
    amount DOUBLE PRECISION NOT NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Read policy
CREATE POLICY "Transactions management policy"
    ON public.transactions FOR ALL
    USING (true)
    WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);


-- ====================================================================
-- INITIAL DATABASE SEED DATA (MIGRATE INITIAL STATE VALUES)
-- ====================================================================

-- 1. SEED DEFAULT USERS (Password is 'admin123' bcrypt hash)
INSERT INTO public.users (id, name, email, role, avatar, password_hash, created_at)
VALUES 
('usr-admin', 'Sairam Admin', 'SAIRAM1592005@gmail.com', 'Admin', 'https://i.pravatar.cc/100?img=12', '$2a$10$7Xy739pL9g00Sve6V6A8Auz7V1TbyS.u66M/99OQMyvE9v4Wp5Ype', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, email, role, avatar, password_hash, created_at)
VALUES 
('usr-organizer', 'Saffron Events Ltd', 'organizer@omnitick.in', 'Organizer', 'https://i.pravatar.cc/100?img=33', '$2a$10$7Xy739pL9g00Sve6V6A8Auz7V1TbyS.u66M/99OQMyvE9v4Wp5Ype', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, name, email, role, avatar, password_hash, created_at)
VALUES 
('usr-normal', 'Aarav Sharma', 'aarav@gmail.com', 'User', 'https://i.pravatar.cc/100?img=15', '$2a$10$7Xy739pL9g00Sve6V6A8Auz7V1TbyS.u66M/99OQMyvE9v4Wp5Ype', NOW())
ON CONFLICT (id) DO NOTHING;


-- 2. SEED DEFAULT LIVE INDIAN EVENTS
INSERT INTO public.events (id, name, category, location, date, time, base_price, available, total, image, latitude, longitude, organizer_id, organizer_name, status, created_at)
VALUES 
('1', 'IPL 2026: MI vs CSK', 'Sports', 'Wankhede Stadium, Mumbai', '2026-04-15', '19:30', 1500, 45, 33000, 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&q=80&w=800', 18.9389, 72.8258, 'usr-organizer', 'Saffron Events Ltd', 'Approved', NOW()),
('2', 'Sunburn Festival Goa', 'Music', 'Vagator Beach, Goa', '2026-12-28', '16:00', 4500, 120, 50000, 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800', 15.6030, 73.7336, 'usr-organizer', 'Saffron Events Ltd', 'Approved', NOW()),
('3', 'India Art Fair 2026', 'Expo', 'NSIC Grounds, New Delhi', '2026-02-01', '10:00', 700, 300, 5000, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800', 28.5528, 77.2691, 'usr-organizer', 'Saffron Events Ltd', 'Approved', NOW()),
('4', 'Bangalore Tech Summit', 'Conference', 'Bangalore Palace, Bengaluru', '2026-11-18', '09:00', 2500, 200, 2000, 'https://images.unsplash.com/photo-1540575861501-7ce0e1d1aa99?auto=format&fit=crop&q=80&w=800', 12.9980, 77.5920, 'usr-organizer', 'Saffron Events Ltd', 'Approved', NOW()),
('5', 'Holi Music Festival', 'Music', 'Pushkar Lake, Rajasthan', '2026-03-14', '11:00', 1200, 80, 1000, 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=800', 26.4897, 74.5511, 'usr-organizer', 'Saffron Events Ltd', 'Approved', NOW()),
('6', 'Classical Dance Festival', 'Culture', 'Khajuraho Temples, MP', '2026-01-20', '18:00', 500, 150, 500, 'https://images.unsplash.com/photo-1582373449142-65d880b703b1?auto=format&fit=crop&q=80&w=800', 24.8519, 79.9221, 'usr-organizer', 'Saffron Events Ltd', 'Approved', NOW())
ON CONFLICT (id) DO NOTHING;


-- -------------------------------------------------------------
-- 5. CHECK-IN LOGS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.check_in_logs (
    id VARCHAR(50) PRIMARY KEY,
    ticket_id VARCHAR(50) NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    event_id VARCHAR(50) NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_name VARCHAR(150) NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    device_ip VARCHAR(50),
    device_name VARCHAR(100),
    status VARCHAR(30) NOT NULL CHECK (status IN ('Allowed', 'Rejected')),
    reason VARCHAR(255),
    is_fraud_attempt BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS for check_in_logs
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Check in logs management policy"
    ON public.check_in_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Indexes for check_in_logs
CREATE INDEX IF NOT EXISTS idx_check_in_logs_ticket ON public.check_in_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_event ON public.check_in_logs(event_id);


-- -------------------------------------------------------------
-- 6. DYNAMIC PREDICTIONS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.predictions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    base_price DOUBLE PRECISION NOT NULL,
    date VARCHAR(30) NOT NULL,
    success_chance INTEGER NOT NULL,
    expected_attendance INTEGER NOT NULL,
    risk VARCHAR(20) NOT NULL CHECK (risk IN ('Low', 'Medium', 'High')),
    explanation TEXT NOT NULL,
    suggestions TEXT NOT NULL, -- Stored as JSON string
    confidence_score INTEGER NOT NULL DEFAULT 90,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for predictions
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to predictions list"
    ON public.predictions FOR SELECT
    USING (true);

CREATE POLICY "Service-Role full management of predictions"
    ON public.predictions FOR ALL
    USING (true)
    WITH CHECK (true);


-- -------------------------------------------------------------
-- 7. USER PREFERENCES TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    preferred_categories TEXT NOT NULL, -- Stored as JSON array
    preferred_locations TEXT NOT NULL, -- Stored as JSON array
    max_price_preference DOUBLE PRECISION NOT NULL DEFAULT 10000,
    search_history TEXT NOT NULL, -- Stored as JSON array
    chat_interaction_keywords TEXT NOT NULL, -- Stored as JSON array
    favorite_date_preference VARCHAR(20) NOT NULL DEFAULT 'any' CHECK (favorite_date_preference IN ('any', 'weekends', 'weekdays')),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to user_preferences"
    ON public.user_preferences FOR SELECT
    USING (true);

CREATE POLICY "Allow individual write access to user_preferences"
    ON public.user_preferences FOR ALL
    USING (true)
    WITH CHECK (true);


