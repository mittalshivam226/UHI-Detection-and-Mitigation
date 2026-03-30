import React from 'react';
import { Layers, Thermometer, TreePine, Building2, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUHIContext } from '../context/UHIContext.jsx';

const LAYERS_CONFIG = [
  { id: 'heat',    label: 'Surface Temp',   color: '#FF3B3B', gradient: 'linear-gradient(90deg, #ffd700, #ff7722, #FF3B3B)', Icon: Thermometer },
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

export default function LeftSidebar({ layers, onLayerToggle, tileMeta, tileLoading, hotspots, hotspotsLoading, onLocationSelect }) {
  const { mapTheme, layerOpacity, setLayerOpacity } = useUHIContext();
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

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="left-sidebar glass-panel-heavy"
    >
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
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="sidebar-section-title" style={{ margin: 0 }}>Active Hotspots</div>
          {hotspotsLoading && (
            <span style={{ fontSize: 9, color: 'var(--primary)', letterSpacing: '1px' }} className="loading-text">
              SCANNING
            </span>
          )}
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

      {/* ─── City Status ─── */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">City Status</div>
        <div className="stats-grid">
          <div className="stat-mini">
            <div className="stat-mini-label">Coverage</div>
            <div className="stat-mini-value" style={{ color: 'var(--primary)', fontSize: 13, marginTop: -2 }}>
              <select 
                style={{ background: 'transparent', color: 'inherit', border: 'none', outline: 'none', width: '100%', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'inherit', color: 'var(--primary)', textAlign: 'center' }}
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
          <div className="stat-mini">
            <div className="stat-mini-label">Avg LST</div>
            <div className="stat-mini-value" style={{ color: avgTempColor }}>{avgTemp}°</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-label">Hotspots</div>
            <div className="stat-mini-value" style={{ color: 'var(--secondary)' }}>{hotspots.length}</div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
