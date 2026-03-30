import React from 'react';
import { Layers, Thermometer, TreePine, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUHIContext } from '../context/UHIContext.jsx';

const LAYERS_CONFIG = [
  { id: 'heat',    label: 'Surface Temp',   color: '#FF3B3B', gradient: 'linear-gradient(90deg, #ffd700, #ff7722, #FF3B3B)', Icon: Thermometer },
  { id: 'veg',     label: 'Vegetation',     color: '#00e676', gradient: 'linear-gradient(90deg, #a5d6a7, #69f0ae, #00e676)', Icon: TreePine    },
  { id: 'density', label: 'Urban density',  color: '#FFD700', gradient: 'linear-gradient(90deg, #fff9c4, #ffe082, #FFD700)', Icon: Building2   },
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

export default function LeftSidebar({ layers, onLayerToggle, tileMeta, tileLoading, hotspots, hotspotsLoading }) {
  const { mapTheme } = useUHIContext();
  const avgTemp = hotspots.length
    ? (hotspots.reduce((s, h) => s + h.temp, 0) / hotspots.length).toFixed(1)
    : '--';

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--on-muted)', fontFamily: 'var(--font-display)' }}>
                    <span>{meta.min}{meta.unit}</span>
                    <span style={{ color, letterSpacing: '1px' }}>SATELLITE</span>
                    <span>{meta.max}{meta.unit}</span>
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
                className="hotspot-card"
                style={{ borderLeftColor: tempColor }}
              >
                <div>
                  <div className="hotspot-name">{h.name}</div>
                  <div className="hotspot-coord">{h.lat.toFixed(3)}° N · {Math.abs(h.lng || h.lon || 0).toFixed(3)}° W</div>
                </div>
                <div className="hotspot-temp" style={{ color: tempColor, textShadow: `0 0 12px ${tempColor}60` }}>
                  {h.temp.toFixed(1)}°
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
            <div className="stat-mini-value" style={{ color: 'var(--primary)', fontSize: 12 }}>Region</div>
          </div>
          <div className="stat-mini">
            <div className="stat-mini-label">Avg LST</div>
            <div className="stat-mini-value" style={{ color: '#ff7722' }}>{avgTemp}°</div>
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
