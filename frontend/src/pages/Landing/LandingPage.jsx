import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Flame, ArrowRight, ShieldAlert, Cpu, Leaf, Globe, Satellite,
  Thermometer, Zap, ChevronDown, Activity, Map, FlaskConical,
  TrendingUp, AlertTriangle, CheckCircle, Play,
} from 'lucide-react';

// ─── Dot Grid Background ────────────────────────────────────────────────────
function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(0,242,255,0.12) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }}
    />
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const steps = 60;
    const increment = target / steps;
    const interval = duration / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, interval);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return (
    <span ref={ref} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Section wrapper with scroll-triggered entrance ──────────────────────────
function Section({ children, className = '', id }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Capability Card ─────────────────────────────────────────────────────────
function CapabilityCard({ icon: Icon, title, desc, color, link, linkLabel, delay }) {
  const [hovered, setHovered] = useState(false);
  const colorMap = {
    cyan:    { border: 'rgba(0,242,255,0.3)',   bg: 'rgba(0,242,255,0.05)',   text: '#00F2FF',   glow: 'rgba(0,242,255,0.2)'   },
    magenta: { border: 'rgba(255,0,229,0.3)',   bg: 'rgba(255,0,229,0.05)',   text: '#FF00E5',   glow: 'rgba(255,0,229,0.2)'   },
    amber:   { border: 'rgba(255,215,0,0.3)',   bg: 'rgba(255,215,0,0.05)',   text: '#FFD700',   glow: 'rgba(255,215,0,0.2)'   },
    green:   { border: 'rgba(0,230,118,0.3)',   bg: 'rgba(0,230,118,0.05)',   text: '#00E676',   glow: 'rgba(0,230,118,0.2)'   },
  };
  const c = colorMap[color] || colorMap.cyan;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? c.bg : 'rgba(19,19,19,0.9)',
        border: `1px solid ${hovered ? c.border : 'rgba(255,255,255,0.06)'}`,
        boxShadow: hovered ? `0 0 30px ${c.glow}` : 'none',
        transition: 'all 0.3s ease',
        padding: '32px 28px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div style={{ color: c.text, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Icon size={28} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: '#e2e2e2' }}>{title}</span>
      </div>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: 0, flex: 1 }}>{desc}</p>
      <Link
        to={link}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: c.text,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 6,
          textDecoration: 'none',
          borderTop: `1px solid ${c.border}`,
          paddingTop: 14,
          transition: 'gap 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.gap = '12px'}
        onMouseLeave={e => e.currentTarget.style.gap = '6px'}
      >
        {linkLabel} <ArrowRight size={13} />
      </Link>
    </motion.div>
  );
}

// ─── Threat Card ─────────────────────────────────────────────────────────────
function ThreatCard({ label, value, unit, barColor, barPct, icon: Icon, delay }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      style={{
        background: 'rgba(19,19,19,0.92)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon size={16} color={barColor} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 38, fontWeight: 700, color: '#e2e2e2', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 18, color: barColor, marginLeft: 4 }}>{unit}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${barPct}%` } : {}}
          transition={{ duration: 1.5, delay: delay + 0.3, ease: 'easeOut' }}
          style={{ position: 'absolute', inset: 0, background: barColor, boxShadow: `0 0 10px ${barColor}` }}
        />
      </div>
    </motion.div>
  );
}

// ─── Protocol Step ────────────────────────────────────────────────────────────
function ProtocolStep({ num, title, desc, icon: Icon, color, delay, isLast }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1, position: 'relative' }}
    >
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', top: 36, left: '60%', width: '80%', height: 1,
          background: 'linear-gradient(90deg, rgba(0,242,255,0.4), rgba(255,0,229,0.2))',
          borderTop: '1px dashed rgba(0,242,255,0.3)',
        }} />
      )}
      {/* Number circle */}
      <div style={{
        width: 72, height: 72, border: `2px solid ${color}`,
        boxShadow: `0 0 20px ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', background: 'rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}>
        <Icon size={28} color={color} />
        <div style={{
          position: 'absolute', top: -12, left: -6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color, letterSpacing: 1,
          background: '#000', padding: '2px 6px',
        }}>{num}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#e2e2e2', marginBottom: 8 }}>{title}</div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6, maxWidth: 200 }}>{desc}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [scanLine, setScanLine] = useState(0);

  // Parallax on scroll
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scanning line animation
  useEffect(() => {
    const id = setInterval(() => setScanLine(p => (p + 1) % 100), 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      id="landing-scroller"
      className="w-full h-full pointer-events-auto overflow-y-auto"
      style={{ background: '#000', color: '#e2e2e2' }}
    >

      {/* ══════════════ SECTION 1: HERO ══════════════ */}
      <div
        style={{
          position: 'relative', minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', padding: '80px 24px 60px',
        }}
      >
        {/* Dot grid */}
        <DotGrid />

        {/* Radial glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,242,255,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,0,229,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Scan line */}
        <div style={{
          position: 'absolute', top: `${scanLine}%`, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.15), transparent)',
          pointerEvents: 'none', transition: 'top 0.03s linear',
        }} />

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)',
            padding: '6px 16px', marginBottom: 32,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: '#00F2FF', letterSpacing: '2px', textTransform: 'uppercase',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00F2FF', animation: 'pulse 2s infinite' }} />
          SYSTEM ONLINE · MISSION READY
        </motion.div>

        {/* Hero title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900, fontSize: 'clamp(40px, 7vw, 96px)',
            lineHeight: 1.0, letterSpacing: '-2px', textAlign: 'center',
            background: 'linear-gradient(135deg, #00F2FF 0%, #a0f8ff 40%, #FF00E5 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: 24,
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
            fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            color: 'rgba(255,255,255,0.45)', letterSpacing: '3px',
            textTransform: 'uppercase', textAlign: 'center', marginBottom: 60,
          }}
        >
          ML-Driven Climate Action Protocol · XGBoost · Landsat 8/9 · Real-Time GEE
        </motion.p>

        {/* Live stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 72 }}
        >
          {[
            { label: 'Cities Monitored', value: 847, suffix: '', color: '#00F2FF' },
            { label: 'Model Accuracy', value: 93, suffix: '.5%', color: '#00E676' },
            { label: 'Max UHI Delta', value: 15, suffix: '°C', prefix: '+', color: '#FF00E5' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                padding: '24px 48px', textAlign: 'center',
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 48, fontWeight: 700, color: stat.color, lineHeight: 1, marginBottom: 8 }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 80 }}
        >
          <Link
            to="/dashboard"
            style={{
              padding: '16px 40px',
              background: '#00F2FF', color: '#000',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
              fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 10,
              textDecoration: 'none',
              transition: 'all 0.3s',
              boxShadow: '0 0 30px rgba(0,242,255,0.4)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#000'; e.currentTarget.style.color = '#00F2FF'; e.currentTarget.style.border = '1px solid #00F2FF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00F2FF'; e.currentTarget.style.color = '#000'; e.currentTarget.style.border = '1px solid transparent'; }}
          >
            LAUNCH TACTICAL MAP <ArrowRight size={16} />
          </Link>
          <Link
            to="/engine"
            style={{
              padding: '16px 40px',
              background: 'transparent', color: '#FF00E5',
              border: '1px solid rgba(255,0,229,0.4)',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
              fontSize: 14, letterSpacing: '2px', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 10,
              textDecoration: 'none',
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,0,229,0.1)'; e.currentTarget.style.borderColor = '#FF00E5'; e.currentTarget.style.boxShadow = '0 0 20px rgba(255,0,229,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,0,229,0.4)'; e.currentTarget.style.boxShadow = 'none'; }}
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
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(0,242,255,0.45)', letterSpacing: '3px', textTransform: 'uppercase' }}>▼ SCROLL TO INITIALIZE</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(0,242,255,0.5), transparent)' }} />
        </motion.div>
      </div>

      {/* ══════════════ SECTION 2: THREAT ASSESSMENT ══════════════ */}
      <Section id="threat" style={{ padding: '100px 5vw', background: 'rgba(0,0,0,0.97)', position: 'relative', overflow: 'hidden' }}>
        {/* Thermal gradient bg */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,0,0,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <ShieldAlert size={20} color="#FF00E5" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#FF00E5', letterSpacing: '3px', textTransform: 'uppercase' }}>THREAT ASSESSMENT</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 4vw, 56px)', color: '#e2e2e2', marginBottom: 12, letterSpacing: '-1px' }}>
            The Invisible Threat
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 600, lineHeight: 1.7, marginBottom: 56 }}>
            Urban Heat Islands are expanding rapidly. Concrete and asphalt absorb solar radiation, creating thermal anomalies that amplify heatwaves and burden public health.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
            <ThreatCard label="Surface Temp Anomaly" value="+12.4" unit="°C" barColor="#FF3B3B" barPct={84} icon={Thermometer} delay={0} />
            <ThreatCard label="Cities at High Risk" value="312" unit="cities" barColor="#FF00E5" barPct={67} icon={AlertTriangle} delay={0.15} />
            <ThreatCard label="Annual Heat Deaths" value="+72,000" unit="/yr" barColor="#FFD700" barPct={90} icon={TrendingUp} delay={0.3} />
          </div>

          {/* Alert banner */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            viewport={{ once: true }}
            style={{
              marginTop: 2, padding: '16px 24px',
              background: 'rgba(255,59,59,0.05)', border: '1px solid rgba(255,59,59,0.2)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF3B3B', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'rgba(255,100,100,0.8)', letterSpacing: '2px' }}>
              CRITICAL ALERT · Without intervention, surface temperatures are projected to rise 3°C by 2050 in urban cores
            </span>
          </motion.div>
        </div>
      </Section>

      {/* ══════════════ SECTION 3: CAPABILITIES ══════════════ */}
      <Section id="capabilities" style={{ padding: '100px 5vw', background: '#000' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Zap size={20} color="#00F2FF" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00F2FF', letterSpacing: '3px', textTransform: 'uppercase' }}>MISSION CAPABILITIES</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 4vw, 56px)', color: '#e2e2e2', marginBottom: 12, letterSpacing: '-1px' }}>
            High-Fidelity Diagnostics
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 600, lineHeight: 1.7, marginBottom: 56 }}>
            Our XGBoost pipeline fuses real-time Landsat telemetry with spatial cross-validation to map thermal anomalies and simulate structural mitigation pathways.
          </p>

          {/* Capability grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
            <CapabilityCard icon={Cpu} title="ML Diagnostics" color="cyan" link="/engine"
              desc="XGBoost model trained on NDVI, NDBI, night lights, and elevation. 93.5% accuracy with spatial cross-validation across global climate zones."
              linkLabel="VIEW ENGINE" delay={0} />
            <CapabilityCard icon={Map} title="Thermal Mapping" color="amber" link="/dashboard"
              desc="Real-time Landsat Land Surface Temperature overlaid on a global interactive map. Click any city to extract thermal records instantly."
              linkLabel="OPEN TACTICAL MAP" delay={0.1} />
            <CapabilityCard icon={Leaf} title="Cooling Simulation" color="green" link="/dashboard"
              desc="Model the temperature impact of cool rooftops, tree coverage, and green corridors before implementing them in the field."
              linkLabel="LAUNCH SIMULATOR" delay={0.2} />
            <CapabilityCard icon={Satellite} title="Satellite Intel" color="magenta" link="/dashboard"
              desc="Multi-band GEE satellite tiles — LST, NDVI, NDBI, Night Lights — rendered in real-time via Google Earth Engine tile endpoints."
              linkLabel="ACTIVATE LAYERS" delay={0.3} />
          </div>

          {/* Accuracy strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            viewport={{ once: true }}
            style={{ marginTop: 2, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}
          >
            {[
              { label: 'Model Accuracy', val: '93.5%', color: '#00F2FF' },
              { label: 'Algorithm', val: 'XGBoost v2', color: '#FF00E5' },
              { label: 'Data Source', val: 'Landsat 8/9', color: '#FFD700' },
              { label: 'Analysis Time', val: '< 3 sec', color: '#00E676' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderTop: `2px solid ${s.color}`, textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.val}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ══════════════ SECTION 4: MISSION PROTOCOL ══════════════ */}
      <Section id="protocol" style={{ padding: '100px 5vw', background: 'rgba(0,0,0,0.97)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <Play size={20} color="#00F2FF" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#00F2FF', letterSpacing: '3px', textTransform: 'uppercase' }}>MISSION PROTOCOL</span>
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 'clamp(32px, 4vw, 56px)', color: '#e2e2e2', marginBottom: 12, letterSpacing: '-1px' }}>
            Three Steps to Intelligence
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 500, lineHeight: 1.7, marginBottom: 72 }}>
            From global search to actionable climate intelligence in under 10 seconds.
          </p>

          <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
            <ProtocolStep num="01" icon={Globe} color="#00F2FF" delay={0}
              title="Select Location"
              desc="Search any city globally or click directly on the interactive satellite map"
              isLast={false} />
            <ProtocolStep num="02" icon={Cpu} color="#FF00E5" delay={0.2}
              title="Run ML Analysis"
              desc="XGBoost model extracts UHI probability, severity score, and feature importance in real-time"
              isLast={false} />
            <ProtocolStep num="03" icon={FlaskConical} color="#00E676" delay={0.4}
              title="Simulate Interventions"
              desc="Model cooling impact of rooftops, trees, and green corridors. Export recommendations."
              isLast={true} />
          </div>

          {/* Timeline bar */}
          <div style={{ marginTop: 72, height: 2, background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              transition={{ duration: 2, delay: 0.5 }}
              viewport={{ once: true }}
              style={{ position: 'absolute', height: '100%', background: 'linear-gradient(90deg, #00F2FF, #FF00E5, #00E676)', boxShadow: '0 0 8px rgba(0,242,255,0.5)' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {['T+0s Select', 'T+3s Analyze', 'T+8s Simulate'].map((t, i) => (
              <span key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>{t}</span>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════ SECTION 5: INITIATE / CTA ══════════════ */}
      <section
        style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '100px 24px',
          background: '#000', position: 'relative', overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <DotGrid />
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 800, background: 'radial-gradient(circle, rgba(0,242,255,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,242,255,0.06)', border: '1px solid rgba(0,242,255,0.15)',
            padding: '6px 18px', marginBottom: 40,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: '#00F2FF', letterSpacing: '3px', textTransform: 'uppercase',
          }}>
            <CheckCircle size={12} /> MISSION READY
          </div>

          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 900, fontSize: 'clamp(48px, 8vw, 112px)',
            lineHeight: 0.95, letterSpacing: '-3px',
            background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', marginBottom: 32,
          }}>
            INITIATE<br /><span style={{ background: 'linear-gradient(135deg, #00F2FF, #FF00E5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>MISSION</span>
          </h2>

          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, marginBottom: 56, maxWidth: 560, margin: '0 auto 56px' }}>
            Deploy the Tactical Map to identify structural countermeasures, simulate cool rooftops and tree coverage, and optimize localized temperature reductions in real time.
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
            <Link
              to="/dashboard"
              style={{
                padding: '18px 48px',
                background: '#00F2FF', color: '#000',
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800,
                fontSize: 15, letterSpacing: '2px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 12,
                textDecoration: 'none',
                boxShadow: '0 0 40px rgba(0,242,255,0.35), 0 0 80px rgba(0,242,255,0.1)',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 60px rgba(0,242,255,0.6), 0 0 120px rgba(0,242,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(0,242,255,0.35), 0 0 80px rgba(0,242,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              LAUNCH TACTICAL MAP <ArrowRight size={18} />
            </Link>
            <Link
              to="/engine"
              style={{
                padding: '18px 48px',
                background: 'transparent', color: '#e2e2e2',
                border: '1px solid rgba(255,255,255,0.15)',
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                fontSize: 15, letterSpacing: '2px', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 12,
                textDecoration: 'none',
                transition: 'all 0.3s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'transparent'; }}
            >
              VIEW DIAGNOSTICS
            </Link>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['ML Powered', 'Landsat Satellite Data', 'Real-Time GEE', 'XGBoost Engine', 'Open Science'].map((b, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                  color: 'rgba(255,255,255,0.25)', letterSpacing: '2px',
                  textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <CheckCircle size={10} color="rgba(0,242,255,0.4)" /> {b}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 5vw',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 16,
        background: '#000',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flame size={20} color="#00F2FF" />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#00F2FF' }}>UHI</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300, fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>INTELLIGENCE</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { label: 'MISSION', to: '/' },
            { label: 'TACTICAL MAP', to: '/dashboard' },
            { label: 'INTEL', to: '/reports' },
            { label: 'DIAGNOSTICS', to: '/engine' },
          ].map(l => (
            <Link key={l.to} to={l.to} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#00F2FF'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
            >{l.label}</Link>
          ))}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '1px' }}>
          © 2026 UHI Intelligence · ML-Driven Climate Action
        </span>
      </footer>
    </div>
  );
}
