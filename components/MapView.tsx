import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass, AlertCircle, Loader2, Layers } from 'lucide-react';
import { Event } from '../types';

interface MapViewProps {
  events: Event[];
  selectedEvent?: Event | null;
  radiusFilter?: number; // in km
  onSelectEvent?: (event: Event) => void;
  enableUserLocation?: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  events = [],
  selectedEvent = null,
  radiusFilter = 0,
  onSelectEvent,
  enableUserLocation = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const geolocationMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tileStyle, setTileStyle] = useState<'dark' | 'osm'>('dark');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // 1. Load Leaflet library dynamically to be 100% resilient
  useEffect(() => {
    if ((window as any).L) {
      setIsLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);

    const jsScript = document.createElement('script');
    jsScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    jsScript.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    jsScript.crossOrigin = '';
    jsScript.onload = () => {
      setIsLeafletLoaded(true);
    };
    jsScript.onerror = () => {
      setErrorMsg("Failed to boot up the map. Please confirm your internet connectivity, bhai.");
    };
    document.body.appendChild(jsScript);

    return () => {
      // Clean up injected elements if appropriate, though leaving them is fine
    };
  }, []);

  // 2. Geolocation extraction
  useEffect(() => {
    if (!enableUserLocation || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.warn("Geolocation permission not authorized:", error.message);
        // Fallback to central location (Mumbai) for demo purposes so it always works
        setUserCoords([19.0760, 72.8777]);
      },
      { enableHighAccuracy: true }
    );
  }, [enableUserLocation]);

  // 3. Haversine distance calculator
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 4. Initialize Map MapInstance
  useEffect(() => {
    if (!isLeafletLoaded || !mapContainerRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Use selected event coords, user position or standard default center of India
    const initialCenter = selectedEvent 
      ? [selectedEvent.latitude, selectedEvent.longitude] 
      : userCoords || [20.5937, 78.9629];
    
    const initialZoom = selectedEvent ? 12 : userCoords ? 6 : 5;

    // Destroy existing map if already present
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView(initialCenter, initialZoom);
    mapInstanceRef.current = map;

    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletLoaded]);

  // 4b. Dynamic OpenStreetMap / Dark Matter Tile Style Switching Effect
  useEffect(() => {
    if (!isLeafletLoaded || !mapInstanceRef.current) return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const url = tileStyle === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = tileStyle === 'dark'
      ? '&copy; OpenStreetMap contributors, &copy; CARTO Database'
      : '&copy; OpenStreetMap contributors';

    tileLayerRef.current = L.tileLayer(url, {
      attribution,
      maxZoom: 20
    }).addTo(map);

  }, [isLeafletLoaded, tileStyle]);

  // 5. Update Map Elements on State changes (events, filters, selected event, route)
  useEffect(() => {
    if (!isLeafletLoaded || !mapInstanceRef.current) return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;
    
    // Clear existing markers
    markersLayerRef.current.clearLayers();
    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    setRouteInfo(null);

    // Render Event Markers
    events.forEach(evt => {
      // Apply Radius Filter if user position is present
      if (radiusFilter > 0 && userCoords) {
        const dist = calculateHaversineDistance(userCoords[0], userCoords[1], evt.latitude, evt.longitude);
        if (dist > radiusFilter) return; // Skip if out of radius boundary
      }

      const isSelected = selectedEvent && selectedEvent.id === evt.id;

      // Custom markers with saffon / active color
      const markerHtml = `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${isSelected ? 'bg-saffron text-white ring-4 ring-orange-500/30' : 'bg-[#1e293b] text-saffron border border-saffron/40'} shadow-lg transform transition-transform hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `;

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-leaflet-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([evt.latitude, evt.longitude], { icon: customIcon })
        .addTo(markersLayerRef.current);

      const popupContent = `
        <div class="p-3 text-slate-100 min-w-48 leading-relaxed font-sans">
          <p class="font-extrabold text-sm mb-1 text-white">${evt.name}</p>
          <p class="text-xs text-saffron font-bold uppercase tracking-wider mb-2">${evt.category}</p>
          <p class="text-xs text-slate-300 mb-2 truncate">${evt.location}</p>
          <p class="font-black text-xs text-white mb-3">₹${evt.basePrice.toLocaleString('en-IN')}</p>
          <button id="pop-select-${evt.id}" class="w-full text-center px-3 py-1.5 bg-saffron text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-orange-500 transition-colors">
            Book Now
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Add selection callback on click
      marker.on('popupopen', () => {
        const selBtn = document.getElementById(`pop-select-${evt.id}`);
        if (selBtn) {
          selBtn.onclick = () => {
            if (onSelectEvent) onSelectEvent(evt);
          };
        }
      });
    });

    // Render User Geolocation
    if (userCoords) {
      const userHtml = `
        <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white ring-4 ring-emerald-500/30 shadow-lg">
          <div class="w-2.5 h-2.5 bg-white rounded-full animate-ping absolute" />
          <div class="w-3.5 h-3.5 bg-emerald-100 rounded-full flex items-center justify-center z-10">
             <div class="w-2 h-2 bg-emerald-600 rounded-full" />
          </div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'user-leaflet-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (geolocationMarkerRef.current) {
        map.removeLayer(geolocationMarkerRef.current);
      }

      geolocationMarkerRef.current = L.marker(userCoords, { icon: userIcon })
        .addTo(map)
        .bindPopup(`<p class="p-1 font-bold text-xs text-center text-white">Bhai, you are here!</p>`);

      // Render search radius circle
      if (radiusFilter > 0) {
        radiusCircleRef.current = L.circle(userCoords, {
          color: '#FF9933',
          fillColor: '#FF9933',
          fillOpacity: 0.08,
          radius: radiusFilter * 1000 // In meters
        }).addTo(map);

        // Autofit map to show the highlighted circle boundary
        map.fitBounds(radiusCircleRef.current.getBounds());
      }
    }

    // Render Active Route if custom single event selected and user geolocation is active
    if (selectedEvent && userCoords) {
      const eventCoords: [number, number] = [selectedEvent.latitude, selectedEvent.longitude];
      
      // Draw standard direct route line (or simulating realistic bends)
      routePolylineRef.current = L.polyline([userCoords, eventCoords], {
        color: '#FF9933',
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8',
        lineCap: 'round'
      }).addTo(map);

      // Center map viewport around the route bounds beautifully
      map.fitBounds(routePolylineRef.current.getBounds(), { padding: [50, 50] });

      // Calculate travel details
      const dist = calculateHaversineDistance(userCoords[0], userCoords[1], selectedEvent.latitude, selectedEvent.longitude);
      const estHours = dist / 45; // average 45km/h speed for India traffic
      const estMin = Math.round(estHours * 60);
      
      let travelTime = "";
      if (estMin > 60) {
        travelTime = `${Math.floor(estMin / 60)} hr ${estMin % 60} mins`;
      } else {
        travelTime = `${estMin} mins`;
      }

      setRouteInfo({
        distance: `${dist.toFixed(1)} km`,
        duration: travelTime
      });
    } else if (selectedEvent) {
      // Focus on active selected marker alone
      map.setView([selectedEvent.latitude, selectedEvent.longitude], 13);
    }

  }, [events, selectedEvent, radiusFilter, userCoords, isLeafletLoaded]);

  // Google maps native deep-link launcher
  const handleLaunchGoogleMaps = () => {
    if (!selectedEvent) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedEvent.latitude},${selectedEvent.longitude}`;
    window.open(url, '_blank');
  };

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center p-8 glass-panel rounded-3xl min-h-[400px] border-red-500/20 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Map Load Terminated</h3>
        <p className="text-slate-400 max-w-sm mb-6">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative w-full h-full flex flex-col min-h-[350px]">
      {!isLeafletLoaded ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/40 rounded-[2rem] border border-slate-800/60 p-12 text-center">
          <Loader2 className="w-12 h-12 text-saffron animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-400 animate-pulse">Initializing Indian Trust Map Node...</p>
        </div>
      ) : (
        <div className="flex-1 relative rounded-[2rem] overflow-hidden min-h-[350px]">
          <div 
            ref={mapContainerRef} 
            className={`absolute inset-0 w-full h-full ${tileStyle === 'dark' ? 'map-dark-inverted' : ''}`} 
            id="root-leaflet-div" 
          />
          
          {/* Custom style toggler layout for OSM vs Dark choice */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col items-end gap-2">
            <button
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              className="p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 rounded-2xl shadow-xl backdrop-blur-md text-white transition-all flex items-center justify-center gap-2 hover:border-saffron/40"
              title="Change Map Style"
            >
              <Layers size={16} className={tileStyle === 'dark' ? 'text-saffron' : 'text-emerald-400'} />
              <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Set Layer Style</span>
            </button>
            
            {showStyleMenu && (
              <div className="p-2.5 bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-1.5 min-w-[170px] animate-fade-in">
                <button
                  onClick={() => {
                    setTileStyle('dark');
                    setShowStyleMenu(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase text-left tracking-wider transition-all flex items-center justify-between ${
                    tileStyle === 'dark' 
                      ? 'bg-saffron/10 text-saffron border border-saffron/30' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <span>Saffron Midnight (Dark)</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${tileStyle === 'dark' ? 'bg-saffron' : 'bg-transparent'}`} />
                </button>
                <button
                  onClick={() => {
                    setTileStyle('osm');
                    setShowStyleMenu(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase text-left tracking-wider transition-all flex items-center justify-between ${
                    tileStyle === 'osm' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <span>OpenStreetMap Standard</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${tileStyle === 'osm' ? 'bg-emerald-400' : 'bg-transparent'}`} />
                </button>
              </div>
            )}
          </div>
          
          {/* Geolocation indicator panel inside container boundary */}
          {routeInfo && selectedEvent && (
            <div className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:max-w-xs p-5 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-saffron/30 shadow-2xl z-[1000] text-slate-100 flex flex-col gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-saffron tracking-wider mb-1">Route to {selectedEvent.name}</p>
                <div className="flex items-center justify-between text-white font-black text-lg gap-4">
                  <span>🚗 {routeInfo.distance}</span>
                  <span className="text-sm font-bold text-slate-400">🕒 {routeInfo.duration} est.</span>
                </div>
              </div>
              <button 
                onClick={handleLaunchGoogleMaps}
                className="w-full py-2.5 bg-saffron text-white font-bold text-xs uppercase rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center gap-2"
              >
                <Navigation size={14} /> Open in Google Maps
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapView;
