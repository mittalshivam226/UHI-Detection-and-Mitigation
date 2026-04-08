import React from 'react';
import { motion } from 'framer-motion';

/* ─ SVG Circular Threat Gauge ────────────────────────────── */
export default function ThreatGauge({ hotspots = [], avgTemp = null }) {
  // Compute threat index: based on count + avg temp
  const count = hotspots.length;
  const temp = avgTemp !== null ? parseFloat(avgTemp) : 0;
  let index = 0;
  if (count > 0 && temp > 0) {
    index = Math.min(100, Math.round(((count / 10) * 30) + ((Math.max(0, temp - 30) / 20) * 70)));
  }

  const color = index > 70 ? '#FF3B3B' : index > 40 ? '#ff7722' : '#00e676';
  const label = index > 70 ? 'CRITICAL' : index > 40 ? 'MODERATE' : count === 0 ? 'STANDBY' : 'NOMINAL';

  // SVG arc math
  const radius = 38;
  const cx = 52, cy = 52;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (index / 100) * circumference * 0.75; // 270° sweep
  const dashOffset = circumference * 0.75 - arcLength;
  const startAngle = 135; // degrees
  const startRad = (startAngle * Math.PI) / 180;

  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      border: `1px solid ${color}22`,
      borderRadius: 10,
      padding: '12px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {/* Circular gauge SVG */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width={104} height={104} viewBox="0 0 104 104">
          {/* Background track */}
          <circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={6}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
          />
          {/* Colored arc */}
          <motion.circle
            cx={cx} cy={cy} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            initial={{ strokeDashoffset: circumference * 0.75 }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          {/* Center number */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="'Space Grotesk', sans-serif">
            {index}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" letterSpacing="1.5" fontFamily="'Space Grotesk', sans-serif">
            THREAT INDEX
          </text>
        </svg>
      </div>

      {/* Info column */}
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '2px', color: 'var(--on-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
          Threat Level
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
          color, textShadow: `0 0 10px ${color}80`,
          marginBottom: 8, letterSpacing: '0.5px',
        }}>
          {label}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--on-muted)' }}>
            <span>Hotspots</span>
            <span style={{ color: count > 0 ? '#ff7722' : 'var(--on-muted)' }}>{count}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--on-muted)' }}>
            <span>Avg LST</span>
            <span style={{ color: temp > 40 ? 'var(--secondary)' : temp > 36 ? '#ff7722' : 'var(--on-muted)' }}>
              {avgTemp !== null ? `${avgTemp}°C` : '--'}
            </span>
          </div>
        </div>
        {/* Mini scale bar */}
        <div style={{ marginTop: 8, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            style={{ height: '100%', background: `linear-gradient(to right, #00e676, ${color})`, borderRadius: 2 }}
            initial={{ width: 0 }}
            animate={{ width: `${index}%` }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </div>
  );
}
