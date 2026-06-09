import React, { useState } from 'react';
import { Compass, Search, Filter, MapPin, Sparkles, Navigation } from 'lucide-react';
import { Event } from '../types';
import MapView from './MapView';

interface MapExplorerProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
}

const MapExplorer: React.FC<MapExplorerProps> = ({ events = [], onSelectEvent }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedRadius, setSelectedRadius] = useState<number>(0); // 0 means show all
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEventLocal, setSelectedEventLocal] = useState<Event | null>(null);

  const categories = ['All', 'Sports', 'Music', 'Expo', 'Conference', 'Culture'];
  const radii = [
    { label: 'Show All India', value: 0 },
    { label: 'Within 5 km', value: 5 },
    { label: 'Within 10 km', value: 10 },
    { label: 'Within 25 km', value: 25 },
    { label: 'Within 50 km', value: 50 },
  ];

  // Filter events based on search query, category, and whether they are approved
  const filteredEvents = events.filter(evt => {
    if (evt.status !== 'Approved') return false;
    if (!evt.isPublished) return false;
    
    const matchesCategory = selectedCategory === 'All' || evt.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = evt.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          evt.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      {/* Header filter controls */}
      <div className="glass-panel p-6 rounded-[2rem] border-slate-800/60 shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Compass className="text-saffron shrink-0" />
              Saffron Trust Map Nodes
            </h3>
            <p className="text-xs text-slate-400 mt-1">Discover verified events closest to your geo nodes in India.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedEventLocal(null);
                }}
                className={`px-4 py-2 text-[10px] uppercase font-black tracking-widest rounded-xl transition-all ${
                  selectedCategory === cat 
                    ? 'bg-saffron text-white shadow-lg shadow-orange-500/20' 
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search text filter */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-saffron transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedEventLocal(null);
              }}
              className="w-full pl-12 pr-4 py-3 bg-slate-950/40 border border-slate-800 rounded-xl focus:border-saffron/50 outline-none text-slate-100 text-xs font-semibold"
              placeholder="Search by center or event name..."
            />
          </div>

          {/* Search radius filter */}
          <div className="relative flex items-center bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-3">
            <Filter className="w-4 h-4 text-slate-500 mr-2" />
            <select
              value={selectedRadius}
              onChange={(e) => {
                setSelectedRadius(Number(e.target.value));
                setSelectedEventLocal(null);
              }}
              className="bg-transparent text-slate-100 outline-none text-xs font-semibold w-full cursor-pointer pr-4"
            >
              {radii.map(r => (
                <option key={r.value} value={r.value} className="bg-slate-900 text-white">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic selector text info */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 px-4 bg-orange-500/5 rounded-xl border border-orange-500/10">
            <Sparkles size={14} className="text-saffron" />
            <span>Showing {filteredEvents.length} active event pins</span>
          </div>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[300px]">
        {/* Left side info block showing match lists */}
        <div className="glass-panel p-5 rounded-[2rem] border-slate-800/60 overflow-y-auto lg:col-span-1 space-y-4 max-h-full">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest pl-1">Matching Node Gates</h4>
          <div className="space-y-3">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active event pins matched your radius coordinates, Bhai.
              </div>
            ) : (
              filteredEvents.map(evt => {
                const isSelected = selectedEventLocal?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEventLocal(evt)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected 
                        ? 'bg-saffron/5 border-saffron/40 shadow-lg' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-extrabold text-xs text-white leading-relaxed">{evt.name}</p>
                      <span className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-800 text-slate-400 uppercase">
                        {evt.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                      <MapPin size={10} className="text-saffron shrink-0" />
                      <span className="truncate">{evt.location}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center mt-1">
                      <span className="text-[10px] font-black text-saffron">₹{evt.basePrice.toLocaleString('en-IN')}</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(evt);
                        }}
                        className="px-2.5 py-1 bg-saffron text-white text-[8px] font-black uppercase rounded-md hover:bg-orange-500 transition-colors"
                      >
                        Secure Pass
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Map Canvas itself */}
        <div className="lg:col-span-3 h-full rounded-[2.5rem] overflow-hidden min-h-[300px]">
          <MapView 
            events={filteredEvents}
            selectedEvent={selectedEventLocal}
            radiusFilter={selectedRadius}
            onSelectEvent={onSelectEvent}
          />
        </div>
      </div>
    </div>
  );
};

export default MapExplorer;
