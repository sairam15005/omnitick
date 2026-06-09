import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar, 
  MapPin, 
  Tag, 
  Users, 
  DollarSign, 
  Image as ImageIcon, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  ArrowUpRight, 
  Search, 
  Compass, 
  RefreshCw, 
  ShieldCheck, 
  QrCode, 
  Terminal, 
  Zap,
  Percent,
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Sliders
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie,
  Legend
} from 'recharts';
import { Event } from '../types';
import QRScannerWindow from './QRScannerWindow';

interface OrganizerDashboardProps {
  events: Event[];
  onCreateEvent: (newEventData: any) => Promise<void>;
  onEditEvent: (id: string, updatedData: any) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
  userId: string;
}

interface OrganizerAnalytics {
  metrics: {
    revenue: number;
    ticketsSold: number;
    attendanceRate: number;
    checkIns: number;
  };
  eventWiseData: any[];
  chartData: any[];
  checkInLogs: any[];
  recommendations: any[];
  insight: string;
}

const COLORS = ['#FF9933', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  events = [],
  onCreateEvent,
  onEditEvent,
  onDeleteEvent,
  userId
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'gates' | 'ai'>('overview');
  
  // Create / Edit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Music',
    location: '',
    date: '',
    time: '18:00',
    basePrice: '',
    total: '',
    image: '',
    latitude: '',
    longitude: ''
  });

  // State for loaded database metrics
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Gate check-in scan simulator states
  const [scanHash, setScanHash] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [gateScanMode, setGateScanMode] = useState<'camera' | 'manual'>('camera');
  const [logFilterQuery, setLogFilterQuery] = useState('');
  const [selectedEventIdFilter, setSelectedEventIdFilter] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Dynamic Pricing states
  const [selectedPricingEventId, setSelectedPricingEventId] = useState<string>('');
  const [pricingResult, setPricingResult] = useState<any | null>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState<boolean>(false);
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // AI Success Predictor States
  const [predictionResult, setPredictionResult] = useState<any | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [predictionFeedback, setPredictionFeedback] = useState<string | null>(null);
  const [predictionsHistory, setPredictionsHistory] = useState<any[]>([]);

  const handlePredictSuccess = async () => {
    if (!formData.name || !formData.category || !formData.location || !formData.basePrice || !formData.date) {
      setPredictionFeedback("Please fill Name, Category, Location, Price, and Date fields for AI, Bhaiya.");
      return;
    }
    setPredictionFeedback(null);
    setIsPredicting(true);
    try {
      const response = await fetch('/api/ai/predict-event-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          location: formData.location,
          basePrice: parseFloat(formData.basePrice) || 0,
          date: formData.date,
          total: parseInt(formData.total) || 500
        })
      });
      if (response.ok) {
        const data = await response.json();
        setPredictionResult(data);
      } else {
        const errData = await response.json();
        setPredictionFeedback(errData.error || "Failed to finalize prediction.");
      }
    } catch (e) {
      console.error(e);
      setPredictionFeedback("Web error executing prediction algorithm, Bhai.");
    } finally {
      setIsPredicting(false);
    }
  };

  const calculateDynamicPricing = async (eventId: string) => {
    if (!eventId) return;
    setIsCalculatingPricing(true);
    setApplyStatus('idle');
    try {
      const response = await fetch(`/api/ai/dynamic-pricing/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPricingResult(data);
      } else {
        console.error("Failed to compute dynamic pricing endpoint.");
      }
    } catch (err) {
      console.error("Error fetching dynamic pricing calculation:", err);
    } finally {
      setIsCalculatingPricing(false);
    }
  };

  const handleApplyPricing = async () => {
    if (!selectedPricingEventId || !pricingResult) return;
    setApplyStatus('loading');
    try {
      const token = sessionStorage.getItem('omni_jwt');
      const response = await fetch(`/api/events/${selectedPricingEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          basePrice: pricingResult.suggestedPrice
        })
      });

      if (response.ok) {
        setApplyStatus('success');
        // Refresh dashboard statistics
        fetchOrganizerMetrics(true);
        // Sync local currentPrice element
        setPricingResult((prev: any) => prev ? { ...prev, currentPrice: pricingResult.suggestedPrice } : null);
      } else {
        setApplyStatus('error');
      }
    } catch (err) {
      setApplyStatus('error');
    }
  };

  // Fetch organizer metrics from the full stack server
  const fetchOrganizerMetrics = async (showPulse = false) => {
    if (showPulse) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const token = sessionStorage.getItem('omni_jwt');
      const response = await fetch('/api/organizer/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        console.error("Failed to load organizer analytics endpoint, Bhai.");
      }

      // Fetch predictions history
      const predResponse = await fetch('/api/ai/predictions');
      if (predResponse.ok) {
        const predData = await predResponse.json();
        setPredictionsHistory(predData);
      }
    } catch (err) {
      console.error("Error calling organizer analytics pipeline:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrganizerMetrics();
  }, [events, userId]);

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'Music',
      location: '',
      date: '',
      time: '18:00',
      basePrice: '',
      total: '',
      image: '',
      latitude: '',
      longitude: ''
    });
    setEditingEvent(null);
    setPredictionResult(null);
    setPredictionFeedback(null);
  };

  const handleOpenEdit = (evt: Event) => {
    setEditingEvent(evt);
    setFormData({
      name: evt.name,
      category: evt.category,
      location: evt.location,
      date: evt.date,
      time: evt.time || '18:00',
      basePrice: evt.basePrice.toString(),
      total: evt.total.toString(),
      image: evt.image,
      latitude: evt.latitude?.toString() || '',
      longitude: evt.longitude?.toString() || ''
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Coordinate fallbacks (defaults to metropolitan regions in India)
      const latVal = parseFloat(formData.latitude) || (19.0760 + (Math.random() - 0.5) * 0.1); 
      const lngVal = parseFloat(formData.longitude) || (72.8777 + (Math.random() - 0.5) * 0.1);

      const payload = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        total: parseInt(formData.total),
        latitude: latVal,
        longitude: lngVal,
        image: formData.image || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800'
      };

      if (editingEvent) {
        await onEditEvent(editingEvent.id, payload);
      } else {
        await onCreateEvent(payload);
      }
      resetForm();
      setShowCreateModal(false);
      // Let metrics sync
      fetchOrganizerMetrics(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("Are you sure you want to delete this event pass, Bhai? This cannot be undone.")) {
      await onDeleteEvent(id);
      fetchOrganizerMetrics(true);
    }
  };

  // Submit secure cryptographic scanner code simulation
  const handleSimulateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanHash.trim()) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      const response = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('omni_jwt') || ''}`
        },
        body: JSON.stringify({ hash: scanHash.trim() })
      });

      const resData = await response.json();
      if (response.ok && resData.valid) {
        setScanResult({
          success: true,
          message: resData.message || 'Verification success! Node synchronized.'
        });
        // Clear scanner input and trigger statistics fetch after a short timeout
        setScanHash('');
        fetchOrganizerMetrics(true);
      } else {
        setScanResult({
          success: false,
          message: resData.error || 'Access Denied: Ticket checksum verification failed.'
        });
      }
    } catch (err: any) {
      setScanResult({
        success: false,
        message: 'Network timeout trying to contact cryptographic gate servers.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Filter events belonging to this organizer (client-side fallback/insurance)
  const organizerEvents = events.filter(e => e.organizerId === userId);

  // Trigger pricing auto-runs
  useEffect(() => {
    if (activeTab === 'ai' && organizerEvents.length > 0) {
      if (!selectedPricingEventId) {
        setSelectedPricingEventId(organizerEvents[0].id);
      } else {
        calculateDynamicPricing(selectedPricingEventId);
      }
    }
  }, [selectedPricingEventId, activeTab, organizerEvents.length]);

  // Filter gate logs
  const filteredCheckInLogs = (analytics?.checkInLogs || []).filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(logFilterQuery.toLowerCase()) ||
      log.ticketId.toLowerCase().includes(logFilterQuery.toLowerCase()) ||
      (log.blockchainHash && log.blockchainHash.toLowerCase().includes(logFilterQuery.toLowerCase())) ||
      (log.reason && log.reason.toLowerCase().includes(logFilterQuery.toLowerCase()));
    
    const matchesEvent = selectedEventIdFilter ? log.eventId === selectedEventIdFilter : true;
    
    return matchesSearch && matchesEvent;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-saffron animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase animate-pulse">Syncing Cryptographic Node...</p>
      </div>
    );
  }

  // Active metrics values
  const m = analytics?.metrics || { revenue: 0, ticketsSold: 0, attendanceRate: 0, checkIns: 0 };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      
      {/* Top Welcome Title Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800/40 pb-6 bg-transparent">
        <div>
          <span className="text-[10px] font-black tracking-widest text-saffron uppercase font-mono bg-saffron/10 px-3 py-1 rounded-full">Operator Console</span>
          <h2 className="text-3xl font-black text-white mt-2 tracking-tight flex items-center gap-3">
            Saffron Gates Dashboard
            {isRefreshing && <RefreshCw size={18} className="animate-spin text-india-green" />}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Verify blockchain ticket receipts, launch new passes, track live gate check-ins, and deploy AI recommendations, Ji.</p>
        </div>
        
        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <button
            onClick={() => fetchOrganizerMetrics(true)}
            className="p-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-300 rounded-2xl active:scale-95 transition-all text-xs font-bold uppercase tracking-wide flex items-center gap-2 cursor-pointer"
            title="Refresh Ledger Sync"
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin text-india-green" : ""} />
            Sync Pulse
          </button>
          
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-saffron hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} /> Issue Pass
          </button>
        </div>
      </div>

      {/* Numerical Stats overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Revenue Earned', 
            value: `₹${m.revenue.toLocaleString('en-IN')}`, 
            desc: 'Through verified settlement', 
            icon: DollarSign, 
            color: 'text-emerald-400', 
            bg: 'bg-emerald-500/10' 
          },
          { 
            label: 'Tickets Checked In', 
            value: `${m.checkIns} / ${m.ticketsSold}`, 
            desc: 'Validated admission counts', 
            icon: QrCode, 
            color: 'text-orange-400', 
            bg: 'bg-saffron/10' 
          },
          { 
            label: 'Attendance Rate', 
            value: `${m.attendanceRate}%`, 
            desc: 'Gate conversion efficiency', 
            icon: Percent, 
            color: 'text-india-green', 
            bg: 'bg-emerald-500/10' 
          },
          { 
            label: 'Active Listings', 
            value: `${organizerEvents.length} Active`, 
            desc: 'Operator deployments', 
            icon: Activity, 
            color: 'text-blue-400', 
            bg: 'bg-blue-500/10' 
          },
        ].map((stat, i) => (
          <div key={i} className="glass-panel p-6 rounded-[2rem] border-slate-800/60 flex flex-col shadow-lg hover:border-slate-700/60 transition-all bg-slate-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">{stat.value}</p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-slate-800/30 text-[9px] font-bold text-slate-500 uppercase flex justify-between">
              <span>{stat.desc}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" /> Sync LIVE OK
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-800/40 gap-1 overflow-x-auto pb-0.5 z-10 scrollbar-none">
        {[
          { id: 'overview', label: 'Overview Analytics', icon: TrendUpIconWrapper },
          { id: 'events', label: 'Configure Events', icon: CalendarIconWrapper },
          { id: 'gates', label: 'Live Gate Scanner logs', icon: TerminalIconWrapper },
          { id: 'ai', label: 'AI Optimization Insights', icon: SparklesIconWrapper }
        ].map(tab => {
          const tabActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-6 py-4 border-b-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                tabActive 
                  ? 'border-saffron text-saffron bg-[#FF9933]/5 font-black' 
                  : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
              }`}
            >
              <tab.icon active={tabActive} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW GRAPHICS & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Trend Area Chart */}
            <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border-slate-800/60 bg-slate-900/10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <TrendingUp size={18} className="text-saffron" /> Revenue Settlement Progress
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Monthly payout volume trend computed from live checkouts and booking confirmations.</p>
                </div>
                <span className="px-3 py-1 bg-saffron/10 text-saffron border border-saffron/20 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  ₹ INR Currency
                </span>
              </div>
              
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.chartData || []}>
                    <defs>
                      <linearGradient id="organizerSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF9933" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#FF9933" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickFormatter={(val) => `₹${val}`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0b101d', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '11px', color: '#fff' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#FF9933" fillOpacity={1} fill="url(#organizerSalesGrad)" strokeWidth={3} name="Settled Gross Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Event Distribution by Seats */}
            <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 bg-slate-900/10">
              <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
                <Users size={18} className="text-india-green" /> Total Passes Sold Share
              </h3>
              <p className="text-[11px] text-slate-400 mb-6 font-medium">Visualizing sales distribution across your event listings.</p>
              
              <div className="h-56 flex justify-center items-center relative">
                {analytics?.eventWiseData && analytics.eventWiseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.eventWiseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="soldCount"
                        nameKey="name"
                      >
                        {analytics.eventWiseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0b101d', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-slate-500 font-bold font-mono">No tickets sold data compiled.</div>
                )}
              </div>

              {/* Legend checklist */}
              <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                {(analytics?.eventWiseData || []).slice(0, 4).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                      <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-slate-300 font-medium truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-xs font-black text-white">{item.soldCount} sold</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Event-wise Detailed Analytics Grid Block */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 bg-slate-900/10">
            <h3 className="text-lg font-black text-white flex items-center gap-2 mb-1">
              <Sliders size={18} className="text-saffron" /> Live Event Performance Ledger
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Real-time metrics calculated from active block tickets, available configurations, and verified scan nodes.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-extrabold uppercase tracking-wider">
                    <th className="pb-3 text-slate-400 font-bold">Event Specification</th>
                    <th className="pb-3 text-slate-400 font-bold text-center">Base Price</th>
                    <th className="pb-3 text-slate-400 font-bold text-center">Tickets Sold</th>
                    <th className="pb-3 text-slate-400 font-bold">Capacity Rate</th>
                    <th className="pb-3 text-slate-400 font-bold text-center">Revenue</th>
                    <th className="pb-3 text-slate-400 font-bold text-center">Check-Ins</th>
                    <th className="pb-3 text-slate-400 font-bold text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.eventWiseData || []).map((evt, idx) => {
                    const capacityPercent = Math.round((evt.soldCount / evt.totalSeats) * 100) || 0;
                    return (
                      <tr key={evt.id} className="border-b border-slate-900 leading-relaxed hover:bg-slate-950/20 transition-colors">
                        <td className="py-4 font-extrabold text-white">
                          <p className="text-sm font-black">{evt.name}</p>
                          <div className="flex gap-2 items-center mt-1 text-[10px] text-slate-400 font-normal">
                            <span className="text-saffron font-bold uppercase">{evt.category}</span>
                            <span>•</span>
                            <span>{evt.date}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center font-bold text-slate-300 font-mono">₹{evt.basePrice.toLocaleString('en-IN')}</td>
                        <td className="py-4 text-center font-bold text-slate-200 font-mono">{evt.soldCount}</td>
                        <td className="py-4">
                          <div className="w-28">
                            <div className="flex justify-between items-center text-[9px] text-slate-500 mb-1 font-mono font-bold">
                              <span>CAPACITY</span>
                              <span>{capacityPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-saffron h-full transition-all" style={{ width: `${capacityPercent}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-center font-extrabold text-emerald-400 font-mono">₹{evt.revenue.toLocaleString('en-IN')}</td>
                        <td className="py-4 text-center font-bold text-amber-500 font-mono">{evt.checkIns}</td>
                        <td className="py-4 text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono font-black border ${
                            evt.attendanceRate >= 75 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                            evt.attendanceRate >= 30 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' :
                            'bg-red-500/15 text-red-400 border-red-500/25'
                          }`}>
                            {evt.attendanceRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!analytics?.eventWiseData || analytics.eventWiseData.length === 0) && (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-slate-500 text-xs font-mono">
                        No event specs active, Bhaiya. Please issue an event pass to begin listing trackers!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. CONFIGURE EVENTS HUB */}
      {activeTab === 'events' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Quick status bar */}
          <div className="flex p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 items-center justify-between gap-5 leading-normal text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-2">
              <Sparkles size={16} className="text-saffron shrink-0" />
              Need to alter dates, capacities, check-in locations or image assets across Indian Trust map nodes? Use the settings below.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizerEvents.length === 0 ? (
              <div className="col-span-full glass-panel p-16 rounded-[2.5rem] border-slate-800/60 text-center text-slate-500 text-sm">
                You haven't listed any event passes yet, Bhai. Click "Issue Pass" to register your gates!
              </div>
            ) : (
              organizerEvents.map(evt => (
                <div key={evt.id} className="glass-panel rounded-[2.5rem] overflow-hidden border-slate-800/60 group relative flex flex-col h-full bg-slate-900/30 hover:border-slate-700/60 transition-all duration-300">
                  {/* Event Image Banner */}
                  <div className="h-44 relative overflow-hidden">
                    <img src={evt.image} alt={evt.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent" />
                    
                    {/* Approval Badge Status */}
                    <div className="absolute top-4 right-4 shadow-md flex flex-col gap-1.5 items-end">
                      {evt.status === 'Approved' && (
                        <>
                          <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider rounded-full backdrop-blur-md">
                            <CheckCircle size={10} /> Approved
                          </span>
                          {evt.isPublished ? (
                            <span className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-wider rounded-full backdrop-blur-md">
                              Published
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider rounded-full backdrop-blur-md">
                              Unpublished
                            </span>
                          )}
                        </>
                      )}
                      {evt.status === 'Pending' && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider rounded-full backdrop-blur-md">
                          <Sparkles size={10} /> Moderation Pending
                        </span>
                      )}
                      {evt.status === 'Rejected' && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-500 border border-red-500/30 text-[9px] font-black uppercase tracking-wider rounded-full backdrop-blur-md">
                          <AlertTriangle size={10} /> Listing Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      <span className="text-[9px] font-black uppercase text-saffron tracking-widest block mb-1.5">{evt.category}</span>
                      <h3 className="font-extrabold text-white text-md tracking-tight leading-snug line-clamp-2">{evt.name}</h3>
                      
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                          <Calendar size={14} className="text-saffron shrink-0" />
                          <span>{evt.date} @ {evt.time || '18:00'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                          <MapPin size={14} className="text-india-green shrink-0" />
                          <span className="truncate">{evt.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800/40 flex justify-between items-center bg-transparent">
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Base Ticket Price</p>
                        <p className="text-md font-black text-white mt-0.5 font-mono">₹{evt.basePrice.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{evt.available} left of {evt.total} seats</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {evt.status === 'Approved' && !evt.isPublished && (
                          <button
                            onClick={async () => {
                              await onEditEvent(evt.id, { ...evt, isPublished: true });
                              fetchOrganizerMetrics(true);
                            }}
                            className="px-3 py-2 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-500/20"
                            title="Publish Event"
                          >
                            Publish
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(evt)}
                          className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border border-slate-750"
                          title="Edit Settings"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(evt.id)}
                          className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all shadow-md active:scale-95 cursor-pointer border border-red-500/10"
                          title="Delete Pass Gate"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. GATES ENTRANCE LOGS & SCANNER SIMULATION */}
      {activeTab === 'gates' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* SECURE BLOCKCHAIN TICKETING SCAN SIMULATOR */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Simulation Interface Panel with Dual Toggle */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Gate Mode Tabs */}
              <div className="bg-slate-950/85 border border-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setGateScanMode('camera');
                    setScanResult(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gateScanMode === 'camera'
                      ? 'bg-gradient-to-r from-saffron to-amber-500 text-slate-950 font-black shadow-md shadow-orange-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  📷 Camera QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGateScanMode('manual');
                    setScanResult(null);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    gateScanMode === 'manual'
                      ? 'bg-gradient-to-r from-saffron to-amber-500 text-slate-950 font-black shadow-md shadow-orange-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  ⌨️ Manual Simulator
                </button>
              </div>

              {gateScanMode === 'camera' ? (
                <QRScannerWindow
                  onScanSuccess={async (scannedCode) => {
                    setScanHash(scannedCode);
                    setIsScanning(true);
                    setScanResult(null);
                    try {
                      const response = await fetch('/api/tickets/verify', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${sessionStorage.getItem('omni_jwt') || ''}`
                        },
                        body: JSON.stringify({ hash: scannedCode.trim() })
                      });
                      const resData = await response.json();
                      if (response.ok && resData.valid) {
                        setScanResult({
                          success: true,
                          message: resData.message || 'Verification success! Node synchronized.'
                        });
                        setScanHash('');
                        fetchOrganizerMetrics(true);
                      } else {
                        setScanResult({
                          success: false,
                          message: resData.error || 'Access Denied: Ticket check failed.'
                        });
                      }
                    } catch (err) {
                      setScanResult({
                        success: false,
                        message: 'Contacting verification node failed.'
                      });
                    } finally {
                      setIsScanning(false);
                    }
                  }}
                />
              ) : (
                <div className="glass-panel p-8 rounded-[2.5rem] border-slate-850/70 bg-[#0c1221]/50 relative overflow-hidden">
                  <div className="absolute top-[-20%] right-[-20%] w-48 h-48 bg-saffron/5 rounded-full blur-[60px]" />
                  <h3 className="text-lg font-black text-white flex items-center gap-2 mb-2">
                    <Terminal size={18} className="text-saffron" /> Cryptographic Gate Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 font-medium">Verify blockchain hashes and simulate hand-held check-ins to test your gate metrics online.</p>

                  <form onSubmit={handleSimulateScan} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono block">Ticket Blockchain Hash ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          className="w-full pl-4 pr-10 py-3.5 bg-slate-950/80 border border-slate-800 rounded-xl outline-none focus:border-saffron/40 text-xs font-mono font-semibold text-slate-100 placeholder-slate-600"
                          placeholder="Paste e.g. OMNI-...."
                          value={scanHash}
                          onChange={(e) => setScanHash(e.target.value)}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" title="Validates the SHA256 receipt">
                          <QrCode size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isScanning || !scanHash.trim()}
                        className="flex-1 py-3.5 bg-saffron hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/10 active:scale-95 disabled:opacity-40 cursor-pointer flex justify-center items-center gap-1.5"
                      >
                        {isScanning ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/20 border-t-white animate-spin rounded-full inline-block" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <Zap size={13} /> Inject Scan
                          </>
                        )}
                      </button>
                      {scanHash.trim() === '' && (
                        <button
                          type="button"
                          onClick={() => {
                            // Quick filler of a sample registered ticket hash if available
                            const sampleHash = analytics?.checkInLogs?.[0]?.blockchainHash || analytics?.checkInLogs?.[0]?.ticketId || 'OMNI-CSK-WANKHEDE-HASH';
                            setScanHash(sampleHash);
                          }}
                          className="px-3 py-3.5 bg-slate-900 border border-slate-800 hover:text-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                          title="Insert recent hash for test"
                        >
                          Sample
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Scan Result Feedback Panel */}
                  {scanResult && (
                    <div className={`mt-5 p-4 rounded-xl border text-xs leading-normal animate-fadeIn ${
                      scanResult.success 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                        : 'bg-red-500/10 text-red-400 border-red-500/15'
                    }`}>
                      <p className="flex items-center gap-1.5 font-bold mb-1.5">
                        {scanResult.success ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> : <XCircle size={14} className="text-red-400 shrink-0" />}
                        {scanResult.success ? 'CHECK-IN APPROVED' : 'ACCESS REJECTED'}
                      </p>
                      <p className="font-medium font-mono text-[11px] leading-relaxed break-words">{scanResult.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Audit Logs Table Column */}
            <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] border-slate-800/60 bg-slate-900/10 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <ShieldCheck size={18} className="text-india-green" /> Live Gate Admission Audits
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">Synchronized sequence of blockchain ticket receipts processed at physical scanner gates.</p>
                  </div>
                  
                  {/* Event Select filter */}
                  <select
                    className="px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-300 cursor-pointer outline-none max-w-[160px]"
                    value={selectedEventIdFilter}
                    onChange={(e) => setSelectedEventIdFilter(e.target.value)}
                  >
                    <option value="">All Gates</option>
                    {organizerEvents.map(evt => (
                      <option key={evt.id} value={evt.id}>{evt.name}</option>
                    ))}
                  </select>
                </div>

                {/* Filter Search Input */}
                <div className="relative mb-5">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-950/40 border border-slate-800/85 rounded-xl outline-none focus:border-saffron/40 text-xs font-semibold text-slate-100 placeholder-slate-500"
                    placeholder="Search by Attendee Name, Email, or Ticket ID..."
                    value={logFilterQuery}
                    onChange={(e) => setLogFilterQuery(e.target.value)}
                  />
                </div>

                {/* Audit table logs list */}
                <div className="overflow-x-auto">
                  <div className="max-h-[300px] overflow-y-auto pr-1">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-850 text-slate-500 font-extrabold uppercase tracking-wider sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md pb-2">
                          <th className="pb-2 text-slate-400 font-bold pl-2">Attendee</th>
                          <th className="pb-2 text-slate-400 font-bold">Ticket ID</th>
                          <th className="pb-2 text-slate-400 font-bold">Hash Number</th>
                          <th className="pb-2 text-slate-400 font-bold text-center">Status</th>
                          <th className="pb-2 text-slate-400 font-bold text-right">Entrance Epoch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCheckInLogs.map(log => {
                          const dateObj = new Date(log.entryTime);
                          const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                          return (
                            <tr key={log.id} className="border-b border-slate-905 hover:bg-slate-950/20 transition-colors">
                              <td className="py-3 pl-2">
                                <p className="font-extrabold text-slate-200 leading-none">{log.userName}</p>
                                <span className="text-[9px] text-slate-500 uppercase block tracking-wider mt-1">{log.eventName}</span>
                              </td>
                              <td className="py-3 font-mono text-[11px] font-extrabold text-saffron">
                                {log.ticketId}
                              </td>
                              <td className="py-3 font-mono text-[10px] text-slate-400 max-w-[150px] truncate" title={log.blockchainHash || 'N/A'}>
                                {log.blockchainHash ? `${log.blockchainHash.substring(0, 8)}...${log.blockchainHash.substring(log.blockchainHash.length - 8)}` : 'N/A'}
                              </td>
                              <td className="py-3 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  log.status === 'Allowed' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                                    : 'bg-red-500/10 text-red-400 border border-red-500/10'
                                }`}>
                                  {log.status === 'Allowed' ? 'Valid' : 'Fraud'}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono text-slate-400 font-bold">
                                {timeStr}
                              </td>
                            </tr>
                          );
                        })}

                        {filteredCheckInLogs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-605 text-[11px] font-semibold font-mono">
                              No gate receipts processed matching criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900/40 text-[9px] text-slate-500 font-bold uppercase font-mono flex items-center justify-between">
                <span>GATE MON: Active ({filteredCheckInLogs.length} synced checks)</span>
                <span className="text-saffron">Node Latency: ~1.2ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. AI OPTIMIZATION INSIGHTS */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main ChatGPT-like Insight Presentation Card */}
          <div className="glass-panel p-8 rounded-[3rem] border-slate-800/60 bg-[#0f172a]/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-48 h-48 bg-orange-500/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px]" />
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-[#FF9933] to-[#138808] rounded-2xl shrink-0 shadow-lg shadow-orange-500/10 mt-1">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  Gemini Operator Projections
                  <span className="text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Active Grounding
                  </span>
                </h3>
                <div className="text-slate-300 text-xs leading-relaxed font-medium font-sans">
                  {analytics?.insight || "Namaste, Bhai! Parsing upcoming event capacity thresholds, holiday schedules, and historical seat reservations onto Indian region neural nodes..."}
                </div>
              </div>
            </div>
          </div>

          {/* Individual suggestion cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(analytics?.recommendations || []).map((rec, i) => (
              <div key={rec.id} className="glass-panel p-6 rounded-[2.5rem] border-slate-800/60 bg-slate-900/10 hover:border-slate-750 flex flex-col justify-between h-full relative group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 bg-slate-850 rounded-full text-[8px] font-black uppercase tracking-wider text-slate-400">
                      {rec.category || 'Strategic Advice'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-500/5 text-saffron`}>
                      {rec.impact || 'High Impact'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white group-hover:text-saffron transition-all leading-snug">{rec.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{rec.description}</p>
                </div>

                <div className="pt-5 border-t border-slate-850 mt-6 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Configure status</span>
                  <button className="text-slate-300 group-hover:text-saffron transition-colors flex items-center gap-1">
                    EXECUTE ADVICE <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* AI DYNAMIC TICKET PRICING SYSTEM */}
          <div className="glass-panel p-8 rounded-[3rem] border-slate-800/60 bg-slate-900/10 relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF9933]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/40 pb-5">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                  <TrendingUp className="text-saffron animate-pulse" size={20} />
                  AI Yield & Dynamic Pricing Optimizer
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Re-evaluate ticket prices in real-time based on live occupancy metrics, residual sales schedules, and regional demand indexes.
                </p>
              </div>
              
              {/* Event Select Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider hidden md:inline">Select Event:</span>
                <select
                  className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 outline-none focus:border-saffron/40 max-w-[240px] cursor-pointer"
                  value={selectedPricingEventId}
                  onChange={(e) => setSelectedPricingEventId(e.target.value)}
                >
                  <option value="" disabled>Choose Active Event...</option>
                  {organizerEvents.map(evt => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Output Dashboard visualization */}
            {organizerEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                No active event configurations found. Please issue a pass gate to run pricing diagnostics.
              </div>
            ) : isCalculatingPricing ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-saffron animate-spin" />
                <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest animate-pulse">Running advanced neural yield projections...</p>
              </div>
            ) : pricingResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Visual state gauges - 5 cols */}
                <div className="lg:col-span-5 bg-slate-950/40 rounded-3xl p-6 border border-slate-800/40 flex flex-col justify-between space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-4 font-mono">
                      Real-Time Ground-Truth Metrics
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Met 1: Tickets Sold */}
                      <div className="flex justify-between items-center bg-slate-950/60 px-4 py-3.5 rounded-2xl border border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-saffron" />
                          <span className="text-xs font-medium text-slate-400 font-semibold uppercase tracking-wider">Tickets Sold</span>
                        </div>
                        <span className="text-xs font-black text-white font-mono">{pricingResult.factors?.ticketsSold ?? 0} tickets</span>
                      </div>

                      {/* Met 2: Residual Slots */}
                      <div className="flex justify-between items-center bg-slate-950/60 px-4 py-3.5 rounded-2xl border border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs font-medium text-slate-400 font-semibold uppercase tracking-wider">Residual Slots</span>
                        </div>
                        <span className="text-xs font-black text-white font-mono">{pricingResult.factors?.remainingTickets ?? 0} seats</span>
                      </div>

                      {/* Met 3: Days Remaining */}
                      <div className="flex justify-between items-center bg-slate-950/60 px-4 py-3.5 rounded-2xl border border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span className="text-xs font-medium text-slate-400 font-semibold uppercase tracking-wider">Days Remaining</span>
                        </div>
                        <span className="text-xs font-black text-white font-mono">{pricingResult.factors?.daysRemaining ?? 0} days</span>
                      </div>

                      {/* Met 4: Popularity Level */}
                      <div className="flex justify-between items-center bg-slate-950/60 px-4 py-3.5 rounded-2xl border border-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          <span className="text-xs font-medium text-slate-400 font-semibold uppercase tracking-wider">Event Popularity</span>
                        </div>
                        <span className="text-xs font-black text-purple-400 font-mono">{pricingResult.factors?.popularityScore ?? 50}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Demand score banner */}
                  <div className="pt-4 border-t border-slate-800/60">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2 font-mono">
                      Calculated Demand Score
                    </p>
                    <div className="flex items-center gap-4">
                      {/* Metric Circle */}
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-800"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="transparent"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={
                              pricingResult.demandScore >= 80 ? "text-saffron" :
                              pricingResult.demandScore >= 40 ? "text-blue-400" :
                              "text-rose-400"
                            }
                            strokeDasharray={`${pricingResult.demandScore}, 100`}
                            strokeWidth="3"
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-sm font-black text-white font-mono">{pricingResult.demandScore}</span>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">
                          {pricingResult.demandScore >= 80 ? "Peak Pressure Zone" :
                           pricingResult.demandScore >= 40 ? "Steady Growth Zone" :
                           "Promotional Clearance Zone"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                          {pricingResult.demandScore >= 80 ? "Surge rates apply to optimize total gate yields." :
                           pricingResult.demandScore >= 40 ? "Normal sales pacing. Stable price trajectory is advised." :
                           "Suggested clearing inventories using early promoter pricing structures."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Dynamic Price suggestions and actions - 7 cols */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  {/* Prices comparison boxes */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Current Price */}
                    <div className="bg-slate-950/20 p-5 rounded-3xl border border-slate-900 flex flex-col justify-center">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider font-mono">Current Base Price</span>
                      <p className="text-2xl font-black text-slate-400 mt-1 font-mono">₹{pricingResult.currentPrice.toLocaleString('en-IN')}</p>
                    </div>

                    {/* Suggested Price */}
                    <div className="bg-gradient-to-br from-saffron/5 to-[#138808]/5 p-5 rounded-3xl border border-saffron/25 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute top-2 right-2">
                        <Sparkles className="text-saffron animate-pulse animate-duration-1000" size={14} />
                      </div>
                      <span className="text-[9px] font-black uppercase text-saffron tracking-wider font-mono">AI Recommended Price</span>
                      <p className="text-2xl font-black text-white mt-1 font-mono flex items-baseline gap-1.5 leading-none">
                        ₹{pricingResult.suggestedPrice.toLocaleString('en-IN')}
                        {pricingResult.suggestedPrice !== pricingResult.currentPrice && (
                          <span className={`text-[11px] font-bold ${pricingResult.suggestedPrice > pricingResult.currentPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pricingResult.suggestedPrice > pricingResult.currentPrice ? '▲ +' : '▼ '}
                            {Math.round(((pricingResult.suggestedPrice - pricingResult.currentPrice) / pricingResult.currentPrice) * 100)}%
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Pricing reasoning text */}
                  <div className="bg-[#0b0e17] rounded-3xl p-5 border border-slate-900 relative">
                    <span className="absolute top-[-10px] left-5 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase text-saffron tracking-wider font-mono">
                      Neural Strategy Advisor
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-semibold italic pt-2">
                      "{pricingResult.reason}"
                    </p>
                  </div>

                  {/* Apply actions */}
                  <div className="space-y-3">
                    {applyStatus === 'success' && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-bold text-emerald-400 flex items-center gap-2.5 animate-fadeIn">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span>Ticket Base Price successfully re-calibrated. All checkout points shifted instantly!</span>
                      </div>
                    )}
                    {applyStatus === 'error' && (
                      <div className="p-4 bg-red-500/15 border border-red-500/20 rounded-2xl text-xs font-bold text-red-400 flex items-center gap-2.5 animate-fadeIn">
                        <XCircle size={16} className="shrink-0 animate-ping" />
                        <span>Failed to deploy pricing update onto ledger. Please check network key status.</span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {/* Action Apply suggested price */}
                      <button
                        onClick={handleApplyPricing}
                        disabled={applyStatus === 'loading' || pricingResult.suggestedPrice === pricingResult.currentPrice}
                        className="flex-1 py-4 bg-saffron hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-saffron text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/10 active:scale-95 flex justify-center items-center gap-2 text-center cursor-pointer"
                      >
                        {applyStatus === 'loading' ? (
                          <>
                            <span className="w-3 border-2 border-white/20 border-t-white animate-spin rounded-full h-3 inline-block" />
                            Calibrating Price Ledger...
                          </>
                        ) : pricingResult.suggestedPrice === pricingResult.currentPrice ? (
                          'Pricing Strategy Locked'
                        ) : (
                          <>
                            <Zap size={14} /> Deploy Price Adjustment
                          </>
                        )}
                      </button>

                      {/* Recalculate */}
                      <button
                        type="button"
                        onClick={() => calculateDynamicPricing(selectedPricingEventId)}
                        disabled={isCalculatingPricing}
                        className="p-4 bg-slate-900 border border-slate-800 hover:text-white text-slate-400 hover:bg-slate-800 transition-all rounded-2xl cursor-pointer"
                        title="Re-run pricing diagnostics"
                      >
                        <RefreshCw size={14} className={isCalculatingPricing ? 'animate-spin text-saffron' : ''} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* AI EVENT SUCCESS PREDICTIONS HISTORY LEDGER */}
          <div className="glass-panel p-8 rounded-[3rem] border-slate-800/60 bg-slate-900/10 relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#10b981]/5 rounded-full blur-3xl pointer-events-none" />
            
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2.5">
                <Sparkles className="text-emerald-400 animate-pulse" size={20} />
                AI Event Success Predictions Ledger
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                A secure log of all event success chance metrics, expected footfalls, and tactical suggestions parsed by high-fidelity models.
              </p>
            </div>

            {predictionsHistory.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/40 rounded-3xl border border-slate-900 text-slate-500 text-xs font-mono">
                No success predictions recorded yet, Ji. Predictions run automatically when you click 'Analyze Flight Viability' inside the new event gate creation form!
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {predictionsHistory.map((pred, index) => (
                  <div key={pred.id || index} className="p-5 bg-[#0a0d14] rounded-[2rem] border border-slate-850 hover:border-slate-800 transition-all space-y-4 group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                      <div>
                        <span className="text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">{pred.category} • {pred.date} • Base ₹{pred.basePrice}</span>
                        <h4 className="text-sm font-black text-white group-hover:text-saffron transition-all">{pred.name}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">{pred.location}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-wider block">CHANCE OF SUCCESS</span>
                          <span className={`text-sm font-black font-mono ${
                            pred.successChance >= 85 ? 'text-emerald-400' :
                            pred.successChance >= 60 ? 'text-saffron' :
                            'text-rose-400'
                          }`}>{pred.successChance}%</span>
                        </div>
                        <div className="px-3 py-1 bg-slate-900 border border-slate-850 rounded-xl text-center">
                          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-wider block">RISK</span>
                          <span className={`text-[10px] font-black font-mono ${
                            pred.risk === 'Low' ? 'text-emerald-400' :
                            pred.risk === 'Medium' ? 'text-blue-400' :
                            'text-rose-400'
                          }`}>{pred.risk}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Analysis Explanation */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-mono font-black tracking-widest text-[#FF9933] uppercase">Neural Diagnostic Analysis (Confidence: {pred.confidenceScore || 90}%)</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-semibold italic">"{pred.explanation}"</p>
                      </div>

                      {/* Actionable items */}
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-mono font-black tracking-widest text-emerald-400 uppercase">Growth Action Plan</span>
                        <div className="space-y-1">
                          {pred.suggestions && pred.suggestions.map((sug: string, sIdx: number) => (
                            <div key={sIdx} className="text-[10px] text-slate-400 font-medium flex gap-1.5">
                              <span className="text-saffron font-extrabold font-mono">•</span>
                              <span>{sug}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl text-[10px] text-slate-500 font-bold uppercase font-mono text-center">
            Recommendations fully calibrated at {new Date().toLocaleTimeString('en-IN')} using Gemini-3.5-flash neural architectures.
          </div>
        </div>
      )}

      {/* POPUP FORM PANEL MODAL (Keep previous completely working mint event pass flows) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl rounded-[3rem] p-8 md:p-10 border-slate-700/60 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-zoomIn bg-[#0d101a]">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">
                {editingEvent ? 'Modify Event Pass Gate' : 'Issue New OmniTick Gates'}
              </h3>
              <button 
                onClick={() => { resetForm(); setShowCreateModal(false); }}
                className="text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest bg-slate-900 px-3 py-1.5 border border-slate-850 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5 col-span-full">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Event Name / Event Title</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="IPL 2206 Dynamic MH Finals"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold cursor-pointer"
                  >
                    {['Music', 'Sports', 'Expo', 'Conference', 'Culture'].map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ticket Base Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="1200"
                  />
                </div>

                <div className="space-y-1.5 col-span-full">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Venue Location (Physical Address)</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="NER Stadium, Sector 12, Gurugram"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Time</label>
                  <input
                    type="text"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="18:30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Seating Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="1500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Graphic Image / Banner URL</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                </div>

                <div className="space-y-1.5 col-span-full border-t border-slate-800/40 pt-4">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2 font-mono">Geo coordinates (For Trust Map Finder UI)</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Geo Latitude</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="Example: 19.0760"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Geo Longitude</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
                    placeholder="Example: 72.8777"
                  />
                </div>

                {/* AI Success Predictor Diagnostics Panel */}
                <div className="space-y-4 col-span-full border-t border-slate-800/60 pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                        <Sparkles size={14} className="text-saffron animate-pulse" />
                        AI Event Success Diagnostics & Predictor
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Evaluate overall booking velocity potential and event-grade risk before propagation, Bhai.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handlePredictSuccess}
                      disabled={isPredicting}
                      className="px-4 py-2 bg-saffron hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
                    >
                      {isPredicting ? (
                        <>
                          <span className="w-2.5 h-2.5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
                          Projections Live...
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} />
                          Analyze Flight Viability
                        </>
                      )}
                    </button>
                  </div>
                  
                  {predictionFeedback && (
                    <p className="text-[10px] text-rose-400 font-mono font-bold animate-fadeIn">{predictionFeedback}</p>
                  )}

                  {predictionResult && (
                    <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/40 space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-3 gap-3">
                        {/* Success Score */}
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 text-center relative overflow-hidden">
                          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest block mb-1">Success Chance</span>
                          <p className="text-xl font-black text-white font-mono">{predictionResult.successChance}%</p>
                          <div className="absolute bottom-0 left-0 h-1 bg-saffron transition-all" style={{ width: `${predictionResult.successChance}%` }} />
                        </div>

                        {/* Expected Attendees */}
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 text-center">
                          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest block mb-1">Expected Footfalls</span>
                          <p className="text-xl font-black text-white font-mono">{predictionResult.expectedAttendance?.toLocaleString('en-IN')}</p>
                        </div>

                        {/* Event risk score */}
                        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-850 text-center relative">
                          <span className="text-[8px] font-mono font-black text-slate-500 uppercase tracking-widest block mb-1">Risk Assessment</span>
                          <p className={`text-xl font-black font-mono ${
                            predictionResult.risk === 'Low' ? 'text-emerald-400' :
                            predictionResult.risk === 'Medium' ? 'text-blue-400' :
                            'text-rose-400'
                          }`}>{predictionResult.risk}</p>
                        </div>
                      </div>

                      {/* Strategy and logic */}
                      <div className="space-y-1.5 p-3.5 bg-slate-950 border border-slate-900 rounded-xl relative">
                        <span className="block text-[8px] font-mono font-black uppercase tracking-widest text-[#FF9933] mb-1">Confidence Score: {predictionResult.confidenceScore || 90}%</span>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-semibold font-italic">"{predictionResult.explanation}"</p>
                      </div>

                      {/* Suggested actionable directives */}
                      <div className="space-y-2">
                        <span className="block text-[8px] font-mono font-black uppercase tracking-widest text-emerald-400">Actionable Tactics to Maximize Ticket Yields:</span>
                        <div className="grid grid-cols-1 gap-2">
                          {predictionResult.suggestions && predictionResult.suggestions.map((sug: string, idx: number) => (
                            <div key={idx} className="flex gap-2 items-start bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-850/60 text-[10px] text-slate-400 font-medium">
                              <span className="text-saffron font-bold font-mono">0{idx+1}.</span>
                              <span>{sug}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-slate-800/60">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-saffron hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Syncing...' : (editingEvent ? 'Save Modifications' : 'Create & Propagate')}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setShowCreateModal(false); }}
                  className="px-6 py-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple visual icon wrapper variables to satisfy react/typescript inline declarations in a lightweight clean code format
const TrendUpIconWrapper: React.FC<{ active?: boolean }> = ({ active }) => (
  <TrendingUp size={16} className={active ? 'text-saffron animate-bounce' : 'text-slate-500'} />
);

const CalendarIconWrapper: React.FC<{ active?: boolean }> = ({ active }) => (
  <Calendar size={16} className={active ? 'text-saffron' : 'text-slate-500'} />
);

const TerminalIconWrapper: React.FC<{ active?: boolean }> = ({ active }) => (
  <QrCode size={16} className={active ? 'text-saffron' : 'text-slate-500'} />
);

const SparklesIconWrapper: React.FC<{ active?: boolean }> = ({ active }) => (
  <Sparkles size={16} className={active ? 'text-saffron' : 'text-slate-500'} />
);

export default OrganizerDashboard;
