import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Live UTC Clock that ticks every second
export function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.7)', letterSpacing: '2px' }}>
      {time.toUTCString().split(' ').slice(4, 5)[0]} UTC
    </span>
  );
}

// Pulsing status indicator dot
export function StatusDot({ color = '#00e676', label, size = 7 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
        <span style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%', background: color, opacity: 0.4,
          animation: 'pulse-ring 2s cubic-bezier(0.1,0.8,0.3,1) infinite',
        }} />
        <span style={{ width: size, height: size, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      </span>
      {label && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.5px', color, textTransform: 'uppercase' }}>{label}</span>}
    </span>
  );
}

// Full Mission Status Bar (shown inside TopNav)
export function MissionStatusBadges() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {/* SYSTEM ONLINE badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.2)',
        borderRadius: 4, padding: '3px 10px',
      }}>
        <StatusDot color="#00e676" size={6} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.5px', color: '#00e676', fontWeight: 700 }}>SYSTEM ONLINE</span>
      </div>
      {/* SATELLITE UPLINK badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,242,255,0.05)', border: '1px solid rgba(0,242,255,0.15)',
        borderRadius: 4, padding: '3px 10px',
      }}>
        <StatusDot color="var(--primary)" size={6} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.5px', color: 'var(--primary)', fontWeight: 700 }}>SATELLITE UPLINK: ACTIVE</span>
      </div>
      <LiveClock />
    </div>
  );
}
