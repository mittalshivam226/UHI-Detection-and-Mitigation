import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Flame, ArrowRight, ShieldAlert, Cpu, Leaf, Globe, Satellite,
  Thermometer, Zap, Activity, Map, FlaskConical,
  TrendingUp, AlertTriangle, CheckCircle, Play,
} from 'lucide-react';

/* ============================================================
   STAR FIELD — pure CSS stars matching old Three.js aesthetic
   ============================================================ */
function StarField() {
  const stars = React.useMemo(() => {
    const s = [];
    for (let i = 0; i < 180; i++)
      s.push({ x: (i * 137.5) % 100, y: (i * 79.3) % 100, r: 1,   o: 0.15 + (i % 5) * 0.06, d: (i % 7) * 0.4 });
    for (let i = 0; i < 80; i++)
      s.push({ x: (i * 211.7) % 100, y: (i * 153.1) % 100, r: 1.5, o: 0.3  + (i % 4) * 0.08, d: (i % 6) * 0.6 });
    for (let i = 0; i < 30; i++)
      s.push({ x: (i * 317.3) % 100, y: (i * 241.9) % 100, r: 2,   o: 0.5  + (i % 3) * 0.12, d: (i % 5) * 0.9 });
    return s;
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.r,
            height: star.r,
            borderRadius: '50%',
            background: '#fff',
            opacity: star.o,
            animation: `twinkle ${2 + (i % 5)}s ease-in-out ${star.d}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ============================================================
   ANIMATED COUNTER
   ============================================================ */
function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const total = 80;
    const id = setInterval(() => {
      frame++;
      setCount(Math.floor((frame / total) * target));
      if (frame >= total) { setCount(target); clearInterval(id); }
    }, 20);
    return () => clearInterval(id);
  }, [inView, target]);

  return (
    <span ref={ref} style={{ fontFamily: "'JetBrains Mono',monospace" }}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

/* ============================================================
   SECTION WRAPPER — scroll-triggered fade-up
   ============================================================ */
function Section({ children, id, style }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      style={style}
    >
      {children}
    </motion.section>
  );
}

/* ============================================================
   THREAT CARD
   ============================================================ */
function ThreatCard({ label, value, unit, barColor, barPct, icon: Icon, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, delay }}
      style={{
        background: 'rgba(11,20,33,0.95)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={16} color={barColor} />
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 36, fontWeight: 700, color: '#e2e2e2', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 16, color: barColor, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', position: 'relative', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${barPct}%` } : {}}
          transition={{ duration: 1.4, delay: delay + 0.3, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, background: barColor, boxShadow: `0 0 8px ${barColor}` }}
        />
      </div>
    </motion.div>
  );
}

/* ============================================================
   CAPABILITY CARD
   ============================================================ */
function CapabilityCard({ icon: Icon, title, desc, color, link, linkLabel, delay }) {
  const [hovered, setHovered] = useState(false);
  const colorMap = {
    cyan:    { border: 'rgba(0,242,255,0.3)',   bg: 'rgba(0,242,255,0.06)',   text: '#00F2FF', glow: 'rgba(0,242,255,0.18)'  },
    magenta: { border: 'rgba(255,0,229,0.3)',   bg: 'rgba(255,0,229,0.06)',   text: '#FF00E5', glow: 'rgba(255,0,229,0.18)'  },
    amber:   { border: 'rgba(255,215,0,0.3)',   bg: 'rgba(255,215,0,0.06)',   text: '#FFD700', glow: 'rgba(255,215,0,0.18)'  },
    green:   { border: 'rgba(0,230,118,0.3)',   bg: 'rgba(0,230,118,0.06)',   text: '#00E676', glow: 'rgba(0,230,118,0.18)'  },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? c.bg : 'rgba(8,13,26,0.9)',
        border: `1px solid ${hovered ? c.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered ? `0 0 28px ${c.glow}` : 'none',
        transition: 'all 0.3s ease',
        padding: '30px 26px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
    >
      <div style={{ color: c.text, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon size={26} />
        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 17, color: '#e2e2e2' }}>{title}</span>
      </div>
      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0, flex: 1 }}>{desc}</p>
      <Link
        to={link}
        style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: c.text,
          letterSpacing: '2px', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
          textDecoration: 'none',
          borderTop: `1px solid ${c.border}`, paddingTop: 14,
          transition: 'gap 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.gap = '12px')}
        onMouseLeave={e => (e.currentTarget.style.gap = '6px')}
      >
        {linkLabel} <ArrowRight size={13} />
      </Link>
    </motion.div>
  );
}

/* ============================================================
   PROTOCOL STEP
   ============================================================ */
function ProtocolStep({ num, title, desc, icon: Icon, color, delay, isLast }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1, position: 'relative' }}
    >
      {!isLast && (
        <div style={{
          position: 'absolute', top: 36, left: '58%', width: '82%', height: 1,
          borderTop: '1px dashed rgba(0,242,255,0.25)',
        }} />
      )}
      <div style={{
        width: 72, height: 72,
        border: `2px solid ${color}`,
        boxShadow: `0 0 18px ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)', position: 'relative', flexShrink: 0,
      }}>
        <Icon size={26} color={color} />
        <div style={{
          position: 'absolute', top: -11, left: -5,
          fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color,
          background: '#080d1a', padding: '2px 5px', letterSpacing: 1,
        }}>{num}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, color: '#e2e2e2', marginBottom: 8 }}>{title}</div>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.6, maxWidth: 200 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

/* ============================================================
   MAIN LANDING PAGE
   ============================================================ */
export default function LandingPage() {
  const [scanY, setScanY] = useState(0);

  useEffect(() => {
    let y = 0;
    const id = setInterval(() => {
      y = (y + 0.4) % 100;
      setScanY(y);
    }, 30);
    return () => clearInterval(id);
  }, []);

  /* ─── HERO ─────────────────────────────────────────────── */
  return (
    <div
      id="landing-scroller"
      className="w-full h-full pointer-events-auto overflow-y-auto"
      style={{ background: '#080d1a', color: '#e2e2e2' }}
    >

      {/* ── SECTION 1: HERO ── */}
      <div style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: '90px 24px 70px',
        background: 'linear-gradient(180deg, #040812 0%, #080d1a 50%, #0b1421 100%)',
      }}>
        {/* Stars */}
        <StarField />

        {/* Radial glows */}
        <div style={{ position: 'absolute', top: '20%', left: '18%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(0,242,255,0.045) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '18%', right: '12%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,0,229,0.035) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Scan line */}
        <div style={{
          position: 'absolute', top: `${scanY}%`, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.12), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,242,255,0.07)', border: '1px solid rgba(0,242,255,0.18)',
            padding: '6px 18px', marginBottom: 36,
            fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
            color: '#00F2FF', letterSpacing: '2px', textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F2FF', animation: 'dotPulse 2s infinite' }} />
          SYSTEM ONLINE · MISSION READY
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 900, fontSize: 'clamp(38px, 7vw, 96px)',
            lineHeight: 1.0, letterSpacing: '-2px', textAlign: 'center',
            background: 'linear-gradient(135deg, #00F2FF 0%, #a0f8ff 40%, #FF00E5 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: 24, margin: '0 0 24px',
          }}
        >
          URBAN HEAT<br />INTELLIGENCE
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
            color: 'rgba(255,255,255,0.4)', letterSpacing: '3px',
            textTransform: 'uppercase', textAlign: 'center', marginBottom: 60,
          }}
        >
          ML-Driven Climate Action Protocol · XGBoost · Landsat 8/9 · Real-Time GEE
        </motion.p>

        {/* Stat counters */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 68 }}
        >
          {[
            { label: 'Cities Monitored', target: 847, suffix: '',     color: '#00F2FF' },
            { label: 'Model Accuracy',   target: 93,  suffix: '.5%',  color: '#00E676' },
            { label: 'Max UHI Delta',    target: 15,  suffix: '°C', prefix: '+', color: '#FF00E5' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '22px 44px', textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 46, fontWeight: 700, color: s.color, lineHeight: 1, marginBottom: 8 }}>
                <AnimatedCounter target={s.target} suffix={s.suffix} prefix={s.prefix || ''} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.38)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 80 }}
        >
          <Link
            to="/dashboard"
            style={{
              padding: '15px 38px', background: '#00F2FF', color: '#000',
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
              fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
              boxShadow: '0 0 28px rgba(0,242,255,0.35)',
              transition: 'all 0.25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 50px rgba(0,242,255,0.55)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(0,242,255,0.35)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            LAUNCH TACTICAL MAP <ArrowRight size={16} />
          </Link>
          <Link
            to="/engine"
            style={{
              padding: '15px 38px', background: 'transparent', color: '#FF00E5',
              border: '1px solid rgba(255,0,229,0.35)',
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
              fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
              transition: 'all 0.25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,229,0.08)'; e.currentTarget.style.borderColor = '#FF00E5'; e.currentTarget.style.boxShadow = '0 0 18px rgba(255,0,229,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,0,229,0.35)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            VIEW DIAGNOSTICS <Activity size={16} />
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(0,242,255,0.4)', letterSpacing: '3px', textTransform: 'uppercase' }}>▼ SCROLL TO INITIALIZE</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(0,242,255,0.45), transparent)' }} />
        </motion.div>
      </div>

      {/* ── SECTION 2: THREAT ASSESSMENT ── */}
      <Section
        id="threat"
        style={{ padding: '100px 5vw', background: '#080d1a', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,0,0,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <ShieldAlert size={18} color="#FF00E5" />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#FF00E5', letterSpacing: '3px', textTransform: 'uppercase' }}>THREAT ASSESSMENT</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 4vw, 52px)', color: '#e2e2e2', marginBottom: 12, letterSpacing: '-1px' }}>
            The Invisible Threat
          </h2>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.48)', maxWidth: 580, lineHeight: 1.7, marginBottom: 52 }}>
            Urban Heat Islands are expanding rapidly. Concrete and asphalt absorb solar radiation, creating thermal anomalies that amplify heatwaves and burden public health.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 2 }}>
            <ThreatCard label="Surface Temp Anomaly" value="+12.4" unit="°C"      barColor="#FF3B3B" barPct={84} icon={Thermometer}   delay={0}    />
            <ThreatCard label="Cities at High Risk"   value="312"   unit=" cities" barColor="#FF00E5" barPct={67} icon={AlertTriangle} delay={0.15} />
            <ThreatCard label="Annual Heat Deaths"    value="72,000" unit="/yr"    barColor="#FFD700" barPct={90} icon={TrendingUp}    delay={0.3}  />
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            viewport={{ once: true }}
            style={{
              marginTop: 2, padding: '14px 22px',
              background: 'rgba(255,59,59,0.04)', border: '1px solid rgba(255,59,59,0.18)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B3B', flexShrink: 0, animation: 'dotPulse 1.5s infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'rgba(255,100,100,0.75)', letterSpacing: '1.5px' }}>
              CRITICAL ALERT · Without intervention, surface temperatures projected to rise 3°C by 2050 in urban cores
            </span>
          </motion.div>
        </div>
      </Section>

      {/* ── SECTION 3: CAPABILITIES ── */}
      <Section id="capabilities" style={{ padding: '100px 5vw', background: '#0b1421' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Zap size={18} color="#00F2FF" />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#00F2FF', letterSpacing: '3px', textTransform: 'uppercase' }}>MISSION CAPABILITIES</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 4vw, 52px)', color: '#e2e2e2', marginBottom: 12, letterSpacing: '-1px' }}>
            High-Fidelity Diagnostics
          </h2>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.48)', maxWidth: 580, lineHeight: 1.7, marginBottom: 52 }}>
            Our XGBoost pipeline fuses real-time Landsat telemetry with spatial cross-validation to pinpoint thermal anomalies and simulate structural mitigation pathways.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2, marginBottom: 2 }}>
            <CapabilityCard icon={Cpu}       title="ML Diagnostics"     color="cyan"    link="/engine"    linkLabel="VIEW ENGINE"        delay={0}    desc="XGBoost trained on NDVI, NDBI, night lights, and elevation. 93.5% accuracy with spatial cross-validation across global climate zones." />
            <CapabilityCard icon={Map}       title="Thermal Mapping"    color="amber"   link="/dashboard" linkLabel="OPEN TACTICAL MAP"  delay={0.1}  desc="Real-time Landsat Land Surface Temperature overlaid on a global interactive map. Click any city to extract thermal records instantly." />
            <CapabilityCard icon={Leaf}      title="Cooling Simulation" color="green"   link="/dashboard" linkLabel="LAUNCH SIMULATOR"   delay={0.2}  desc="Model the temperature impact of cool rooftops, tree coverage, and green corridors before implementing them in the field." />
            <CapabilityCard icon={Satellite} title="Satellite Intel"    color="magenta" link="/dashboard" linkLabel="ACTIVATE LAYERS"    delay={0.3}  desc="Multi-band GEE tiles — LST, NDVI, NDBI, Night Lights — rendered in real-time via Google Earth Engine tile endpoints." />
          </div>
          {/* Accuracy strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2 }}>
            {[
              { label: 'Model Accuracy', val: '93.5%',     color: '#00F2FF' },
              { label: 'Algorithm',      val: 'XGBoost',   color: '#FF00E5' },
              { label: 'Data Source',    val: 'Landsat 8/9',color: '#FFD700' },
              { label: 'Analysis Time',  val: '< 3 sec',   color: '#00E676' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.08 }}
                viewport={{ once: true }}
                style={{ padding: '18px 22px', background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${s.color}`, textAlign: 'center' }}
              >
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 20, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.val}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── SECTION 4: MISSION PROTOCOL ── */}
      <Section id="protocol" style={{ padding: '100px 5vw', background: '#080d1a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <Play size={18} color="#00F2FF" />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#00F2FF', letterSpacing: '3px', textTransform: 'uppercase' }}>MISSION PROTOCOL</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 'clamp(30px, 4vw, 52px)', color: '#e2e2e2', marginBottom: 12, letterSpacing: '-1px' }}>
            Three Steps to Intelligence
          </h2>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.48)', maxWidth: 480, lineHeight: 1.7, marginBottom: 68 }}>
            From global search to actionable climate intelligence in under 10 seconds.
          </p>
          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
            <ProtocolStep num="01" icon={Globe}         color="#00F2FF" delay={0}   title="Select Location"        desc="Search any city globally or click directly on the interactive satellite map"                                      isLast={false} />
            <ProtocolStep num="02" icon={Cpu}           color="#FF00E5" delay={0.2} title="Run ML Analysis"        desc="XGBoost model extracts UHI probability, severity score, and feature importance in real-time"                     isLast={false} />
            <ProtocolStep num="03" icon={FlaskConical}  color="#00E676" delay={0.4} title="Simulate Interventions" desc="Model cooling impact of rooftops, trees, and green corridors. Export recommendations."                          isLast={true}  />
          </div>
          {/* Timeline bar */}
          <div style={{ marginTop: 60, height: 2, background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              transition={{ duration: 2, delay: 0.4 }}
              viewport={{ once: true }}
              style={{ position: 'absolute', height: '100%', background: 'linear-gradient(90deg, #00F2FF, #FF00E5, #00E676)', boxShadow: '0 0 6px rgba(0,242,255,0.4)' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {['T+0s — Select', 'T+3s — Analyze', 'T+8s — Simulate'].map((t, i) => (
              <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: '1px' }}>{t}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ── SECTION 5: INITIATE MISSION (CTA) ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px', textAlign: 'center',
        background: 'linear-gradient(180deg, #0b1421 0%, #040812 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <StarField />
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(0,242,255,0.045) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 780 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.15)',
            padding: '6px 18px', marginBottom: 44,
            fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
            color: '#00F2FF', letterSpacing: '3px', textTransform: 'uppercase',
          }}>
            <CheckCircle size={12} /> MISSION READY
          </div>

          <h2 style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 900, fontSize: 'clamp(48px, 8vw, 108px)',
            lineHeight: 0.95, letterSpacing: '-3px', marginBottom: 32,
          }}>
            <span style={{ background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.55) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>INITIATE</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg, #00F2FF, #FF00E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MISSION</span>
          </h2>

          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 17, color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, marginBottom: 56, maxWidth: 520, margin: '0 auto 56px' }}>
            Deploy the Tactical Map to identify structural countermeasures, simulate cool rooftops and tree coverage, and optimize localized temperature reductions.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
            <Link
              to="/dashboard"
              style={{
                padding: '17px 46px', background: '#00F2FF', color: '#000',
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800,
                fontSize: 15, letterSpacing: '2px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                boxShadow: '0 0 36px rgba(0,242,255,0.32), 0 0 72px rgba(0,242,255,0.1)',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 56px rgba(0,242,255,0.55), 0 0 100px rgba(0,242,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 36px rgba(0,242,255,0.32), 0 0 72px rgba(0,242,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              LAUNCH TACTICAL MAP <ArrowRight size={18} />
            </Link>
            <Link
              to="/engine"
              style={{
                padding: '17px 46px', background: 'transparent', color: '#e2e2e2',
                border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
                fontSize: 15, letterSpacing: '2px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
                transition: 'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.38)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}
            >
              VIEW DIAGNOSTICS
            </Link>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['ML Powered', 'Satellite Data', 'Real-Time GEE', 'XGBoost Engine', 'Open Science'].map((b, i) => (
              <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.22)', letterSpacing: '2px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckCircle size={10} color="rgba(0,242,255,0.35)" /> {b}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '28px 5vw', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        background: '#040812',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flame size={18} color="#00F2FF" />
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: '#00F2FF' }}>UHI</span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 300, fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>INTELLIGENCE</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {[{ label: 'MISSION', to: '/' }, { label: 'TACTICAL MAP', to: '/dashboard' }, { label: 'INTEL', to: '/reports' }, { label: 'DIAGNOSTICS', to: '/engine' }].map(l => (
            <Link key={l.to} to={l.to} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '2px', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#00F2FF')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >{l.label}</Link>
          ))}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '1px' }}>
          © 2026 UHI Intelligence · ML-Driven Climate Action
        </span>
      </footer>
    </div>
  );
}
