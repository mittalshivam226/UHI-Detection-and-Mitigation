import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../../animations/framer/variants.js';
import { GlassPanel } from '../../components/ui/GlassPanel.jsx';
import { useUHIContext } from '../../context/UHIContext.jsx';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Metrics3D } from '../../components/ui/Metrics3D.jsx';
import { TrainingMetrics3D } from '../../components/ui/TrainingMetrics3D.jsx';
import ReactECharts from 'echarts-for-react';
import { Activity, Database, Server, Network, Cpu, Globe2, ScanFace, ActivityIcon } from 'lucide-react';
import Globe from 'react-globe.gl';

// ─── Simple Error Boundary to Prevent Page Disappearing ────────────────────────
class DiagnosticBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.warn("Diagnostics UI Error Caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center p-4 border border-red-500/30 bg-red-500/10 rounded-xl">
           <span className="font-mono text-xl text-red-500 font-bold tracking-widest text-center">
             COMPONENT CRASHED<br/><span className="text-xs text-red-500/50">Details caught by ErrorBoundary</span>
           </span>
        </div>
      );
    }
    return this.props.children;
  }
}

// Animated purely-HTML counter for the side legend
function AnimatedStat({ value, label, color, delay }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = null;
    let frameId;
    const duration = 2000;
    const timeout = setTimeout(() => {
      const step = (time) => {
        if (!start) start = time;
        const progress = Math.min((time - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        setCount(ease * value);
        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };
      frameId = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [value, delay]);

  return (
    <div className="flex flex-col border-l-2 pl-3 mb-4" style={{ borderColor: color }}>
      <span className="font-display font-bold text-2xl" style={{ color }}>{(count * 100).toFixed(1)}%</span>
      <span className="text-[10px] text-white/50 font-mono tracking-widest">{label}</span>
    </div>
  );
}

// ─── True Live-Ping Telemetry Graph ──────────────────────────────────────────
function TelemetryPing() {
  const [latencyHistory, setLatencyHistory] = useState(Array(15).fill(40));
  const [statusText, setStatusText] = useState("PINGING...");

  useEffect(() => {
    const timer = setInterval(async () => {
      const start = performance.now();
      let ok = false;
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';
        const r = await fetch(`${API_BASE}/ml/status`);
        if (r.ok) ok = true;
      } catch (e) {}
      const time = performance.now() - start;
      const ms = ok ? parseFloat(time.toFixed(1)) : 0;
      setStatusText(ok ? "ONLINE" : "FAIL");
      setLatencyHistory(prev => [...prev.slice(1), ms]);
    }, 3000); // Live ping every 3s
    return () => clearInterval(timer);
  }, []);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 5, bottom: 5, left: 5, right: 5 },
    xAxis: { type: 'category', data: latencyHistory.map((_, i) => i), show: false },
    yAxis: { type: 'value', min: 0, max: 200, show: false },
    series: [{
      type: 'line',
      data: latencyHistory,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: '#00f2ff', width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(0, 242, 255, 0.4)' }, { offset: 1, color: 'rgba(0, 242, 255, 0)' }]
        }
      }
    }]
  };

  return (
    <div className="flex flex-col items-end w-32 h-[50px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] tracking-widest text-[#00f2ff] font-mono font-bold animate-pulse">{statusText}</span>
        <span className="font-mono text-neon-cyan text-xs">{latencyHistory[14] > 0 ? `${latencyHistory[14].toFixed(0)}ms` : 'ERR'}</span>
      </div>
      <div className="flex-1 w-full"><ReactECharts option={option} style={{ height: '100%', width: '100%' }} /></div>
    </div>
  );
}

// ─── Dataset Globe Anchors ───────────────────────────────────────────────────
function DatasetGlobe({ numDots, uhiRate }) {
  const globeEl = useRef();
  const [hoverD, setHoverD] = useState();
  
  const gData = useMemo(() => {
    const N = numDots || 4882;
    // Distribute pseudo-random coordinates globally
    return [...Array(Math.min(N, 2000))].map((_, i) => ({
      lat: (Math.random() - 0.5) * 150,
      lng: (Math.random() - 0.5) * 360,
      size: Math.random() / 2,
      color: Math.random() < (uhiRate || 0.449) ? '#FF3B3B' : '#00f2ff',
    }));
  }, [numDots, uhiRate]);

  useEffect(() => {
    let mounted = true;
    const initControls = () => {
      if (!mounted) return;
      try {
        if (globeEl.current && typeof globeEl.current.controls === 'function' && globeEl.current.controls()) {
          globeEl.current.controls().autoRotate = true;
          globeEl.current.controls().autoRotateSpeed = 2.0;
          globeEl.current.controls().enableZoom = false;
        } else {
          // Retry if controls are not yet initialized by Three.js
          setTimeout(initControls, 100);
        }
      } catch (err) {
        console.warn("Globe controls failed to initialize", err);
      }
    };
    initControls();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center cursor-crosshair mix-blend-screen overflow-visible pt-10">
      <Globe
        ref={globeEl}
        width={400}
        height={400}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-dark.jpg"
        showAtmosphere={true}
        atmosphereColor="#FF00E5"
        atmosphereAltitude={0.15}
        pointsData={gData}
        pointAltitude={0.01}
        pointColor="color"
        pointRadius={0.4}
        pointsMerge={true}
        onPointHover={setHoverD}
      />
      {hoverD && (
        <div className="absolute top-4 right-4 bg-black/80 border border-neon-cyan/30 px-3 py-2 rounded pointer-events-none">
           <div className="text-[9px] text-white/50 font-mono">NODE ANCHOR</div>
           <div className="font-display text-neon-cyan text-sm">{hoverD.lat.toFixed(2)}, {hoverD.lng.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}

// ─── Variance Heartbeat Monitor ─────────────────────────────────────────────
function VarianceHeartbeat({ f1Mean, f1Std }) {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    let t = 0;
    const it = setInterval(() => {
      t += 0.5;
      const base = f1Mean || 0.89;
      const variance = f1Std || 0.0153;
      const drift = Math.sin(t * 0.5) * variance * 2;
      const noise = (Math.random() - 0.5) * variance;
      const lower = base - variance * 3;
      const upper = base + variance * 3;
      const val = base + drift + noise;
      setData(p => {
        const next = [...p.slice(Math.max(0, p.length - 49)), [t, val, lower, upper]];
        return next;
      });
    }, 150);
    return () => clearInterval(it);
  }, [f1Mean, f1Std]);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 10, bottom: 20, left: 35, right: 10 },
    xAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    yAxis: { 
      type: 'value', 
      min: (f1Mean || 0.89) - 0.06, 
      max: (f1Mean || 0.89) + 0.06, 
      splitLine: { show: false }, 
      axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 } 
    },
    series: [
      {
        name: 'Lower Band', type: 'line', data: data.map(d => [d[0], d[2]]),
        lineStyle: { opacity: 0 }, stack: 'band', symbol: 'none'
      },
      {
        name: 'Upper Band', type: 'line', data: data.map(d => [d[0], d[3] - d[2]]),
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(255, 0, 229, 0.1)' },
        stack: 'band', symbol: 'none'
      },
      {
        name: 'Actual F1', type: 'line', data: data.map(d => [d[0], d[1]]),
        lineStyle: { color: '#FF00E5', width: 2, shadowColor: '#FF00E5', shadowBlur: 10 },
        symbol: 'none' // like an ECG heartbeat
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />;
}

// ─── Cascading SHAP Waterfall Simulator ──────────────────────────────────────
function ShapWaterfall({ shapValues, baseValue }) {
  if (!shapValues || Object.keys(shapValues).length === 0) {
    return (
      <div className="absolute inset-0 m-4 rounded-xl overflow-hidden bg-black/40 border border-white/5 flex flex-col items-center justify-center">
        {/* Animated Scanning Grid Background */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.2) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: 'center center'
        }} />
        <motion.div 
          animate={{ y: ["-100%", "100%"] }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="absolute inset-0 w-full h-[20%] bg-gradient-to-b from-transparent via-[#00f2ff]/20 to-transparent pointer-events-none"
        />

        {/* Lock-on Reticle */}
        <div className="relative z-10 flex flex-col items-center justify-center border border-[#00f2ff]/30 p-8 rounded-full bg-[#00f2ff]/5">
          <motion.div 
             animate={{ rotate: 360 }} 
             transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
             className="absolute w-32 h-32 border border-dashed border-[#00f2ff]/50 rounded-full"
          />
          <motion.div 
             animate={{ rotate: -360, scale: [0.9, 1.1, 0.9] }} 
             transition={{ rotate: { repeat: Infinity, duration: 12, ease: "linear" }, scale: { repeat: Infinity, duration: 3, ease: "easeInOut" } }}
             className="absolute w-24 h-24 border border-[#FF00E5]/30 rounded-full"
          />
          <ScanFace size={32} className="text-[#00f2ff] drop-shadow-[0_0_8px_#00f2ff] animate-pulse" />
        </div>

        {/* Status Text HUD */}
        <div className="relative z-10 mt-8 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-mono text-[10px] tracking-widest text-[#00f2ff] font-bold">AWAITING TACTICAL LOCK</span>
          </div>
          <span className="font-display text-xs text-white/50 text-center max-w-[250px]">
            Calibrating SHAP explanation engine. Select a global node to map vector feature logic.
          </span>
        </div>
      </div>
    );
  }

  const PRETTY_LABELS = {
    lst_delta: 'Urban ΔT', ndvi: 'NDVI', ndbi: 'NDBI',
    evi: 'EVI', elevation: 'Elevation', ntl: 'Night Lights'
  };

  const entries = Object.keys(shapValues)
    .map(k => ({ name: PRETTY_LABELS[k] || k.toUpperCase(), val: shapValues[k] }))
    .sort((a,b) => Math.abs(b.val) - Math.abs(a.val));
  
  let currentTotal = baseValue || 0;
  const flowNodes = [
    { name: 'Base Log-Odds', val: currentTotal, type: 'base' }
  ];

  entries.forEach(e => {
    flowNodes.push({ name: e.name, val: e.val, type: e.val > 0 ? 'pos' : 'neg' });
    currentTotal += e.val;
  });

  flowNodes.push({ name: 'Final Output', val: currentTotal, type: 'final' });

  return (
    <div className="relative w-full h-full pb-6 pt-2 flex flex-col">
      {/* SHAP Meaning HUD */}
      <div className="absolute top-2 left-6 z-10 flex gap-4 pointer-events-none opacity-80 border border-white/10 bg-black/60 px-3 py-1.5 rounded-lg shadow-lg">
         <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B3B] shadow-[0_0_5px_#FF3B3B]" />
            <span className="text-[9px] font-mono tracking-widest text-[#FF3B3B]">RISK INCREASE (+ ΔT)</span>
         </div>
         <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shadow-[0_0_5px_#00f2ff]" />
            <span className="text-[9px] font-mono tracking-widest text-[#00f2ff]">RISK DECREASE (- ΔT)</span>
         </div>
      </div>

      {/* 4D Animated Flow Diagram */}
      <div className="flex-1 w-full mx-auto mt-10 flex items-center justify-start gap-12 relative overflow-x-auto overflow-y-hidden px-8 py-16 shadow-inner [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* The Animated Energy Backbone */}
        <div className="absolute top-1/2 left-0 w-[3000px] h-[2px] bg-white/10 -translate-y-1/2 z-0 min-w-max pointer-events-none">
          <motion.div 
            animate={{ x: ["-10%", "100%"] }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="w-[300px] h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-50 shadow-[0_0_8px_white]"
          />
        </div>

        {flowNodes.map((node, index) => {
          const isBase = node.type === 'base';
          const isFinal = node.type === 'final';
          const isPos = node.type === 'pos';
          
          let glowColor = 'shadow-[0_0_10px_rgba(255,255,255,0.1)]';
          let borderColor = 'border-white/20';
          let textColor = 'text-white';
          let yOffset = 0;

          if (!isBase && !isFinal) {
             glowColor = isPos ? 'shadow-[0_0_15px_rgba(255,59,59,0.3)]' : 'shadow-[0_0_15px_rgba(0,242,255,0.3)]';
             borderColor = isPos ? 'border-[#FF3B3B]/50' : 'border-[#00f2ff]/50';
             textColor = isPos ? 'text-[#FF3B3B]' : 'text-[#00f2ff]';
             yOffset = isPos ? -20 : 20; // Stagger branches physically upwards and downwards for 4D feel
          } else {
             borderColor = 'border-white/50 border-dashed';
          }

          return (
            <motion.div 
              key={`${node.name}-${index}`}
              initial={{ opacity: 0, scale: 0.8, y: yOffset }}
              animate={{ opacity: 1, scale: 1, y: yOffset }}
              transition={{ delay: index * 0.1, type: "spring" }}
              whileHover={{ scale: 1.1, zIndex: 50 }}
              className={`relative z-10 shrink-0 flex flex-col items-center justify-center p-3 rounded-lg min-w-[110px] backdrop-blur-md bg-black/60 border ${borderColor} ${glowColor}`}
            >
              <div className="font-mono text-[10px] tracking-widest text-white/70 mb-1 text-center w-full">
                {node.name}
              </div>
              <div className={`font-display text-sm font-bold ${textColor}`}>
                {isBase || isFinal ? node.val.toFixed(3) : (node.val > 0 ? '+' : '') + node.val.toFixed(3)}
              </div>
              
              {/* Pulse node connector */}
              {index > 0 && (
                <div className="absolute top-1/2 -left-[32px] w-[32px] h-[1px] bg-white/20" />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN ENGINE PAGE ────────────────────────────────────────────────────────
export default function EnginePage() {
  const { mlData, loading } = useUHIContext();
  const [globalStatus, setGlobalStatus] = useState(null);
  const [fetching, setFetching] = useState(true);

  // Fetch the default ML model configuration on mount
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';
        const res = await fetch(`${API_BASE}/ml/status`);
        if (res.ok) {
          const data = await res.json();
          setGlobalStatus(data);
        }
      } catch (err) {
        console.error("Backend unreachable", err);
      } finally {
        setFetching(false);
      }
    };
    fetchStatus();
  }, []);

  // Use localized ML weights if available, otherwise use global model weights
  let features = { lst_delta: 0.819, ndbi: 0.084, elevation: 0.038, ndvi: 0.034, evi: 0.015, ntl: 0.010 };
  
  if (mlData?.feature_importance) {
    features = mlData.feature_importance;
  } else if (globalStatus?.feature_importance?.classifier_importance) {
    features = globalStatus.feature_importance.classifier_importance;
  }
  
  // Extract Training Metrics & Variance
  let c_metrics = { accuracy: 0.9349, f1: 0.8946, roc_auc: 0.9850, cv_f1_mean: 0.89, cv_f1_std: 0.015 };
  let r_metrics = { rmse: 2.08, mae: 1.41, r2: 0.9416 };

  if (globalStatus?.feature_importance) {
    if (globalStatus.feature_importance.classifier_metrics) c_metrics = { ...c_metrics, ...globalStatus.feature_importance.classifier_metrics };
    if (globalStatus.feature_importance.regressor_metrics) r_metrics = { ...r_metrics, ...globalStatus.feature_importance.regressor_metrics };
  }
  
  // Radar Chart formulation
  const PRETTY_LABELS = {
    lst_delta: 'Urban ΔT', ndvi: 'NDVI', ndbi: 'NDBI',
    evi: 'EVI', elevation: 'Elevation', ntl: 'Night Lights'
  };
  
  const radarData = Object.keys(features).map(k => features[k] * 100);
  const radarIndicators = Object.keys(features).map(k => ({ name: PRETTY_LABELS[k] || k.toUpperCase(), max: 90 }));

  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    radar: {
      indicator: radarIndicators,
      shape: 'polygon',
      axisName: { color: 'rgba(255, 255, 255, 0.6)', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitArea: { areaStyle: { color: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.2)'] } },
      axisLine: { lineStyle: { color: 'rgba(0,242,255,0.2)' } },
      splitLine: { lineStyle: { color: 'rgba(0,242,255,0.1)' } }
    },
    series: [{
      name: 'XGBoost Feature Importances', type: 'radar',
      data: [{ value: radarData, name: 'Weight %' }],
      areaStyle: { color: 'rgba(0,242,255,0.3)' },
      lineStyle: { color: '#00f2ff', width: 2 },
      itemStyle: { color: '#00f2ff', borderColor: '#fff' }
    }]
  };

  const isModelsReady = globalStatus?.models_ready;

  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full pt-[90px] px-8 pb-8 pointer-events-auto overflow-y-auto"
    >
      <div className="flex flex-col gap-6 h-full">

        {/* TOP HUD: Diagnostics Telemetry */}
        <div className="flex flex-wrap gap-4 w-full h-[90px]">
          <GlassPanel className="flex-1 p-5 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-white/50 tracking-widest font-mono mb-1 flex items-center gap-2">
                <Server size={12}/> API STATUS
              </div>
              <div className="font-display font-bold text-xl text-white flex items-center gap-3">
                {fetching ? <span className="text-white/40">CONNECTING...</span> : (isModelsReady ? 'ONLINE' : 'OFFLINE')}
                {!fetching && (
                  <div className={`w-3 h-3 rounded-full ${isModelsReady ? 'bg-neon-green shadow-[0_0_10px_#00e676]' : 'bg-neon-magenta shadow-[0_0_10px_#ff00e5]'} animate-pulse`} />
                )}
              </div>
            </div>
            
            <div className="border-l border-white/10 pl-6 h-full flex flex-col justify-center">
              <div className="text-[10px] text-white/50 tracking-widest font-mono mb-1">DATA SCOPE</div>
              <div className="font-mono text-neon-cyan">
                {mlData ? 'LOCALIZED VECTOR' : 'GLOBAL WEIGHTS'}
              </div>
            </div>

            <div className="border-l border-white/10 pl-6 h-full flex items-center justify-end">
              <TelemetryPing />
            </div>
          </GlassPanel>
        </div>

        {/* ROW 1: 3D XGBoost Landscape & SHAP Matrix */}
        <div className="flex flex-col lg:flex-row gap-6 w-full lg:min-h-[500px]">
          
          {/* LEFT: 3D XGBoost Landscape */}
          <GlassPanel className="w-full lg:w-5/12 rounded-xl p-0 overflow-hidden relative border border-neon-cyan/20 flex flex-col">
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
              <h3 className="font-display font-bold text-2xl text-neon-cyan flex items-center gap-3">
                <Network size={20} /> Feature Matrix
              </h3>
              <p className="font-mono text-[10px] text-white/50 tracking-widest mt-1">XGBOOST ALGORITHM DIAGNOSTIC</p>
            </div>
            <div className="w-full h-[400px] lg:flex-1 bg-black/80">
              <DiagnosticBoundary>
                <Canvas camera={{ position: [5, 4, 8], fov: 45 }}>
                  <React.Suspense fallback={null}>
                    <Metrics3D features={features} />
                  </React.Suspense>
                  <OrbitControls enableZoom={true} enablePan={false} autoRotate={!mlData} autoRotateSpeed={1} maxPolarAngle={Math.PI / 2 - 0.1} minDistance={6} maxDistance={15} />
                </Canvas>
              </DiagnosticBoundary>
            </div>
          </GlassPanel>

          {/* RIGHT: Live SHAP Explanation Matrix */}
          <GlassPanel className="w-full lg:w-7/12 rounded-xl p-0 relative border border-[#FF3B3B]/20 bg-gradient-to-tr from-[#FF3B3B]/10 to-transparent flex flex-col overflow-hidden min-h-[400px]">
             <div className="absolute top-5 left-5 z-10 w-full pr-10 flex justify-between pointer-events-none">
                <div>
                  <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                    <ActivityIcon size={18} className="text-[#FF3B3B]" /> Live SHAP Explanation Simulator
                  </h3>
                  <div className="text-[9px] text-white/60 tracking-widest font-mono mt-1">SHAPLEY ADDITIVE EXPLANATIONS (LOCALISED CASCADING WATERFALL)</div>
                </div>
                <div className="bg-[#FF3B3B]/20 text-[#FF3B3B] px-2 py-0.5 rounded font-mono text-[10px] font-bold border border-[#FF3B3B]/30 self-start shadow-[0_0_10px_#FF3B3B]">XGBOOST EXPLAINER</div>
             </div>
             
             <div className="w-full flex-1 pt-16">
               <ShapWaterfall shapValues={mlData?.shap_values} baseValue={mlData?.shap_base_value} />
             </div>
          </GlassPanel>
        </div>

        {/* ROW 2: Architecture Specs & Validation Trajectories & Dataset Anchors */}
        <div className="flex flex-col lg:flex-row gap-6 w-full lg:min-h-[450px]">
          
          {/* LEFT: Dataset Anchors (Globe Hologram) */}
          <GlassPanel className="w-full lg:w-4/12 rounded-xl p-6 relative flex flex-col border border-white/5 overflow-hidden">
             <div className="relative z-10 pointer-events-none mb-4 w-full flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe2 size={16} className="text-[#FF00E5]" />
                    <h3 className="font-display font-bold text-lg text-white">Global Dataset Anchors</h3>
                  </div>
                  <p className="font-mono text-[9px] text-white/50 tracking-widest">
                    TRAINING CLOUD ({globalStatus?.feature_importance?.dataset_rows || 4882} NODES)
                  </p>
                </div>
                <div className="bg-[#FF00E5]/20 text-[#FF00E5] px-2 py-0.5 rounded font-mono text-[9px] font-bold border border-[#FF00E5]/30 shadow-[0_0_10px_#FF00E5]">
                  {(globalStatus?.feature_importance?.uhi_positive_rate * 100 || 44.9).toFixed(1)}% UHI
                </div>
             </div>
             
             {/* Render Globe inside boundary */}
             <div className="relative flex-1 w-full flex items-center justify-center pointer-events-auto">
               
               {/* Globe Legend */}
               <div className="absolute bottom-6 left-6 z-10 flex flex-col gap-1 pointer-events-none opacity-70 border border-white/10 bg-black/60 px-3 py-2 rounded shadow-lg backdrop-blur-sm">
                 <div className="text-[10px] text-white/50 font-display mb-1 border-b border-white/10 pb-1">NODE CLASSIFICATION</div>
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B3B] shadow-[0_0_5px_#FF3B3B]" />
                    <span className="text-[9px] font-mono tracking-widest text-white/70">UHI POSITIVE (HOT)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] shadow-[0_0_5px_#00f2ff]" />
                    <span className="text-[9px] font-mono tracking-widest text-white/70">UHI NEGATIVE (COOL)</span>
                 </div>
               </div>

               <DiagnosticBoundary>
                 <DatasetGlobe numDots={globalStatus?.feature_importance?.dataset_rows} uhiRate={globalStatus?.feature_importance?.uhi_positive_rate}/>
               </DiagnosticBoundary>
             </div>
          </GlassPanel>

          {/* MIDDLE: Technical Radar */}
          <GlassPanel className="w-full lg:w-3/12 rounded-xl p-6 relative flex flex-col border border-white/5 bg-gradient-to-br from-black/80 to-transparent">
            <h3 className="font-display font-medium text-md text-white">Multivariate Vector Radar</h3>
            <p className="font-mono text-[8px] text-white/50 tracking-widest mb-2 border-b border-white/10 pb-2">CROSS-SECTIONAL METRIC INFLUENCE PROJECTION</p>
            <div className="flex-1 -mx-4 h-[200px]">
              <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </GlassPanel>

          {/* RIGHT: Machine Learning Validation Metrics + Heartbeat */}
          <GlassPanel className="w-full lg:w-5/12 rounded-xl p-0 border border-white/5 bg-gradient-to-tl from-neon-cyan/5 to-transparent flex flex-col relative overflow-hidden">
            <div className="p-5 flex justify-between pointer-events-none border-b border-white/10">
              <div>
                <h3 className="font-display font-medium text-md text-white">Validation Trajectories & Heartbeat</h3>
                <div className="text-[9px] text-white/50 tracking-widest font-mono">K-FOLD TESTED CONFIDENCE INTERVALS</div>
              </div>
            </div>
            
            <div className="flex flex-row w-full flex-1">
              {/* ECharts Heartbeat Line Graph */}
              <div className="flex-1 h-[140px] pt-4 pointer-events-none">
                <VarianceHeartbeat f1Mean={c_metrics.cv_f1_mean} f1Std={c_metrics.cv_f1_std} />
              </div>
              
              {/* Score HUD */}
              <div className="w-32 flex flex-col justify-center border-l border-white/10 p-4">
                <AnimatedStat value={c_metrics.roc_auc || 0.98} label="ROC-AUC" color="#FF00E5" delay={0} />
                <AnimatedStat value={c_metrics.f1 || 0.89} label="F1-SCORE" color="#00f2ff" delay={300} />
              </div>
            </div>

            {/* Regressor Stats Sub-Panel */}
            <div className="w-full flex border-t border-white/10 bg-black/60 divide-x divide-white/10 mt-auto bottom-0">
              <div className="flex-1 p-2 flex flex-col items-center text-center">
                 <span className="text-[8px] tracking-widest text-white/50 font-mono mb-1">RMSE VARIANCE</span>
                 <span className="font-display font-bold text-amber-400 text-md">±{r_metrics.rmse.toFixed(2)}°C</span>
              </div>
              <div className="flex-1 p-2 flex flex-col items-center text-center">
                 <span className="text-[8px] tracking-widest text-white/50 font-mono mb-1">MAE ABSOLUTE</span>
                 <span className="font-display font-bold text-neon-green text-md">±{r_metrics.mae.toFixed(2)}°C</span>
              </div>
              <div className="flex-1 p-2 flex flex-col items-center text-center">
                 <span className="text-[8px] tracking-widest text-white/50 font-mono mb-1">R² SCORE</span>
                 <span className="font-display font-bold text-neon-cyan text-md">{(r_metrics.r2 * 100).toFixed(1)}%</span>
              </div>
            </div>
          </GlassPanel>

        </div>

      </div>
    </motion.div>
  );
}
