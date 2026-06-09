import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Activity, Sparkles, Users, Layers, DollarSign, Check, X, ShieldAlert,
  Loader2, Globe, ShieldX, ShieldCheck, Clock, RefreshCw, Search, Smartphone, AlertTriangle
} from 'lucide-react';
import { Event, User, CheckInLog } from '../types';

interface AdminDashboardProps {
  events: Event[];
  onApproveEvent: (id: string) => Promise<void>;
  onRejectEvent: (id: string) => Promise<void>;
}

const COLORS = ['#FF9933', '#138808', '#000080', '#FFD700', '#A855F7'];

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events = [],
  onApproveEvent,
  onRejectEvent
}) => {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [cityBookings, setCityBookings] = useState<any[]>([]);
  const [eventPopularity, setEventPopularity] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upgrade admin states
  const [adminTab, setAdminTab] = useState<'moderation' | 'checkins'>('moderation');
  const [checkInLogs, setCheckInLogs] = useState<CheckInLog[]>([]);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsFilter, setLogsFilter] = useState<'All' | 'Allowed' | 'Rejected' | 'Fraud'>('All');
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Sync logs retriever
  const fetchCheckInLogs = async () => {
    setIsLogsLoading(true);
    try {
      const token = sessionStorage.getItem('omni_jwt');
      const headers = { 'Authorization': `Bearer ${token}` };
      const logsRes = await fetch('/api/check-in-logs', { headers });
      if (logsRes.ok) {
        const data = await logsRes.json();
        setCheckInLogs(data);
      }
    } catch (err) {
      console.error("Failed to load check-in logs:", err);
    } finally {
      setIsLogsLoading(false);
    }
  };

  // Load backend analytics & users on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = sessionStorage.getItem('omni_jwt');
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch statistics
        const statRes = await fetch('/api/analytics', { headers });
        if (statRes.ok) {
          const res = await statRes.json();
          setStats(res.stats);
          setChartData(res.monthlySales);
          if (res.userGrowth) setUserGrowth(res.userGrowth);
          if (res.cityBookings) setCityBookings(res.cityBookings);
          if (res.eventPopularity) setEventPopularity(res.eventPopularity);
        }

        // 2. Fetch seed users from mock DB
        const usersRes = await fetch('/api/users', { headers });
        if (usersRes.ok) {
          const userData = await usersRes.json();
          setRegisteredUsers(userData);
        } else {
          // Since we want standard responsive user records:
          setRegisteredUsers([
            { id: "usr-admin", name: "Sairam Admin", email: "SAIRAM1592005@gmail.com", role: "Admin", createdAt: "2026-05-10" },
            { id: "usr-organizer", name: "Saffron Events Ltd", email: "organizer@omnitick.in", role: "Organizer", createdAt: "2026-05-15" },
            { id: "usr-normal", name: "Aarav Sharma", email: "aarav@gmail.com", role: "User", createdAt: "2026-05-20" }
          ]);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [events]);

  const pendingEvents = events.filter(e => e.status === 'Pending');

  // Compute category allocation count
  const categoryChartData = Object.entries(
    events.reduce((acc, current) => {
      acc[current.category] = (acc[current.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const totalRevenue = stats?.revenue ?? (events.reduce((sum, e) => sum + (e.total - e.available) * e.basePrice, 0) + 24500);
  const ticketsSold = stats?.ticketsSold ?? (events.reduce((sum, e) => sum + (e.total - e.available), 0) + 12);
  const totalEventsCount = stats?.totalEvents ?? events.length;
  const totalUsersCount = stats?.totalUsers ?? 3;
  const fraudAttemptsCount = stats?.fraudAttempts ?? 0;

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-saffron animate-spin" />
        <p className="text-slate-400 font-bold animate-pulse">Syncing Administrator Hub coordinates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Header panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-white">Administration Command</h2>
          <p className="text-sm text-slate-400 mt-2">Manage events verification, security controls, and transaction stats.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-saffron/10 text-saffron rounded-xl text-[10px] font-black uppercase tracking-widest border border-saffron/20">
          <Globe size={14} className="animate-spin" /> Root Node Active
        </div>
      </div>

      {/* COMMAND CENTER SUB-TABS SELECTOR */}
      <div className="flex border-b border-slate-800 gap-8 mb-4">
        <button
          type="button"
          onClick={() => setAdminTab('moderation')}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 cursor-pointer ${
            adminTab === 'moderation' 
              ? 'border-saffron text-saffron font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Analytics & Moderation
        </button>
        <button
          type="button"
          onClick={() => {
            setAdminTab('checkins');
            fetchCheckInLogs();
          }}
          className={`pb-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            adminTab === 'checkins' 
              ? 'border-saffron text-saffron font-extrabold' 
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          Live Check-In Logs & Fraud Radar
          {checkInLogs.some(l => l.isFraudAttempt) && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
      </div>

      {adminTab === 'moderation' ? (
        <>
          {/* Numerical Stats overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, desc: '94% growth rate', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Total Events', value: `${totalEventsCount} Active`, desc: 'Hosted listings', icon: Layers, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Tickets Sold', value: `${ticketsSold} Issued`, desc: 'Verified booking IDs', icon: Sparkles, color: 'text-saffron', bg: 'bg-saffron/10' },
              { 
                label: 'Fraud Alerts', 
                value: `${fraudAttemptsCount} Blocked`, 
                desc: fraudAttemptsCount > 0 ? 'Threat attempt stopped' : 'System secured', 
                icon: ShieldAlert, 
                color: fraudAttemptsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-blue-400', 
                bg: fraudAttemptsCount > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-blue-500/10',
                glow: fraudAttemptsCount > 0
              },
            ].map((stat, i) => (
              <div key={i} className={`glass-panel p-6 rounded-[2rem] border-slate-800/60 flex flex-col shadow-lg transition-all ${stat.glow ? 'ring-2 ring-red-500/30' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={22} className={stat.glow ? 'animate-bounce' : ''} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black text-white mt-1">{stat.value}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-800/30 text-[9px] font-bold text-slate-500 uppercase flex justify-between">
                  <span>{stat.desc}</span>
                  {stat.glow ? (
                    <span className="text-rose-500 animate-pulse font-extrabold">GATE SEC DISPATCH</span>
                  ) : (
                    <span className="text-emerald-400">PostgreSQL Cloud</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Moderation section */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2 mb-2">
              <ShieldAlert className="text-saffron" size={20} />
              Needs Approval ({pendingEvents.length} Pending)
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Verify event organizers specifications before publishing on the index.</p>
            
            <div className="space-y-4">
              {pendingEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-2xl">
                  All operators are currently moderating successfully. No pending requests.
                </div>
              ) : (
                pendingEvents.map(evt => (
                  <div key={evt.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 bg-slate-950/40 border border-slate-850 rounded-2xl gap-4">
                    <div className="flex gap-4">
                      <img src={evt.image} alt="" className="w-16 h-12 object-cover rounded-xl border border-slate-800 shrink-0" />
                      <div>
                        <h4 className="font-extrabold text-white text-sm leading-snug">{evt.name}</h4>
                        <p className="text-[10px] text-saffron font-black uppercase tracking-wider mt-1">{evt.category}</p>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-xs mt-1">{evt.location}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 self-stretch sm:self-auto justify-end">
                      <button
                        onClick={() => onApproveEvent(evt.id)}
                        className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 cursor-pointer"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => onRejectEvent(evt.id)}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 cursor-pointer"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FIRST ROW CHARTS: REVENUE TRENDS & USER GROWTH */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Revenue Area Chart */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                <TrendingUp size={18} className="text-saffron" /> Revenue Trends & Forecasts
              </h3>
              <p className="text-[11px] text-slate-400 mb-6 font-medium">Indian Rupee (₹) platform transaction value progression vs forecasts.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData.length > 0 ? chartData : [
                    { name: 'Jan', demand: 15, sales: 24000, forecast: 30000 },
                    { name: 'Feb', demand: 25, sales: 36000, forecast: 42000 },
                    { name: 'Mar', demand: 42, sales: 60000, forecast: 75000 },
                    { name: 'Apr', demand: 55, sales: 85000, forecast: 95000 },
                    { name: 'May', demand: 80, sales: 120000, forecast: 110000 },
                    { name: 'Jun', demand: 110, sales: 165000, forecast: 180000 }
                  ]}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9933" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#FF9933" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#138808" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#138808" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickFormatter={(val) => `₹${val / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="sales" stroke="#FF9933" fillOpacity={1} fill="url(#salesGrad)" strokeWidth={3} name="Settled Sales" />
                    <Area type="monotone" dataKey="forecast" stroke="#138808" strokeDasharray="5 5" fillOpacity={0.6} fill="url(#forecastGrad)" strokeWidth={2} name="Forecast Growth" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Growth Line/Area Chart */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                <Users size={18} className="text-emerald-400" /> User Growth & Registrations
              </h3>
              <p className="text-[11px] text-slate-400 mb-6 font-medium">Cumulative attendee nodes synced onto OmniTick cryptosystems over time.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={userGrowth.length > 0 ? userGrowth : [
                    { name: 'Jan', users: 35 },
                    { name: 'Feb', users: 60 },
                    { name: 'Mar', users: 110 },
                    { name: 'Apr', users: 180 },
                    { name: 'May', users: 260 },
                    { name: 'Jun', users: Math.max(340, totalUsersCount * 2 + 150) }
                  ]}>
                    <defs>
                      <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#usersGrad)" strokeWidth={3} name="Total Registered" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SECOND ROW CHARTS: EVENT POPULARITY & CITY-WISE BOOKINGS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Popularity analytics */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                <Activity size={18} className="text-saffron" /> Event Popularity Ledger
              </h3>
              <p className="text-[11px] text-slate-400 mb-6 font-medium">Top selling ticket categories and event operators by total pass volume.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventPopularity.length > 0 ? eventPopularity : [
                    { name: 'Sunburn Fest', ticketsSold: 22 },
                    { name: 'Holi Saffron MH', ticketsSold: 18 },
                    { name: 'Tech Conclave', ticketsSold: 14 },
                    { name: 'Classical MH', ticketsSold: 9 }
                  ]} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" opacity={0.3} />
                    <XAxis type="number" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} fontWeight="semibold" width={110} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    <Bar dataKey="ticketsSold" fill="#FF9933" radius={[0, 8, 8, 0]} name="Passes Sold">
                      {(eventPopularity.length > 0 ? eventPopularity : [1, 2, 3, 4]).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* City wise bookings */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                <Globe size={18} className="text-indigo-400" /> City-Wise Booking Distribution
              </h3>
              <p className="text-[11px] text-slate-400 mb-6 font-medium">Visitor geography dispersion across metropolitan ticket gates.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-72">
                <div className="h-48 w-48 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={cityBookings.length > 0 ? cityBookings : [
                          { city: "Delhi", bookings: 12 },
                          { city: "Mumbai", bookings: 24 },
                          { city: "Bangalore", bookings: 18 },
                          { city: "Jaipur", bookings: 8 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="bookings"
                        nameKey="city"
                      >
                        {(cityBookings.length > 0 ? cityBookings : [1, 2, 3, 4]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 space-y-3 pl-4 max-h-[220px] overflow-y-auto">
                  {(cityBookings.length > 0 ? cityBookings : [
                    { city: "Delhi", bookings: 12, revenue: 9600 },
                    { city: "Mumbai", bookings: 24, revenue: 24200 },
                    { city: "Bangalore", bookings: 18, revenue: 16400 },
                    { city: "Jaipur", bookings: 8, revenue: 5400 }
                  ]).map((item, index) => (
                    <div key={item.city} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-semibold text-slate-300">{item.city}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-white text-[11px]">{item.bookings} Books</span>
                        <span className="text-[9px] text-slate-500 font-bold block">₹{(item.revenue || item.bookings * 800).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Users control list */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-6">
              <Users size={18} className="text-saffron" /> Cryptographic Identity Audits
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-black uppercase tracking-wider">
                    <th className="pb-3 text-slate-400 pl-4 font-bold">Node ID</th>
                    <th className="pb-3 text-slate-400 font-bold">Full Name</th>
                    <th className="pb-3 text-slate-400 font-bold">Secure Email</th>
                    <th className="pb-3 text-slate-400 font-bold">Role Profile</th>
                    <th className="pb-3 text-slate-400 pr-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredUsers.map(user => (
                    <tr key={user.id} className="border-b border-slate-900 leading-relaxed hover:bg-slate-950/20 transition-colors">
                      <td className="py-4 pl-4 font-mono font-bold text-slate-400">{user.id}</td>
                      <td className="py-4 font-extrabold text-white">{user.name}</td>
                      <td className="py-4 font-semibold text-slate-300">{user.email}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          user.role === 'Admin' ? 'bg-orange-500/10 text-orange-400' :
                          user.role === 'Organizer' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="text-[10px] text-emerald-400 font-black uppercase flex items-center gap-1">
                          <Check size={12} /> Sync Online
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* CHECK-INS VIEW */
        <div className="space-y-8 animate-fadeIn">
          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total Scanned Passes', value: checkInLogs.length.toString(), desc: 'Total scan events logged', icon: Clock, color: 'text-saffron', bg: 'bg-saffron/10' },
              { label: 'Authorized entries', value: checkInLogs.filter(l => l.status === 'Allowed').length.toString(), desc: 'Admitted visitors', icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Rejected Check-Ins', value: checkInLogs.filter(l => l.status === 'Rejected').length.toString(), desc: 'Failed verification scans', icon: ShieldX, color: 'text-rose-450', bg: 'bg-red-500/10' },
              { label: 'Intrusions Thwarted', value: checkInLogs.filter(l => l.isFraudAttempt).length.toString(), desc: 'Fake keys or dupe entry', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', glow: checkInLogs.some(l => l.isFraudAttempt) },
            ].map((stat, i) => (
              <div key={i} className={`glass-panel p-6 rounded-[2rem] border-slate-800/60 flex flex-col shadow-lg transition-all ${stat.glow ? 'ring-2 ring-rose-500/40 bg-rose-950/10' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={22} className={stat.glow ? 'animate-bounce' : ''} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-xl font-black text-white mt-1">{stat.value}</p>
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-slate-800/30 text-[9px] font-bold text-slate-500 uppercase flex justify-between">
                  <span>{stat.desc}</span>
                  {stat.glow ? (
                    <span className="text-rose-500 animate-pulse font-black">Threat Active</span>
                  ) : (
                    <span className="text-emerald-400">Ledger SEC</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Filtering & Live Monitor Controls */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 space-y-6 bg-slate-900/10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Activity className="text-saffron animate-pulse" size={18} />
                  Real-Time Gate Entrance Monitor
                </h3>
                <p className="text-xs text-slate-400 mt-1">Live feed of cryptographic check-ins, validation results, and automated fraud flags.</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={fetchCheckInLogs}
                  disabled={isLogsLoading}
                  className="p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold uppercase cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isLogsLoading ? 'animate-spin' : ''} />
                  Refresh entrance logs
                </button>
              </div>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-b border-slate-800/40 py-5">
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by event, attendee, status..."
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:border-saffron/40 outline-none placeholder-slate-500"
                />
              </div>

              {/* Status Select Filter button pills */}
              <div className="md:col-span-2 flex flex-wrap gap-2 items-center justify-start md:justify-end">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-2">Filter Type:</span>
                {(['All', 'Allowed', 'Rejected', 'Fraud'] as const).map((statusValue) => (
                  <button
                    key={statusValue}
                    type="button"
                    onClick={() => setLogsFilter(statusValue)}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                      logsFilter === statusValue
                        ? 'bg-saffron text-white border-saffron'
                        : 'bg-transparent text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {statusValue === 'Fraud' ? '🚨 Threat attempts' : statusValue}
                  </button>
                ))}
              </div>
            </div>

            {/* Logs feed table */}
            <div className="overflow-x-auto">
              {isLogsLoading && checkInLogs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-saffron animate-spin" />
                  <p className="text-slate-400 text-xs font-bold">Acquiring cryptographic feed packets...</p>
                </div>
              ) : checkInLogs.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-3xl bg-slate-950/10">
                  No gate entries registered to security block records yet. Load event passes into Gate Scanner in the active Pass Wallet to test.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="pb-3 text-slate-400 pl-4">Scan Time (IST)</th>
                      <th className="pb-3 text-slate-400">Target Event Name</th>
                      <th className="pb-3 text-slate-400">Attendee & Pass Token</th>
                      <th className="pb-3 text-slate-400">Registry Source Device</th>
                      <th className="pb-3 text-slate-400">Gate Access Status</th>
                      <th className="pb-3 text-slate-400 pr-4 text-right">Reason Code / Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkInLogs
                      .filter(log => {
                        const matchesSearch = 
                          log.eventName.toLowerCase().includes(logsSearch.toLowerCase()) ||
                          log.userName.toLowerCase().includes(logsSearch.toLowerCase()) ||
                          log.ticketId.toLowerCase().includes(logsSearch.toLowerCase()) ||
                          (log.reason && log.reason.toLowerCase().includes(logsSearch.toLowerCase()));
                        
                        if (!matchesSearch) return false;

                        if (logsFilter === 'All') return true;
                        if (logsFilter === 'Allowed') return log.status === 'Allowed';
                        if (logsFilter === 'Rejected') return log.status === 'Rejected';
                        if (logsFilter === 'Fraud') return log.isFraudAttempt;
                        return true;
                      })
                      .map(log => (
                        <tr 
                          key={log.id} 
                          className={`border-b border-slate-900 leading-relaxed transition-colors ${
                            log.isFraudAttempt 
                              ? 'bg-rose-950/15 hover:bg-rose-950/20 border-l-2 border-l-red-500' 
                              : 'hover:bg-slate-950/25'
                          }`}
                        >
                          <td className="py-4 pl-4 font-mono text-slate-400">
                            {new Date(log.entryTime).toLocaleTimeString('en-IN')}<br />
                            <span className="text-[10px] text-slate-600 font-semibold">{new Date(log.entryTime).toLocaleDateString('en-IN')}</span>
                          </td>
                          <td className="py-4 font-extrabold text-[#f3f4f6]">{log.eventName}</td>
                          <td className="py-4">
                            <span className="font-extrabold text-slate-300">{log.userName}</span><br />
                            <span className="text-[9px] text-saffron font-bold font-mono">PASS: {log.ticketId}</span>
                          </td>
                          <td className="py-4">
                            <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1">
                              <Smartphone size={10} className="text-slate-500 shrink-0" />
                              {log.deviceIp || '127.0.0.1'}
                            </span>
                            <span className="text-[9px] text-slate-500 max-w-[140px] truncate block mt-0.5" title={log.deviceName}>{log.deviceName || 'Gate Console'}</span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit ${
                              log.status === 'Allowed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                            }`}>
                              {log.status === 'Allowed' ? (
                                <ShieldCheck size={11} className="shrink-0" />
                              ) : (
                                <ShieldX size={11} className="shrink-0" />
                              )}
                              {log.status}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {log.isFraudAttempt ? (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-extrabold text-[8px] uppercase tracking-wider leading-none">
                                  🚨 INTRUSION THREAT
                                </span>
                              ) : null}
                              <span className={`font-semibold text-xs ${log.isFraudAttempt ? 'text-red-405 font-extrabold animate-pulse' : log.status === 'Allowed' ? 'text-slate-205' : 'text-slate-400'}`}>
                                {log.reason || 'N/A'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
