import React, { useState, useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './index.css';
import { useUHIContext } from './context/UHIContext.jsx';
import TopNav from './components/TopNav.jsx';
import LeftSidebar from './components/LeftSidebar.jsx';
import RightSidebar from './components/RightSidebar.jsx';
import MapView from './components/MapView.jsx';
import DynamicLegend from './components/DynamicLegend.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import { AnimatePresence } from 'framer-motion';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API = 'http://localhost:8002';
const ML_API = `${API}/ml`;
const LEGACY_API = `${API}/api`;

// Default hotspots shown before the first API call
const DEFAULT_HOTSPOTS = [
  { lat: 40.758, lng: -73.985, temp: 41.2, name: 'Midtown West' },
  { lat: 40.730, lng: -73.990, temp: 38.8, name: 'Chelsea' },
  { lat: 40.712, lng: -74.005, temp: 37.1, name: 'Downtown' },
  { lat: 40.778, lng: -73.967, temp: 39.4, name: 'Upper West Side' },
  { lat: 40.749, lng: -73.975, temp: 40.0, name: 'Koreatown' },
];

const LAYERS_CONFIG = [
  {
    id: 'heat', label: 'Heat Map', color: '#ff4000',
    // thermal: blue → cyan → green → yellow → orange → red
    gradient: 'linear-gradient(to right,#040080,#0000cd,#0080ff,#00d0ff,#00ffb0,#80ff00,#ffff00,#ffa000,#ff4000,#cc0000)',
  },
  {
    id: 'veg', label: 'Vegetation', color: '#3a9820',
    // NDVI: brown (bare) → yellow-green (sparse) → dark green (dense vegetation)
    gradient: 'linear-gradient(to right,#8b4513,#c8a060,#e8d080,#f5f5a0,#b8e060,#78c830,#3a9820,#1a6810,#004000)',
  },
  {
    id: 'density', label: 'Urban Density', color: '#cc8000',
    // NDBI: dark blue (water/veg) → tan (bare) → orange/amber (dense urban)
    gradient: 'linear-gradient(to right,#001060,#0040a0,#2080d0,#80c0e0,#e0e0a0,#d0b050,#cc8000,#c04000,#a00000,#ffff80)',
  },
];

// ─── Reusables ───────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-fill" style={{width:`${pct}%`,background:color,boxShadow:`0 0 6px ${color}`}}/>
    </div>
  );
}

// ─── Nominatim search hook ────────────────────────────────────────────────────
function useGeocoder(onResult) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setResults(await r.json());
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }, []);

  const pick = useCallback((item) => {
    setQuery(item.display_name.split(',')[0]);
    setResults([]);
    onResult(parseFloat(item.lat), parseFloat(item.lon), item.display_name.split(',')[0]);
  }, [onResult]);

  const clear = useCallback(() => { setQuery(''); setResults([]); }, []);

  return { query, results, searching, search, pick, clear };
}


const LAYER_GEE_ID = { heat: 'lst', veg: 'ndvi', density: 'ndbi', ntl: 'ntl' };



// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const {
    analysis, setAnalysis,
    mlData, setMlData,
    loading, setLoading,
    mlLoading, setMlLoading,
    pos, setPos,
    layers, setLayers,
    tileLayers, setTileLayers,
    tileMeta, setTileMeta,
    tileLoading, setTileLoading,
    flyTo, setFlyTo,
    hotspots, setHotspots,
    hotspotsLoading, setHotspotsLoading
  } = useUHIContext();
  const [mapCenter, setMapCenter] = useState({ lat: 40.74, lng: -73.99 });
  const [appMounted, setAppMounted] = useState(false);

  // Layer toggle: if turning on, fetch GEE tile URL; if turning off, clear it
  const handleLayerToggle = useCallback(async (id) => {
    const willBeOn = !layers[id];
    setLayers(p => {
        // Only one base tile layer at a time looks best with floating legend,
        // but let's just toggle normally, the context supports multiple toggle states natively.
        return {...p, [id]: willBeOn};
    });

    if (!willBeOn) {
      // Remove tile layer
      setTileLayers(p => { const n={...p}; delete n[id]; return n; });
      setTileMeta(p  => { const n={...p}; delete n[id]; return n; });
      return;
    }

    // Fetch GEE tile URL for this layer
    const geeLayer = LAYER_GEE_ID[id];
    const centre   = pos ?? { lat: 40.74, lng: -73.99 };  // default to NYC
    setTileLoading(p => ({...p, [id]: true}));
    try {
      const r = await fetch(
        `${LEGACY_API}/layer-tiles?layer=${geeLayer}&lat=${centre.lat}&lon=${centre.lng}&radius_km=150`
      );
      if (r.ok) {
        const d = await r.json();
        setTileLayers(p => ({...p, [id]: d.tile_url}));
        setTileMeta(p  => ({...p, [id]: {min:d.min,max:d.max,unit:d.unit,palette:d.palette}}));
      }
    } catch (e) {
      console.warn('layer-tiles fetch failed:', e);
    } finally {
      setTileLoading(p => ({...p, [id]: false}));
    }
  }, [layers, pos]);

  // Fetch real GEE hotspots centred on the given coordinate
  const fetchHotspots = useCallback(async (lat, lng) => {
    setHotspotsLoading(true);
    try {
      const r = await fetch(`${API}/api/hotspots?lat=${lat}&lon=${lng}&radius_km=12&top_n=8`);
      if (r.ok) setHotspots(await r.json());
    } catch { /* keep previous hotspots on error */ }
    finally { setHotspotsLoading(false); }
  }, []);

  const handleMapClick = useCallback(async (lat, lng) => {
    setPos({lat, lng});
    setLoading(true);
    setAnalysis(null);
    setMlData(null);
    setMlLoading(true);   // ← ML panel shows skeleton until resolved
    // kick off hotspots + ML analysis in parallel
    fetchHotspots(lat, lng);

    // 1. Call ML endpoint (primary) — GEE parallel fetch, resolves in ~8-12s
    fetch(`${ML_API}/analyze-location`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({lat, lon:lng, radius_m:1000}),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMlData(d); })
      .catch(() => {})
      .finally(() => setMlLoading(false));  // ← always clear skeleton

    // 2. Call legacy endpoint (for causes + recommendations)
    try {
      const r = await fetch(`${LEGACY_API}/analyze-location`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({lat, lon:lng, radius_m:1000}),
      });
      if (!r.ok) throw new Error(`API ${r.status}`);
      setAnalysis(await r.json());
    } catch {
      const lst = 34 + Math.random() * 8;
      setAnalysis({
        coordinates:{lat,lon:lng},
        environmental_data:{lst_celsius:lst,ndvi:0.12+Math.random()*0.15,ndbi:0.18+Math.random()*0.18},
        analysis:{
          heat_classification: lst>38?'High':lst>32?'Medium':'Low',
          vegetation_level:'Low', urban_density:'High', uhi_detected:true,
          causes:[
            {id:'low_vegetation',label:'Low Vegetation Coverage',icon:'🌿',description:'Sparse vegetation detected. Urban areas with little canopy absorb more solar radiation.'},
            {id:'high_buildup',label:'High Built-Up Density',icon:'🏙️',description:'Dense concrete and asphalt create a thermal mass that retains heat.'},
            {id:'heat_retention',label:'Heat Retention Surfaces',icon:'🌡️',description:'Dark materials strongly absorb solar radiation and re-emit it as infrared.'},
          ],
          recommendations:[
            {action:'Increase Urban Tree Cover',explanation:'Planting trees reduces surface temperatures by 2–4°C through shade and evapotranspiration.',impact_celsius:3.0,type:'vegetation'},
            {action:'Install Cool / Reflective Roofing',explanation:'High-albedo coatings reflect up to 80% of incoming solar radiation.',impact_celsius:4.0,type:'infrastructure'},
            {action:'Introduce Water Features',explanation:'Fountains and ponds cool the local environment via evaporative effect.',impact_celsius:2.0,type:'water'},
          ],
          estimated_reduction_celsius:9.0,
        },
      });
    } finally { setLoading(false); }
  }, [fetchHotspots]);

  const geocoder = useGeocoder((lat, lng, name) => {
    setFlyTo({lat, lng});
    handleMapClick(lat, lng);
  });

  return (
    <>
      <AnimatePresence>
        {!appMounted && <LoadingScreen onComplete={() => setAppMounted(true)} />}
      </AnimatePresence>

      <div className="app-layout">
        {/* ── Top Bar ── */}
      <TopNav geocoder={geocoder} />

      <LeftSidebar
        layers={layers}
        onLayerToggle={handleLayerToggle}
        tileMeta={tileMeta}
        tileLoading={tileLoading}
        hotspots={hotspots}
        hotspotsLoading={hotspotsLoading}
        onLocationSelect={(lat, lng) => {
          setFlyTo({lat, lng});
          handleMapClick(lat, lng);
        }}
        onScanRegion={() => handleMapClick(mapCenter.lat, mapCenter.lng)}
      />

      <div className="map-area">
        <MapView 
          onMapClick={handleMapClick} 
          onMapMoveEnd={(lat, lng) => setMapCenter({lat, lng})}
        />
        <DynamicLegend />
      </div>

      <RightSidebar />
      </div>
    </>
  );
}
