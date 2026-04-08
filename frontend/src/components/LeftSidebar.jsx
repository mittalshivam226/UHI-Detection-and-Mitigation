import React, { useState } from 'react';
import { Layers, Thermometer, TreePine, Building2, Lightbulb, Search, Flame, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUHIContext } from '../context/UHIContext.jsx';
import GlobalStatsBar from './GlobalStatsBar.jsx';
import ThreatGauge from './ThreatGauge.jsx';

const LAYERS_CONFIG = [
  { id: 'heat',    label: 'Surface Temp',   color: '#FF3B3B', gradient: 'linear-gradient(90deg, #ffd700, #ff7722, #FF3B3B)', Icon: Thermometer },
  { id: 'uhi',     label: 'Predicted UHI',  color: '#FF00E5', gradient: 'linear-gradient(90deg, #ff7722, #FF3B3B, #FF00E5)', Icon: Flame },
  { id: 'veg',     label: 'Vegetation',     color: '#00e676', gradient: 'linear-gradient(90deg, #a5d6a7, #69f0ae, #00e676)', Icon: TreePine    },
  { id: 'density', label: 'Urban density',  color: '#FFD700', gradient: 'linear-gradient(90deg, #fff9c4, #ffe082, #FFD700)', Icon: Building2   },
  { id: 'ntl',     label: 'Nighttime Lights', color: '#fde725', gradient: 'linear-gradient(90deg, #440154, #21908c, #fde725)', Icon: Lightbulb   },
];

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <div className="toggle-track"><div className="toggle-thumb" /></div>
    </label>
  );
}

const listVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } },
};

function Sparkline({ color }) {
  // Pseudo-random trend for visual effect
  const rnd = () => Math.random() * 10;
  const p1 = 15 - rnd(); const p2 = 15 - rnd(); 
  const p3 = 15 - rnd(); const p4 = 15 - rnd();
  const points = `0,${p1} 10,${p2} 20,${p3} 30,${p4} 40,8`;
  return (
    <svg width="40" height="20" viewBox="0 0 40 20" style={{ margin: '0 8px', overflow: 'visible', opacity: 0.7 }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx="40" cy="8" r="2" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

export default function LeftSidebar({ layers, onLayerToggle, tileMeta, tileLoading, hotspots, hotspotsLoading, onLocationSelect, onScanRegion }) {
  const { mapTheme, layerOpacity, setLayerOpacity } = useUHIContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  React.useEffect(() => {
    let debounceTimer;
    if (searchQuery.trim().length > 2 && showSuggestions) {
      setIsTyping(true);
      debounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`);
          const data = await resp.json();
          setSuggestions(data || []);
        } catch (e) {
          console.error("Autocomplete failed:", e);
        } finally {
          setIsTyping(false);
        }
      }, 800);
    } else {
      setIsTyping(false);
      if (!showSuggestions) setSuggestions([]);
    }
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, showSuggestions]);

  const avgTemp = hotspots.length
    ? (hotspots.reduce((s, h) => s + h.temp, 0) / hotspots.length).toFixed(1)
    : '--';
  const avgTempColor = avgTemp === '--' ? '#ff7722' : parseFloat(avgTemp) > 40 ? 'var(--secondary)' : parseFloat(avgTemp) > 36 ? '#ff7722' : 'var(--tertiary)';

  const CITIES = [
    { name: 'Scan Area', lat: null, lng: null },
    { name: 'New York', lat: 40.7128, lng: -74.0060 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Tokyo', lat: 35.6762, lng: 139.6503 }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setShowSuggestions(false);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await resp.json();
      if (data && data.length > 0) {
        if (onLocationSelect) onLocationSelect(parseFloat(data[0].lat), parseFloat(data[0].lon));
        setSearchQuery(data[0].display_name);
      } else {
        alert("Location not found.");
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="left-sidebar glass-panel-heavy"
    >
      {/* ─── Live Global Stats ─── */}
      <div className="sidebar-section pb-2 pt-4">
        <GlobalStatsBar />
      </div>

      {/* ─── Global Search ─── */}
      <div className="sidebar-section pb-2 pt-3">
        <div className="relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              placeholder="Search Global Location"
              className="w-full bg-black/40 border border-white/10 rounded-lg text-white text-xs font-mono px-9 py-2.5 outline-none focus:border-neon-cyan/50 focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all"
            />
            <Search size={14} color="var(--primary)" className="absolute left-3 top-3 opacity-70" />
            {(searching || isTyping) && <span className="absolute right-3 top-3.5 text-[9px] text-neon-cyan tracking-widest animate-pulse">SCANNING</span>}
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 border border-neon-cyan/30 rounded-lg overflow-hidden z-50 shadow-[0_4px_20px_rgba(0,242,255,0.15)] backdrop-blur-xl">
              {suggestions.map((sug, idx) => (
                <div 
                  key={idx} 
                  className="px-4 py-3 text-xs text-white/80 font-mono hover:bg-neon-cyan/20 hover:text-white cursor-pointer border-b border-white/5 last:border-0 transition-colors flex items-center gap-2"
                  onClick={() => {
                    setSearchQuery(sug.display_name);
                    setShowSuggestions(false);
                    if (onLocationSelect) onLocationSelect(parseFloat(sug.lat), parseFloat(sug.lon));
                  }}
                >
                  <Search size={10} className="text-neon-cyan opacity-50 flex-shrink-0" />
                  <div className="truncate">{sug.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Layer Controls ─── */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">
          <Layers size={12} color="var(--primary)" />
          Layer Controls
        </div>

        {LAYERS_CONFIG.map(({ id, label, color, gradient, Icon }) => {
          const meta    = tileMeta[id];
          const loading = tileLoading[id];
          const active  = layers[id];
          return (
            <div key={id} className="layer-item">
              <div className="layer-header">
                <div className="layer-label">
                  <div className="layer-dot" style={{ background: color, boxShadow: `0 0 8px ${color}80` }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? 'var(--on-bg)' : 'var(--on-muted)' }}>
                    {label}
                  </span>
                  {loading && (
                    <span style={{ fontSize: 9, color, letterSpacing: '1px' }} className="loading-text">LIVE</span>
                  )}
                </div>
                <Toggle checked={active} onChange={() => onLayerToggle(id)} />
              </div>

              {active && meta ? (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--outline-light)' }}>
                  {/* Apply tile-pane filter only in dark mode so the bar matches the rendered tile */}
                  <div style={{
                    height: 5,
                    borderRadius: 3,
                    background: `linear-gradient(to right,${meta.palette.join(',')})`,
                    marginBottom: 5,
                    filter: mapTheme === 'dark'
                      ? 'brightness(0.65) saturate(0.6) hue-rotate(185deg) contrast(1.15)'
                      : 'none',
                    transition: 'filter 0.6s ease',
                  }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--on-muted)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                    <span>{meta.min}{meta.unit}</span>
                    <span style={{ color, letterSpacing: '1px' }}>SATELLITE</span>
                    <span>{meta.max}{meta.unit}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px' }}>OPACITY</span>
                    <input 
                      type="range" min="0" max="1" step="0.05" 
                      value={layerOpacity[id] ?? 0.85}
                      onChange={(e) => setLayerOpacity(p => ({...p, [id]: parseFloat(e.target.value)}))}
                      style={{ flex: 1, accentColor: color }}
                    />
                    <span style={{ fontSize: 9, color: 'var(--on-muted)', width: 24, textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                      {Math.round((layerOpacity[id] ?? 0.85)*100)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="legend-bar" style={{ background: active ? gradient : 'rgba(255,255,255,0.05)', opacity: active ? 0.9 : 0.4 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Active Hotspots ─── */}
      <div className="sidebar-section" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="sidebar-section-title" style={{ margin: 0 }}>Active Hotspots</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {hotspotsLoading && (
              <span style={{ fontSize: 9, color: 'var(--primary)', letterSpacing: '1px' }} className="loading-text">
                SCANNING
              </span>
            )}
            <button 
              onClick={onScanRegion}
              title="Scan the current map area"
              style={{ fontSize: 9, background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.3)', color: 'var(--primary)', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-display)', letterSpacing: '1px', transition: 'all 0.2s', outline: 'none' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(0,242,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(0,242,255,0.1)'}
            >
              SCAN AREA
            </button>
          </div>
        </div>

        <motion.div variants={listVariants} initial="hidden" animate="show">
          {hotspots.map((h, i) => {
            const tempColor = h.temp > 40 ? 'var(--secondary)' : h.temp > 36 ? '#ff7722' : 'var(--tertiary)';
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                className="hotspot-card glass-panel-heavy"
                style={{ borderLeftColor: tempColor, cursor: 'pointer', '--hover-bg': 'rgba(255,255,255,0.05)' }}
                onClick={() => onLocationSelect && onLocationSelect(h.lat, h.lng || h.lon)}
              >
                <div>
                  <div className="hotspot-name">{h.name}</div>
                  <div className="hotspot-coord">{h.lat.toFixed(3)}° N · {Math.abs(h.lng || h.lon || 0).toFixed(3)}° W</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Sparkline color={tempColor} />
                  <div className="hotspot-temp" style={{ color: tempColor, textShadow: `0 0 12px ${tempColor}60`, width: 45, textAlign: 'right' }}>
                    {h.temp.toFixed(1)}°
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ─── Threat Intelligence ─── */}
      <div className="sidebar-section">
        <div className="sidebar-section-title" style={{ marginBottom: 10 }}>
          Threat Intelligence
        </div>
        <ThreatGauge hotspots={hotspots} avgTemp={avgTemp !== '--' ? avgTemp : null} />

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '1.5px', color: 'var(--on-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Quick Jump</div>
          <select
            style={{
              width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,242,255,0.15)',
              borderRadius: 6, color: 'var(--primary)', padding: '6px 10px', outline: 'none',
              fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
            }}
            onChange={(e) => {
              const c = CITIES[e.target.value];
              if (c && c.lat && onLocationSelect) onLocationSelect(c.lat, c.lng);
            }}
          >
            {CITIES.map((c, i) => (
              <option key={i} value={i} style={{ background: '#0a121c', color: 'var(--on-bg)' }}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </motion.aside>
  );
}
