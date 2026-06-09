import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Ticket as TicketIcon, 
  ShieldCheck, 
  Activity,
  Menu,
  Compass,
  Bell,
  Sparkles,
  LogOut,
  MapPin,
  Settings
} from 'lucide-react';
import ChatInterface from './components/ChatInterface';
import Dashboard from './components/Dashboard';
import TicketWallet from './components/TicketWallet';
import Ledger from './components/Ledger';
import EventExplorer from './components/EventExplorer';
import MapExplorer from './components/MapExplorer';
import Checkout from './components/Checkout';
import AuthPage from './components/AuthPage';
import OrganizerDashboard from './components/OrganizerDashboard';
import AdminDashboard from './components/AdminDashboard';
import VoiceBookingWidget from './components/VoiceBookingWidget';
import { Event, Ticket, User } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'explore' | 'map' | 'chat' | 'dashboard' | 'wallet' | 'ledger' | 'organizer' | 'admin'>('explore');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [networkLatency, setNetworkLatency] = useState<number>(45);

  // 1. Fetch Events from backend dynamically
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Failed to load events database, Bhai:", err);
    }
  };

  // 2. Fetch Tickets for the logged-in attendee
  const fetchTickets = async (authToken: string) => {
    try {
      const response = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (err) {
      console.error("Failed to fetch tickets wallet, Bhai:", err);
    }
  };

  // 3. Authenticate and resume sessions on mount
  useEffect(() => {
    const startSync = async () => {
      const params = new URLSearchParams(window.location.search);
      const demoParam = params.get('demo');

      let savedToken = sessionStorage.getItem('omni_jwt') || localStorage.getItem('omni_jwt');

      if (demoParam) {
        let demoEmail = '';
        if (demoParam === 'admin') demoEmail = 'SAIRAM1592005@gmail.com';
        else if (demoParam === 'organizer') demoEmail = 'organizer@omnitick.in';
        else if (demoParam === 'user') demoEmail = 'aarav@gmail.com';

        if (demoEmail) {
          try {
            const loginRes = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: demoEmail, password: 'admin123' })
            });
            if (loginRes.ok) {
              const loginData = await loginRes.json();
              savedToken = loginData.token;
              // Clean query parameter from URL
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (e) {
            console.error("Auto login failed for:", demoParam, e);
          }
        }
      }

      if (savedToken) {
        setToken(savedToken);
        sessionStorage.setItem('omni_jwt', savedToken);
        localStorage.setItem('omni_jwt', savedToken);
        try {
          // Verify with server
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            sessionStorage.setItem('omni_user_data', JSON.stringify(data.user));
            localStorage.setItem('omni_user_data', JSON.stringify(data.user));
            fetchTickets(savedToken);
          } else {
            // Token expired or invalid
            sessionStorage.removeItem('omni_jwt');
            sessionStorage.removeItem('omni_user_data');
            localStorage.removeItem('omni_jwt');
            localStorage.removeItem('omni_user_data');
          }
        } catch (e) {
          console.error("Failed to verify me session:", e);
        }
      }
      fetchEvents();

      // Simple mock ping latency monitor
      const interval = setInterval(() => {
        setNetworkLatency(Math.floor(Math.random() * 20) + 30);
      }, 5000);
      return () => clearInterval(interval);
    };

    startSync();
  }, []);

  const handleAuth = (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);
    sessionStorage.setItem('omni_user_data', JSON.stringify(userData));
    sessionStorage.setItem('omni_jwt', userToken);
    localStorage.setItem('omni_user_data', JSON.stringify(userData));
    localStorage.setItem('omni_jwt', userToken);
    fetchTickets(userToken);
    fetchEvents();
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('omni_jwt');
    sessionStorage.removeItem('omni_user_data');
    localStorage.removeItem('omni_jwt');
    localStorage.removeItem('omni_user_data');
    setTickets([]);
  };

  // 4. Ticket checkout completed callback
  const handleConfirmPurchase = (ticket: Ticket) => {
    if (token) fetchTickets(token);
    setSelectedEvent(null);
    setActiveTab('wallet');
  };

  // 5. Organizer Action Functions
  const handleCreateEvent = async (newEventData: any) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newEventData)
      });
      if (response.ok) {
        fetchEvents();
      } else {
        const err = await response.json();
        alert(`Could not list event: ${err.error}`);
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleEditEvent = async (id: string, updatedData: any) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });
      if (response.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 6. Admin Action Functions
  const handleApproveEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectEvent = async (id: string) => {
    try {
      const response = await fetch(`/api/events/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) {
    return <AuthPage onAuth={handleAuth} />;
  }

  // Generate dynamic tab navigation items based on User roles
  const navItems = [
    { id: 'explore', label: 'Explore Events', icon: Compass },
    { id: 'map', label: 'Explore Map', icon: MapPin },
    ...(user.role !== 'User' ? [{ id: 'chat', label: 'AI ChatBot', icon: MessageSquare }] : []),
    { id: 'wallet', label: 'My Tickets', icon: TicketIcon },
    { id: 'ledger', label: 'Trust Ledger', icon: ShieldCheck },
  ];

  if (user.role === 'Organizer') {
    navItems.push({ id: 'organizer', label: 'Organizer Hub', icon: LayoutDashboard });
  }

  if (user.role === 'Admin') {
    navItems.push({ id: 'admin', label: 'Admin Command', icon: Settings });
  }

  const handleEventClick = (eventName: string) => {
    const matched = events.find(e => e.name.toLowerCase() === eventName.toLowerCase());
    if (matched) {
      setSelectedEvent(matched);
    } else {
      setPendingPrompt(`I'd like to book tickets for ${eventName}.`);
      setActiveTab('chat');
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-slate-100 overflow-hidden font-sans">
      <div className="mandala-bg animate-pulse" />
      
      {/* Mobile Menu Overlay Toggle */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Responsive Sidebar layout */}
      <aside className={`
        fixed md:relative z-50 h-full w-72 bg-[#0b0f1a] border-r border-slate-800/40 transition-all duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 shrink-0">
            <div className="p-2.5 bg-gradient-to-br from-saffron to-[#138808] rounded-xl shadow-lg shadow-orange-500/20">
              <TicketIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">OmniTick <span className="text-saffron">Bharat</span></h1>
              <span className="text-[9px] text-orange-400 font-mono tracking-widest uppercase block font-black">AI & Cryptographic Pass Node</span>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsSidebarOpen(false);
                  setSelectedEvent(null);
                }}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all duration-200 group border ${
                  activeTab === item.id 
                    ? 'bg-saffron/10 text-saffron border-saffron/25 shadow-lg shadow-orange-600/5' 
                    : 'text-slate-400 border-transparent hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-saffron' : 'text-slate-500'}`} />
                <span className="font-bold text-xs uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User profile section */}
          <div className="mt-auto pt-6 border-t border-slate-800/40 space-y-4 shrink-0 bg-transparent">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
              <div className="relative shrink-0">
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full border-2 border-saffron shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0b0f1a] flex items-center justify-center text-[8px] font-bold text-white">
                  ✓
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black text-slate-200 truncate">{user.name}</p>
                <p className="text-[9px] text-saffron font-bold uppercase tracking-wider mt-0.5">{user.role} Profile</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all group font-bold text-xs uppercase"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Log Out Node</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]/50 overflow-hidden relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Global Toolbar Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-slate-800/40 bg-[#0a0a0a]/40 backdrop-blur-xl sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-400 hover:text-white transition-colors border border-slate-800 rounded-xl"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#FF9933] flex items-center gap-2">
              <Sparkles size={16} />
              {activeTab === 'explore' ? 'Disocver Indian Events' : 
               activeTab === 'map' ? 'Saffron Location Coordinates' : 
               activeTab === 'chat' ? 'OmniTick AI Expert' : 
               activeTab === 'dashboard' ? 'Attendence Projections' : 
               activeTab === 'wallet' ? 'Pass Ledger Folders' : 
               activeTab === 'ledger' ? 'Cryptographic Block audits' :
               activeTab === 'organizer' ? 'Operator Controls' : 'Platform Administration'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Network Ping: {networkLatency}ms</span>
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-all bg-slate-900/50 border border-slate-800 rounded-xl">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-saffron border border-[#0a0a0a]" />
            </button>
          </div>
        </header>

        {/* Dynamic Route Viewport */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          {selectedEvent ? (
            <Checkout 
              event={selectedEvent} 
              onBack={() => setSelectedEvent(null)} 
              onConfirm={handleConfirmPurchase} 
            />
          ) : (
            <>
              {activeTab === 'explore' && (
                <EventExplorer 
                  events={events} 
                  onEventClick={handleEventClick} 
                />
              )}
              {activeTab === 'map' && (
                <MapExplorer 
                  events={events}
                  onSelectEvent={(evt) => setSelectedEvent(evt)}
                />
              )}
              {activeTab === 'chat' && (
                <ChatInterface 
                  events={events} 
                  onTicketPurchase={(t) => {
                    if (token) fetchTickets(token);
                    setActiveTab('wallet');
                  }}
                  initialPrompt={pendingPrompt}
                  onPromptHandled={() => setPendingPrompt(null)}
                />
              )}
              {activeTab === 'dashboard' && (
                <Dashboard 
                  user={user} 
                  events={events} 
                  onBookEvent={(evt) => setSelectedEvent(evt)} 
                />
              )}
              {activeTab === 'wallet' && (
                <TicketWallet 
                  tickets={tickets} 
                  onRefreshTickets={() => token && fetchTickets(token)}
                />
              )}
              {activeTab === 'ledger' && <Ledger />}
              
              {activeTab === 'organizer' && user.role === 'Organizer' && (
                <OrganizerDashboard
                  events={events}
                  onCreateEvent={handleCreateEvent}
                  onEditEvent={handleEditEvent}
                  onDeleteEvent={handleDeleteEvent}
                  userId={user.id}
                />
              )}

              {activeTab === 'admin' && user.role === 'Admin' && (
                <AdminDashboard
                  events={events}
                  onApproveEvent={handleApproveEvent}
                  onRejectEvent={handleRejectEvent}
                />
              )}
            </>
          )}
        </div>
        {user.role !== 'User' && (
          <VoiceBookingWidget 
            events={events} 
            onBookingSuccess={handleConfirmPurchase} 
            token={token} 
          />
        )}
      </main>
    </div>
  );
};

export default App;
