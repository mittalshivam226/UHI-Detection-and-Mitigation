import React from 'react';
import { useUHIContext } from '../context/UHIContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function DynamicLegend() {
  const { layers, tileMeta, pos } = useUHIContext();

  const activeLayerId = Object.keys(layers).find(k => layers[k]);
  if (!activeLayerId || !tileMeta[activeLayerId]) return null;

  const meta = tileMeta[activeLayerId];
  
  const labelMap = {
    heat: 'Surface Temperature',
    veg: 'Vegetation (NDVI)',
    density: 'Urban Density (NDBI)'
  };
  
  const colorMap = {
    heat: '#FF3B3B',
    veg: '#00e676',
    density: '#FFD700'
  };

  return (
    <AnimatePresence>
      {activeLayerId && meta && pos && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="glass-panel-heavy"
          style={{
            position: 'absolute', bottom: 30, right: 30, zIndex: 1000,
            padding: '12px 16px', borderRadius: 12, minWidth: 240,
            pointerEvents: 'none'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-bg)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colorMap[activeLayerId], boxShadow: `0 0 8px ${colorMap[activeLayerId]}` }} />
              {labelMap[activeLayerId]}
            </span>
            <span style={{ fontSize: 9, letterSpacing: '1px', color: 'var(--on-muted)', border: '1px solid var(--outline)', padding: '2px 6px', borderRadius: 4 }}>
              LIVE GEE TILE
            </span>
          </div>
          
          <div style={{ height: 10, borderRadius: 5, background: `linear-gradient(to right,${meta.palette.join(',')})`, marginBottom: 6, opacity: 0.9, border: '1px solid var(--outline-light)' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'var(--font-display)', color: 'var(--on-muted)', fontWeight: 500 }}>
            <span>{meta.min} {meta.unit}</span>
            <span>{meta.max} {meta.unit}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
