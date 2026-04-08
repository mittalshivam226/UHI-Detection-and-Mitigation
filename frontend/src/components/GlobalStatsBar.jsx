import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/* ─ Animated Counter ─────────────────────────────── */
function AnimCounter({ target, duration = 1200 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <>{val.toLocaleString()}</>;
}

/* ─ Mini Sparkline ────────────────────────────────── */
function MiniSparkline({ color }) {
  const data = [3.8, 4.1, 3.9, 4.5, 4.2, 4.8, 4.2];
  const max = Math.max(...data), min = Math.min(...data);
  const w = 44, h = 16;
  const xs = data.map((_, i) => (i / (data.length - 1)) * w);
  const ys = data.map(d => h - ((d - min) / (max - min || 1)) * h * 0.8 - h * 0.1);
  const pts = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={2.5} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

/* ─ Global Stats Bar ──────────────────────────────── */
export default function GlobalStatsBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      style={{
        background: 'linear-gradient(135deg, rgba(0,242,255,0.04) 0%, rgba(0,0,0,0) 100%)',
        border: '1px solid rgba(0,242,255,0.08)',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '2px', color: 'rgba(0,242,255,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>
        Live Telemetry
      </div>

      {/* Row 1: Cities Monitored */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)', display: 'inline-block', animation: 'dotPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1px', color: 'var(--on-muted)', textTransform: 'uppercase' }}>Cities Monitored</span>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
          <AnimCounter target={847} />
        </span>
      </div>

      {/* Row 2: Active Scans */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 6px var(--secondary)', display: 'inline-block', animation: 'dotPulse 2s ease-in-out infinite 0.5s' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1px', color: 'var(--on-muted)', textTransform: 'uppercase' }}>Active Scans</span>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--secondary)' }}>
          <AnimCounter target={12} duration={600} />
        </span>
      </div>

      {/* Row 3: Avg UHI + sparkline */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFD700', boxShadow: '0 0 6px #FFD700', display: 'inline-block', animation: 'dotPulse 2s ease-in-out infinite 1s' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1px', color: 'var(--on-muted)', textTransform: 'uppercase' }}>Avg UHI Intensity</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MiniSparkline color="#FFD700" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#FFD700' }}>+4.2°C</span>
        </div>
      </div>
    </motion.div>
  );
}
