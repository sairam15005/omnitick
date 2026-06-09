import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Sparkles, 
  Loader2, 
  Heart, 
  MapPin, 
  Tag, 
  Check, 
  Calendar, 
  Briefcase, 
  Music, 
  SlidersHorizontal 
} from 'lucide-react';
import { User, Event } from '../types';
import { 
  getPersonalizedRecommendations, 
  getDemandForecast, 
  getUserPreferences, 
  saveUserPreferences 
} from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  user: User;
  events: Event[];
  onBookEvent?: (event: Event) => void;
}

const CATEGORY_OPTIONS = ['Sports', 'Music', 'Culture', 'Conference'];
const INDIAN_CITIES_OPTIONS = ['Goa', 'Mumbai', 'Bengaluru', 'Noida', 'Delhi', 'MP', 'Chennai'];

const Dashboard: React.FC<DashboardProps> = ({ user, events, onBookEvent }) => {
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [topInsight, setTopInsight] = useState<string>('');
  const [recommendedEventsInfo, setRecommendedEventsInfo] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Preferences State
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(10000);
  const [datePref, setDatePref] = useState<string>('any');
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initial loader for preferences and recommendation data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch saved user preferences
        const prefs = await getUserPreferences();
        if (prefs) {
          setSelectedCategories(prefs.preferredCategories || []);
          setPreferredLocations(prefs.preferredLocations || []);
          setMaxPrice(prefs.maxPricePreference || 10000);
          setDatePref(prefs.favoriteDatePreference || 'any');
        }

        // 2. Fetch forecast & recommendation lists
        const [forecast, recs] = await Promise.all([
          getDemandForecast(events),
          getPersonalizedRecommendations(user, events)
        ]);

        if (forecast?.forecastData) setForecastData(forecast.forecastData);
        if (recs?.recommendations) setRecommendations(recs.recommendations);
        if (recs?.topInsight) setTopInsight(recs.topInsight);
        if (recs?.recommendedEvents) setRecommendedEventsInfo(recs.recommendedEvents);
      } catch (error) {
        console.error("Dashboard data load error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, events]);

  // Handle setting/saving user explicit preferences
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    setSaveStatus(null);
    try {
      // Send parameters to backend save API
      await saveUserPreferences({
        preferredCategories: selectedCategories,
        preferredLocations,
        maxPricePreference: maxPrice,
        favoriteDatePreference: datePref
      });

      setSaveStatus({ type: 'success', message: 'Preferences securely synced to your Passport profile!' });

      // Refresh recommendations list following user changes
      const recs = await getPersonalizedRecommendations(user, events);
      if (recs?.recommendations) setRecommendations(recs.recommendations);
      if (recs?.topInsight) setTopInsight(recs.topInsight);
      if (recs?.recommendedEvents) setRecommendedEventsInfo(recs.recommendedEvents);
      
      // Auto dismiss message after 3s
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus({ type: 'error', message: 'Failed to sync offline nodes. Try again, Bhai.' });
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleLocationToggle = (location: string) => {
    setPreferredLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location) 
        : [...prev, location]
    );
  };

  // Map recommended event logs from API against actual events database
  const mappedRecommendations = recommendedEventsInfo
    .map(rec => {
      const parentEvent = events.find(e => e.id === rec.eventId);
      if (!parentEvent) return null;
      return {
        ...parentEvent,
        matchPercentage: rec.matchPercentage,
        reasonText: rec.reasonText
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-saffron animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Syncing with Bharat ML nodes...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10 pb-20 max-w-7xl mx-auto"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Your Insights</h2>
          <p className="text-slate-400 mt-2 text-lg">Predicting India's entertainment trends just for you, {user.name}.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-saffron/10 text-saffron rounded-2xl text-xs font-black uppercase tracking-widest border border-saffron/20">
          <Sparkles size={14} /> Localized ML Optimization
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Saved on Fees', value: '₹14,200', change: '+12%', desc: 'via P2P Ledger', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Event Discovery', value: events.length.toString(), change: '+24', desc: 'New suggestions', icon: Sparkles, color: 'text-saffron', bg: 'bg-saffron/10' },
          { label: 'Peak Prediction', value: 'Extreme', change: '92%', desc: 'Festival Season', icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Wallet Security', value: 'Safe', change: '100%', desc: 'Node syncing', icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            whileHover={{ y: -4 }}
            className="glass-panel p-6 rounded-[2rem] border-slate-800/60 flex flex-col transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-white">{stat.value}</p>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800/40">
              <span className="text-[10px] font-bold text-slate-500 uppercase">{stat.desc}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stat.color} ${stat.bg}`}>
                {stat.change}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN - Forecasting & Personalized Matches */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Demand Projected Curve */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <TrendingUp size={20} className="text-saffron" />
                  Regional Demand Forecasting
                </h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Predicted booking activity across Indian cities.</p>
              </div>
              <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                <button className="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg bg-saffron text-white">7D</button>
                <button className="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg text-slate-500 hover:text-slate-300 transition-colors">30D</button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData.length > 0 ? forecastData : []}>
                  <defs>
                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9933" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#FF9933" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFD700" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#FFD700" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} tickMargin={10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #334155', borderRadius: '16px', padding: '12px' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="demand" stroke="#FF9933" fillOpacity={1} fill="url(#colorDemand)" strokeWidth={4} name="Regional Bookings" />
                  <Area type="monotone" dataKey="forecast" stroke="#FFD700" fillOpacity={1} fill="url(#colorForecast)" strokeWidth={3} strokeDasharray="10 10" name="ML Prediction" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Personalized Recommended Events list */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <Heart size={20} className="text-rose-500 fill-rose-500" />
                Personalized Pass Matches
              </h3>
              <p className="text-sm text-slate-500 mt-1">Surgical context matching based on your history, preferences and chat keywords.</p>
            </div>

            {mappedRecommendations.length === 0 ? (
              <div className="py-12 text-center rounded-[2rem] bg-slate-900/30 border border-slate-800/50">
                <Sparkles size={36} className="text-slate-600 mx-auto mb-4" />
                <p className="text-sm text-slate-400 font-bold">No perfect match fits your current limits yet, Bhai.</p>
                <p className="text-xs text-slate-600 mt-1">Adjust your budget or choose more categories on the right to train the model!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mappedRecommendations.map((event) => (
                  <motion.div
                    key={event.id}
                    whileHover={{ y: -4 }}
                    className="flex flex-col bg-[#0f1424] border border-slate-800 rounded-[2rem] p-5 overflow-hidden justify-between transition-all duration-300 relative"
                  >
                    {/* Compatibility Badge */}
                    <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black">
                      ★ {event.matchPercentage}% MATCH
                    </div>

                    <div className="space-y-3">
                      <span className="inline-block text-[9px] font-black tracking-widest text-[#FF9933] uppercase px-2.5 py-0.5 rounded-md bg-orange-500/5 border border-orange-500/10">
                        {event.category}
                      </span>
                      <h4 className="text-sm font-extrabold text-white leading-tight mt-1 truncate">
                        {event.name}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <MapPin size={12} className="text-slate-500" />
                        <span className="truncate">{event.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar size={12} className="text-slate-500" />
                        <span>{event.date} • {event.time}</span>
                      </div>

                      {/* AI Matching Explanation Tooltip */}
                      <div className="p-3 bg-saffron/5 border border-saffron/15 rounded-xl mt-4">
                        <p className="text-[10px] text-saffron font-bold leading-relaxed">
                          "{event.reasonText}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/60 pt-4 mt-6">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Entry Rate</span>
                        <p className="text-[15px] font-black text-white">₹{event.basePrice}</p>
                      </div>

                      {onBookEvent && (
                        <button
                          onClick={() => onBookEvent(event)}
                          className="bg-saffron text-[#0a0a0a] hover:bg-white text-[10px] font-black uppercase tracking-wider py-2 px-4 rounded-xl transition duration-200"
                        >
                          Book Ticket
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN - India Affinity & User Preferences Panel */}
        <div className="space-y-8 flex flex-col">
          
          {/* Affinity Indicator & Explanation bubble */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 flex flex-col">
            <h3 className="text-xl font-bold text-white mb-2">Category Affinity Index</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Model's live estimation of your affinity metrics.</p>
            <div className="min-h-[220px]">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={recommendations} layout="vertical" barSize={10} margin={{ left: -20, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} fontWeight="bold" tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #334155', borderRadius: '16px' }}
                  />
                  <Bar dataKey="val" radius={[0, 10, 10, 0]} name="Affinity Level">
                    {recommendations.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#FF9933'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <AnimatePresence mode="wait">
              {topInsight && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-5 bg-saffron/5 border border-saffron/10 rounded-[1.5rem] relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-35 transition-opacity">
                    <Activity className="w-12 h-12 text-saffron" />
                  </div>
                  <p className="text-xs text-saffron leading-relaxed font-bold italic">
                    "{topInsight}"
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* USER PREFERENCES PANEL (Requirement 5) */}
          <div className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-saffron" />
                Customize AI Filters
              </h3>
              <p className="text-xs text-slate-500 mt-1">Train the recommendation engine explicitly by syncing your choices.</p>
            </div>

            {/* Save Status Notification */}
            {saveStatus && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 text-xs font-bold rounded-2xl border text-center ${
                  saveStatus.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {saveStatus.message}
              </motion.div>
            )}

            {/* Category Preferences Multiselect Pills */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Preferred Categories:</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryToggle(cat)}
                      className={`text-2xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 ${
                        isSelected 
                          ? 'bg-saffron text-[#0a0a0a] border-saffron font-black shadow-md shadow-orange-500/10' 
                          : 'bg-[#0a0a0a]/50 text-slate-400 border-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Indian Hub Locations */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hub Filter Nodes:</span>
              <div className="flex flex-wrap gap-2 pt-1">
                {INDIAN_CITIES_OPTIONS.map((loc) => {
                  const isSelected = preferredLocations.includes(loc);
                  return (
                    <button
                      key={loc}
                      onClick={() => handleLocationToggle(loc)}
                      className={`text-2xs font-bold px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1 ${
                        isSelected 
                          ? 'bg-emerald-500 text-white border-emerald-500 font-black shadow-md shadow-emerald-500/10' 
                          : 'bg-[#0a0a0a]/50 text-slate-400 border-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <MapPin size={10} />
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Maximum Price Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Max Ticket Price limit:</span>
                <span className="text-saffron font-bold text-xs font-mono">₹{maxPrice.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="300"
                max="15000"
                step="250"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-saffron bg-slate-900 py-1"
              />
              <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest font-mono">
                <span>₹300</span>
                <span>₹15,000</span>
              </div>
            </div>

            {/* Date Preferences */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Timing Preference:</span>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'any', label: 'Anytime' },
                  { id: 'weekends', label: 'Weekends' },
                  { id: 'weekdays', label: 'Weekdays' },
                ].map((timing) => (
                  <button
                    key={timing.id}
                    onClick={() => setDatePref(timing.id)}
                    className={`text-2xs font-bold py-2 rounded-xl border text-center transition-all ${
                      datePref === timing.id
                        ? 'bg-slate-100 text-[#0a0a0a] border-slate-100 font-extrabold'
                        : 'bg-[#0a0a0a]/50 text-slate-400 border-slate-800/60 hover:bg-slate-900/60'
                    }`}
                  >
                    {timing.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sync Save Button */}
            <button
              onClick={handleSavePreferences}
              disabled={isSavingPrefs}
              className="w-full bg-saffron text-[#0a0a0a] hover:bg-white text-xs font-black uppercase tracking-wider h-11 rounded-2xl transition duration-200 flex items-center justify-center gap-2 mt-4"
            >
              {isSavingPrefs ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Syncing Profile...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Save AI Preferences</span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>
    </motion.div>
  );
};

export default Dashboard;
