import React, { useState } from 'react';
import { Search, MapPin, Calendar, Sparkles, ArrowRight, Brain, X, RotateCcw, Coins, Tag, AlertCircle } from 'lucide-react';
import { Event } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface EventExplorerProps {
  events: Event[];
  onEventClick: (name: string) => void;
}

const EventExplorer: React.FC<EventExplorerProps> = ({ events, onEventClick }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchMode, setSearchMode] = useState<'standard' | 'ai'>('standard');
  
  // AI Search states
  const [aiQuery, setAiQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<Event[] | null>(null);
  const [aiFilters, setAiFilters] = useState<{
    category?: string | null;
    location?: string | null;
    maxPrice?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    keyword?: string | null;
    explanation?: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const categories = ['All', 'Music', 'Sports', 'Conference', 'Expo', 'Culture', 'Education'];

  const samplePrompts = [
    "Find tech events under ₹3000 in Bangalore",
    "Music festivals near Vagator Beach, Goa",
    "Classical dance under ₹1000",
    "High budget sports matches in Mumbai"
  ];

  // Manual frontend criteria matches
  const filteredEvents = events.filter(e => {
    if (e.status && e.status !== 'Approved') return false;
    if (!e.isPublished) return false;
    
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || 
                          e.location.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || e.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAiSearchSubmit = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsAiSearching(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });
      if (response.ok) {
        const data = await response.json();
        setAiResults(data.events || []);
        setAiFilters(data.filters || null);
      } else {
        const err = await response.json();
        setAiError(err.error || 'Failed to complete AI query parsing.');
      }
    } catch (e) {
      setAiError('Network connection lost, please check your local Node setup.');
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleQuickPromptClick = (prompt: string) => {
    setAiQuery(prompt);
    handleAiSearchSubmit(prompt);
  };

  const clearAiResults = () => {
    setAiResults(null);
    setAiFilters(null);
    setAiQuery('');
    setAiError(null);
  };

  // Decide what event array to list on screen
  const displayedEvents = aiResults !== null ? aiResults : filteredEvents;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10 max-w-7xl mx-auto pb-10"
    >
      {/* Hero Header Section */}
      <section className="relative overflow-hidden rounded-[32px] p-10 md:p-16 bg-gradient-to-br from-[#FF9933] via-[#FFFFFF]/10 to-[#138808]">
        <div className="absolute inset-0 bg-black/40 z-0" />
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold tracking-widest uppercase mb-6 backdrop-blur-md border border-white/20">
            <Sparkles size={12} className="text-gold" /> Curated for India
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.1] mb-6">
            Discover the best <span className="text-saffron">events</span> in India.
          </h1>
          <p className="text-slate-200 text-lg mb-8 leading-relaxed">
            From IPL cricket blockaudits to music festivals, find events instantly with our natural language search and secure booking nodes.
          </p>
          <div className="flex flex-wrap gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEventClick('anything interesting in India')}
              className="px-8 py-4 bg-saffron text-white font-bold rounded-2xl hover:bg-orange-500 transition-all shadow-xl shadow-orange-900/40"
            >
              Explore Bharat
            </motion.button>
            <div className="flex -space-x-3 items-center">
              {[1, 2, 3, 4].map(i => (
                <img key={i} className="w-10 h-10 rounded-full border-2 border-orange-700" src={`https://i.pravatar.cc/100?img=${i+20}`} alt="user" referrerPolicy="no-referrer" />
              ))}
              <span className="ml-5 text-sm text-orange-100 font-medium">+10k booking daily</span>
            </div>
          </div>
        </motion.div>
        {/* Decorative background shapes */}
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[60%] w-[40%] h-[80%] bg-orange-400/10 rounded-full blur-3xl" />
      </section>

      {/* Discovery Navigation Mode Selector */}
      <div className="flex justify-center border-b border-slate-800/80 p-1 bg-slate-950/45 rounded-2xl max-w-md mx-auto">
        <button
          onClick={() => { setSearchMode('standard'); clearAiResults(); }}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            searchMode === 'standard'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search size={14} /> Traditional Search
        </button>
        <button
          onClick={() => setSearchMode('ai')}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            searchMode === 'ai'
              ? 'bg-gradient-to-r from-saffron to-[#138808] text-white shadow-lg font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain size={14} /> ✨ Gemini AI Search
        </button>
      </div>

      {/* Conditional Search Section */}
      <AnimatePresence mode="wait">
        {searchMode === 'standard' ? (
          <motion.div 
            key="standard-filters"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-x-auto scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeCategory === cat 
                      ? 'bg-saffron text-white shadow-lg shadow-orange-600/20' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-saffron transition-colors" />
              <input 
                type="text" 
                placeholder="Search events, cities..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-80 pl-12 pr-6 py-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-saffron/20 focus:border-saffron/50 outline-none text-slate-100 transition-all text-sm font-semibold"
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ai-search-filter"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="glass-panel p-8 rounded-[2.5rem] border-slate-800/60 relative overflow-hidden space-y-6"
          >
            {/* Subtle light effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Brain className="text-saffron animate-pulse" size={20} /> AI-Powered Search Node
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Type queries naturally (like: <span className="text-orange-400 italic">"Find EDM festivals in Goa next week"</span> or <span className="text-emerald-400 italic">"Sports games below 2000 rupees in Mumbai"</span>). Our Gemini Node will automatically formulate precise database criteria matching verified blockchain passes.
              </p>
            </div>

            <form 
              onSubmit={(e) => { e.preventDefault(); handleAiSearchSubmit(aiQuery); }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="relative flex-1">
                <Brain className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Ask Gemini to find events matching locations, prices, times or keywords..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-[#0a0f1d]/90 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none text-slate-100 transition-all text-sm font-semibold"
                  disabled={isAiSearching}
                />
              </div>
              <button
                type="submit"
                disabled={isAiSearching || !aiQuery.trim()}
                className="px-8 py-4 bg-gradient-to-r from-saffron to-orange-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 select-none"
              >
                {isAiSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Parsing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Prompts Chips */}
            <div className="space-y-2.5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Suggested Queries</p>
              <div className="flex flex-wrap gap-2.5">
                {samplePrompts.map((prompt, prIdx) => (
                  <button
                    key={prIdx}
                    type="button"
                    onClick={() => handleQuickPromptClick(prompt)}
                    className="px-4 py-2 bg-slate-900/60 hover:bg-saffron/10 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-saffron hover:border-saffron/30 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Error Display */}
            {aiError && (
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-200 text-xs font-medium">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Inferred Filters Display */}
            {aiFilters && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-5 bg-gradient-to-br from-orange-500/5 to-[#138808]/5 border border-slate-800/80 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-saffron/10 text-saffron rounded-lg font-bold text-xs">AI Smart Filter</span>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Identified Constraints</span>
                  </div>
                  <button 
                    onClick={clearAiResults}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-all bg-slate-800/40 px-2.5 py-1.5 rounded-lg border border-slate-700/60"
                  >
                    <RotateCcw size={12} /> Clear Filter
                  </button>
                </div>

                <p className="text-xs text-slate-200 font-semibold italic bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  ⚡ "{aiFilters.explanation}"
                </p>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  {aiFilters.category && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-black uppercase tracking-wider rounded-lg border border-orange-500/20">
                      <Tag size={12} /> {aiFilters.category}
                    </span>
                  )}
                  {aiFilters.location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-500/20">
                      <MapPin size={12} /> {aiFilters.location}
                    </span>
                  )}
                  {aiFilters.maxPrice && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-black uppercase tracking-wider rounded-lg border border-yellow-500/20">
                      <Coins size={12} /> Max ₹{aiFilters.maxPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  {aiFilters.startDate && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-black uppercase tracking-wider rounded-lg border border-blue-500/20">
                      <Calendar size={12} /> After {aiFilters.startDate}
                    </span>
                  )}
                  {aiFilters.keyword && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 text-xs font-black uppercase tracking-wider rounded-lg border border-purple-500/20">
                      <Search size={12} /> Keyword: "{aiFilters.keyword}"
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matching Count Header */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-900">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <span>{aiResults !== null ? 'AI Matched' : 'Explore'} Events</span>
          <span className="text-sm font-black text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-lg">
            {displayedEvents.length} list{displayedEvents.length === 1 ? '' : 's'}
          </span>
        </h2>
        {aiResults !== null && (
          <button 
            onClick={clearAiResults}
            className="text-xs font-extrabold text-saffron hover:text-white transition-all flex items-center gap-1"
          >
            Show All Events <X size={12} />
          </button>
        )}
      </div>

      {/* Dynamic Event Grid */}
      {displayedEvents.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel py-20 px-8 text-center rounded-[2.5rem] border-slate-800/80 max-w-xl mx-auto space-y-4"
        >
          <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center mx-auto text-slate-600 border border-slate-800">
            <Search size={28} />
          </div>
          <h3 className="text-lg font-black text-slate-200">Arrey No Matches Found!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            We couldn't locate any live verified events matching your current criteria on standard trust nodes. Try adjusting details or search with other keywords.
          </p>
          <button
            onClick={() => { clearAiResults(); setSearch(''); setActiveCategory('All'); }}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-white rounded-xl text-xs font-bold uppercase transition-all"
          >
            Reset All Filters
          </button>
        </motion.div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence>
            {displayedEvents.map((event) => (
              <motion.div 
                key={event.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -8 }}
                className="group glass-panel rounded-[2.5rem] overflow-hidden border-slate-800/60 hover:border-saffron/40 hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-500 flex flex-col"
              >
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={event.image} 
                    alt={event.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />
                  <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md text-white text-[11px] font-black uppercase border border-white/10">
                    {event.category}
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md text-white text-xs font-bold border border-white/5">
                    <Sparkles size={12} className="text-gold" /> 
                    {event.available} left
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-saffron transition-colors leading-tight">
                      {event.name}
                    </h3>
                  </div>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
                        <Calendar size={14} className="text-saffron" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">{event.date}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center">
                        <MapPin size={14} className="text-india-green" />
                      </div>
                      <span className="text-sm font-medium truncate">{event.location}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-800/50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Price from</p>
                      <p className="text-2xl font-black text-white">₹{event.basePrice.toLocaleString('en-IN')}</p>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEventClick(event.name)}
                      className="w-12 h-12 rounded-2xl bg-saffron hover:bg-orange-500 text-white flex items-center justify-center transition-all shadow-lg shadow-orange-600/20"
                    >
                      <ArrowRight size={20} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EventExplorer;
