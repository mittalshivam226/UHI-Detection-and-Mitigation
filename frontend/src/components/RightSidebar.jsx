import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import { useUHIContext } from '../context/UHIContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Trees, Home, Droplets, MapPin, Zap, AlertTriangle, CheckCircle2, Thermometer, TreePine, Building2 } from 'lucide-react';

// ─── Reusables ───────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}/>
    </div>
  );
}

// ─── Mini charts ─────────────────────────────────────────────────────────────
function EnvBarChart({ env }) {
  const data = [
    { name: 'LST (°C)', value: parseFloat(env.lst_celsius.toFixed(1)), itemStyle: { color: '#FF3B3B' } },
    { name: 'NDVI',     value: parseFloat(((env.ndvi + 1) / 2 * 100).toFixed(1)), itemStyle: { color: '#00e676' } },
    { name: 'NDBI',     value: parseFloat(((env.ndbi + 1) / 2 * 100).toFixed(1)), itemStyle: { color: '#FFD700' } },
    ...(env.evi  != null ? [{ name: 'EVI', value: parseFloat(((env.evi + 1) / 2 * 100).toFixed(1)),  itemStyle: { color: '#4ade80' } }] : []),
    ...(env.lst_delta != null ? [{ name: 'ΔT', value: parseFloat(Math.max(0, env.lst_delta * 5).toFixed(1)), itemStyle: { color: '#f87171' } }] : []),
  ];

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 0, bottom: 20, left: 30 },
    tooltip: { 
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#0a0b10', borderColor: 'rgba(0, 242, 255, 0.2)', textStyle: { color: '#fff' },
      valueFormatter: (val) => `${val}%`
    },
    xAxis: { 
      type: 'category', data: data.map(d => d.name),
      axisLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 10, interval: 0 },
      axisLine: { show: false }, axisTick: { show: false }
    },
    yAxis: { 
      type: 'value', max: 100,
      axisLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9 },
      splitLine: { show: false }
    },
    series: [{
      type: 'bar', barWidth: 22,
      data: data.map(d => ({ value: d.value, itemStyle: { color: d.itemStyle.color, borderRadius: [4, 4, 0, 0] } }))
    }]
  };

  return (
    <div className="panel-section">
      <div className="panel-section-header">
        <div className="glow-dot" style={{ background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }}/>
        Index Comparison
      </div>
      <div style={{ fontSize: 10, color: 'var(--on-muted)', marginBottom: 10 }}>Values normalised 0–100%</div>
      <ReactECharts option={option} style={{ height: 130, width: '100%' }} />
    </div>
  );
}

// ─── ML Insights Panel ───────────────────────────────────────────────────────
function MLInsightsPanel({ ml, loading }) {
  const FEAT_LABELS = {
    lst_delta: 'ΔT', ndvi: 'NDVI', ndbi: 'NDBI',
    evi: 'EVI', elevation: 'Elev', ntl: 'NTL', lst: 'LST',
  };

  // ── A. Still waiting for ML endpoint to respond ──────────────────────────
  if (loading) return (
    <div className="panel-section glass-panel" style={{ padding: '14px 16px', marginBottom: 12 }}>
      <div className="panel-section-header" style={{ marginBottom: 12 }}>
        <div className="glow-dot" style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa', animation: 'pulse 1.5s ease-in-out infinite' }}/>
        ML Intelligence
        <span style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '1px', color: '#a78bfa', fontWeight: 700, background: 'rgba(167,139,250,0.12)', padding: '2px 10px', borderRadius: 20, border: '1px solid rgba(167,139,250,0.25)', animation: 'pulse 1.5s ease-in-out infinite' }}>
          COMPUTING…
        </span>
      </div>
      {[80, 60, 100, 70].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: i === 2 ? 56 : 20, width: `${w}%`, borderRadius: 6, marginBottom: 10 }} />
      ))}
      <div style={{ height: 4, background: 'rgba(167,139,250,0.08)', borderRadius: 4, marginTop: 4 }}>
        <div style={{ height: '100%', width: '35%', background: 'rgba(167,139,250,0.3)', borderRadius: 4, animation: 'slideRight 1.5s ease-in-out infinite' }}/>
      </div>
    </div>
  );

  // ── B. ML call resolved but failed (503 / network error) ─────────────────
  if (!ml) return (
    <div className="panel-section glass-panel" style={{ padding: '14px 16px', marginBottom: 12, opacity: 0.6 }}>
      <div className="panel-section-header" style={{ marginBottom: 8 }}>
        <div className="glow-dot" style={{ background: '#64748b' }}/>
        ML Intelligence
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#64748b', fontWeight: 700, background: 'rgba(100,116,139,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(100,116,139,0.2)' }}>
          UNAVAILABLE
        </span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--on-muted)', lineHeight: 1.6 }}>
        ML endpoint did not respond. Ensure the backend is running and models are trained.
      </div>
    </div>
  );

  // ── C. Full v2 ML data ────────────────────────────────────────────────────
  const prob       = ml.uhi_probability ?? 0;
  const score      = ml.uhi_score ?? 0;
  const conf       = ml.model_confidence ?? 'medium';
  const modelVer   = ml.model_version ?? 'v2';
  const lstDelta   = ml.environmental_data?.lst_delta;
  const env        = ml.environmental_data ?? {};
  const confColor  = conf === 'high' ? '#00e676' : conf === 'medium' ? '#FFD700' : '#ff7722';
  const probColor  = prob > 0.7 ? '#FF3B3B' : prob > 0.4 ? '#ff7722' : '#00e676';
  const scoreColor = score > 0.7 ? '#FF3B3B' : score > 0.4 ? '#ff7722' : '#00e676';
  const deltaColor = lstDelta == null ? 'var(--on-muted)'
    : lstDelta > 4 ? '#FF3B3B' : lstDelta > 1.5 ? '#ff7722' : '#00e676';

  return (
    <div className="panel-section glass-panel" style={{ padding: '14px 16px', marginBottom: 12 }}>
      {/* Header */}
      <div className="panel-section-header" style={{ marginBottom: 12 }}>
        <div className="glow-dot" style={{ background: '#a78bfa', boxShadow: '0 0 8px #a78bfa' }}/>
        ML Intelligence
        <span style={{ marginLeft: 6, fontSize: 9, letterSpacing: '1px', color: '#64748b', fontWeight: 700, background: 'rgba(100,116,139,0.12)', padding: '2px 6px', borderRadius: 20, border: '1px solid rgba(100,116,139,0.25)' }}>
          {modelVer.toUpperCase()}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 9, letterSpacing: '1px', color: confColor, fontWeight: 700, background: `${confColor}18`, padding: '2px 8px', borderRadius: 20, border: `1px solid ${confColor}44` }}>
          {conf.toUpperCase()} CONFIDENCE
        </span>
      </div>

      {/* UHI Probability bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--on-muted)', marginBottom: 5 }}>
          <span>UHI Probability</span>
          <span style={{ color: probColor, fontWeight: 700, fontSize: 13 }}>{(prob * 100).toFixed(1)}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-lift)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${prob * 100}%`, background: `linear-gradient(to right,#00e676,${probColor})`, borderRadius: 4, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${probColor}66` }}/>
        </div>
      </div>

      {/* Severity score bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--on-muted)', marginBottom: 5 }}>
          <span>UHI Severity Score</span>
          <span style={{ color: scoreColor, fontWeight: 700, fontSize: 13 }}>{(score * 100).toFixed(0)}/100</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-lift)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${score * 100}%`, background: `linear-gradient(to right,#4ade80,${scoreColor})`, borderRadius: 4, transition: 'width 0.6s ease', boxShadow: `0 0 8px ${scoreColor}66` }}/>
        </div>
      </div>

      {/* ΔT anomaly — #1 model feature (81.9% importance) */}
      {lstDelta != null && (
        <div style={{ marginBottom: 12, padding: '9px 12px', background: `${deltaColor}0f`, borderRadius: 8, border: `1px solid ${deltaColor}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            <div style={{ fontSize: 11, color: 'var(--on-bg)', fontWeight: 600 }}>Urban–Rural ΔT</div>
            <div style={{ fontSize: 9, color: 'var(--on-muted)', marginTop: 2 }}>LST − rural baseline (key classifier signal)</div>
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: deltaColor, letterSpacing: '-0.5px' }}>
            {lstDelta > 0 ? '+' : ''}{lstDelta.toFixed(1)}°C
          </span>
        </div>
      )}

      {/* Actual vs Predicted temperature */}
      {ml.predicted_temperature != null && env.lst_celsius != null && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px', marginBottom: 3 }}>ACTUAL LST</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#FF3B3B' }}>{env.lst_celsius.toFixed(1)}°</div>
            <div style={{ fontSize: 9, color: 'var(--on-muted)' }}>Landsat 8/9</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--on-muted)', fontSize: 12 }}>→</div>
          <div style={{ flex: 1, background: 'rgba(167,139,250,0.06)', borderRadius: 8, padding: '8px 10px', textAlign: 'center', border: '1px solid rgba(167,139,250,0.15)' }}>
            <div style={{ fontSize: 9, color: '#a78bfa', letterSpacing: '1px', marginBottom: 3 }}>ML PREDICTED</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>{ml.predicted_temperature.toFixed(1)}°</div>
            <div style={{ fontSize: 9, color: 'var(--on-muted)' }}>XGBoost + RF</div>
          </div>
        </div>
      )}

      {/* v2 extended env stats row */}
      {(env.evi != null || env.elevation != null || env.ntl != null || env.rural_lst_mean != null) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 10 }}>
          {env.evi != null && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px', marginBottom: 2 }}>EVI</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4ade80' }}>{env.evi.toFixed(3)}</div>
              <div style={{ fontSize: 9, color: 'var(--on-muted)' }}>Enhanced Veg. Index</div>
            </div>
          )}
          {env.rural_lst_mean != null && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px', marginBottom: 2 }}>RURAL LST</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>{env.rural_lst_mean.toFixed(1)}°</div>
              <div style={{ fontSize: 9, color: 'var(--on-muted)' }}>3–15km baseline</div>
            </div>
          )}
          {env.elevation != null && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px', marginBottom: 2 }}>ELEVATION</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#7dd3fc' }}>{Math.round(env.elevation)}m</div>
              <div style={{ fontSize: 9, color: 'var(--on-muted)' }}>SRTM 30m DEM</div>
            </div>
          )}
          {env.ntl != null && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '7px 10px' }}>
              <div style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px', marginBottom: 2 }}>NIGHT LIGHTS</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#fbbf24' }}>{env.ntl.toFixed(1)}</div>
              <div style={{ fontSize: 9, color: 'var(--on-muted)' }}>VIIRS nW/cm²/sr</div>
            </div>
          )}
        </div>
      )}

      {/* Feature importance bars */}
      {ml.feature_importance && Object.keys(ml.feature_importance).length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--on-muted)', letterSpacing: '1px', marginBottom: 6 }}>FEATURE IMPORTANCE (XGBoost)</div>
          {Object.entries(ml.feature_importance).sort((a, b) => b[1] - a[1]).map(([feat, imp]) => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--on-muted)', width: 36, textAlign: 'right', flexShrink: 0 }}>
                {(FEAT_LABELS[feat] ?? feat).toUpperCase()}
              </span>
              <div style={{ flex: 1, height: 5, background: 'var(--bg-lift)', borderRadius: 3 }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(imp * 100, 100)}%`,
                  background: imp > 0.5 ? 'linear-gradient(to right,#f87171,#ef4444)' : 'linear-gradient(to right,#a78bfa,#7c3aed)',
                  borderRadius: 3,
                  transition: 'width 0.8s ease',
                }}/>
              </div>
              <span style={{ fontSize: 9, color: imp > 0.5 ? '#f87171' : '#a78bfa', width: 34, flexShrink: 0, fontWeight: 600 }}>
                {(imp * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SimTrendChart({ currentTemp, simData }) {
  const treeSteps = [0, 25, 50, 75, 100].map(pct => {
    const drop = (pct / 100) * 3.0;
    return { pct: `${pct}%`, temp: parseFloat((currentTemp - drop).toFixed(1)) };
  });

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 10, right: 10, bottom: 20, left: 30 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0a0b10', borderColor: 'rgba(0, 242, 255, 0.2)', textStyle: { color: '#fff' },
      valueFormatter: (val) => `${val}°C`
    },
    xAxis: {
      type: 'category', data: treeSteps.map(d => d.pct),
      axisLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9 },
      axisLine: { show: false }, axisTick: { show: false }
    },
    yAxis: {
      type: 'value', min: 'dataMin', max: 'dataMax',
      axisLabel: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 9 },
      splitLine: { show: false }
    },
    series: [{
      type: 'line', smooth: true, symbolSize: 6,
      itemStyle: { color: '#00e676' }, lineStyle: { width: 2 },
      data: treeSteps.map(d => d.temp)
    }]
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--on-muted)', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Projected Temp vs Tree Coverage
      </div>
      <ReactECharts option={option} style={{ height: 100, width: '100%' }} />
    </div>
  );
}

const ML_API = 'http://127.0.0.1:8002/ml';
const LEGACY_API = 'http://127.0.0.1:8002/api';

// ─── Right Analysis Panel ─────────────────────────────────────────────────────
export default function RightSidebar() {
  const { analysis, mlData, loading, mlLoading, pos, setSimulationState } = useUHIContext();
  const [treePct,  setTreePct]  = useState(30);
  const [roofPct,  setRoofPct]  = useState(20);
  const [waterPct, setWaterPct] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const currentTemp       = mlData?.environmental_data?.lst_celsius ?? analysis?.environmental_data?.lst_celsius;
  const currentNdvi       = mlData?.environmental_data?.ndvi ?? analysis?.environmental_data?.ndvi;
  const currentNdbi       = mlData?.environmental_data?.ndbi ?? analysis?.environmental_data?.ndbi;
  // v2 extended features — passed to simulate for better regressor accuracy
  const currentEvi        = mlData?.environmental_data?.evi ?? null;
  const currentElevation  = mlData?.environmental_data?.elevation ?? null;
  const currentNtl        = mlData?.environmental_data?.ntl ?? null;
  const currentRuralLst   = mlData?.environmental_data?.rural_lst_mean ?? null;

  useEffect(() => {
    if (!currentTemp) return;
    const actions = [];
    const intensities = {};
    if (treePct  > 0) { actions.push('trees'); intensities.trees = treePct;  }
    if (roofPct  > 0) { actions.push('cool_roof'); intensities.cool_roof = roofPct; }
    if (waterPct > 0) { actions.push('water'); intensities.water = waterPct; }
    if (actions.length === 0) { 
      setSimResult(null); 
      setSimulationState(p => ({ ...p, overlayActive: false, predictedReduction: 0 }));
      return; 
    }

    const timer = setTimeout(async () => {
      setSimLoading(true);
      try {
        if (currentNdvi != null && currentNdbi != null) {
          const r = await fetch(`${ML_API}/simulate`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ndvi: currentNdvi,
              ndbi: currentNdbi,
              actions,
              lst_celsius: currentTemp,
              lat: pos?.lat ?? 0,
              intensities,
              // v2 extended features for richer regressor predictions
              ...(currentEvi       != null ? { evi: currentEvi }             : {}),
              ...(currentElevation != null ? { elevation: currentElevation } : {}),
              ...(currentNtl       != null ? { ntl: currentNtl }             : {}),
              ...(currentRuralLst  != null ? { rural_lst_mean: currentRuralLst } : {}),
            }),
          });
          if (r.ok) {
            const d = await r.json();
            setSimResult({
              current_temp: d.original_temperature,
              predicted_temp: d.new_temperature,
              reduction: d.temperature_reduction,
              breakdown: d.per_action_breakdown ?? actions.map(a => ({
                action: a, label: a,
                reduction: parseFloat((d.temperature_reduction / actions.length).toFixed(2)),
                intensity: intensities[a] || 100,
              })),
            });
            setSimulationState({
               activeOptions: intensities,
               predictedReduction: d.temperature_reduction,
               overlayActive: true
            });
            setSimLoading(false);
            return;
          }
        }
        const r2 = await fetch(`${LEGACY_API}/simulate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_temp: currentTemp, actions, intensities }),
        });
        if (r2.ok) { 
          const data = await r2.json();
          setSimResult(data); 
          setSimulationState({
              activeOptions: intensities,
              predictedReduction: data.reduction,
              overlayActive: true
          });
          setSimLoading(false); 
          return; 
        }
      } catch { /* fall through */ }
      
      const impacts = { trees: 4.0, cool_roof: 5.5, water: 2.5, green_roof: 2.5 };
      const labels  = { trees: 'Tree Cover', cool_roof: 'Cool Roof', water: 'Water Features', green_roof: 'Green Roof' };
      let drop = 0;
      const breakdown = actions.map(a => {
        const red = parseFloat(((intensities[a] || 100) / 100 * (impacts[a] || 2.0)).toFixed(2));
        drop += red;
        return { action: a, label: labels[a] || a, reduction: red, intensity: intensities[a] || 100 };
      });
      setSimResult({
        current_temp: currentTemp,
        predicted_temp: parseFloat(Math.max((currentTemp ?? 30) - drop, 15).toFixed(1)),
        reduction: parseFloat(drop.toFixed(2)),
        breakdown,
      });
      setSimulationState({
          activeOptions: intensities,
          predictedReduction: parseFloat(drop.toFixed(2)),
          overlayActive: true
      });
      setSimLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [treePct, roofPct, waterPct, currentTemp, currentNdvi, currentNdbi]);

  useEffect(() => { 
    setTreePct(30); setRoofPct(20); setWaterPct(0); setSimResult(null); 
  }, [pos]);

  if (!pos && !loading && !analysis && !mlData) {
    return (
      <motion.aside initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="right-panel glass-panel-heavy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="right-panel-empty">
          <div className="right-panel-empty-icon" style={{ marginBottom: 12 }}><MapPin size={32} color="var(--primary)" /></div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--on-bg)', marginBottom: 10 }}>Select a Location</div>
          <div className="right-panel-empty-text" style={{ fontSize: 13, color: 'var(--on-muted)', lineHeight: 1.5 }}>
            Click anywhere on the map to extract high-resolution thermal records and analyze UHI conditions in real time.
          </div>
        </div>
      </motion.aside>
    );
  }

  if (loading) {
    return (
      <motion.aside initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="right-panel glass-panel-heavy" style={{ padding: 24, display:'flex', flexDirection:'column', gap: 20 }}>
        <div className="skeleton" style={{ height: 40, width: '60%' }} />
        <div className="skeleton" style={{ height: 180, width: '100%' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 100, borderRadius: 12 }} />
        </div>
        <div className="skeleton" style={{ height: 140, width: '100%' }} />
        <div className="skeleton" style={{ height: 200, width: '100%' }} />
      </motion.aside>
    );
  }

  const env       = mlData?.environmental_data ?? analysis?.environmental_data;
  const ana       = analysis?.analysis;
  const uhi_flag  = mlData?.uhi_detected ?? ana?.uhi_detected;
  const heatColor = !env ? 'var(--primary)'
    : (mlData ? (mlData.uhi_detected ? 'var(--secondary)' : 'var(--tertiary)')
      : (ana?.heat_classification === 'High' ? 'var(--secondary)' : ana?.heat_classification === 'Medium' ? '#ff7722' : 'var(--tertiary)'));

  if (!env) {
    return (
      <motion.aside initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="right-panel glass-panel-heavy" key={`${pos?.lat}${pos?.lng}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="right-panel-empty" style={{ textAlign: 'center', padding: 20 }}>
          <div className="right-panel-empty-icon" style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
            <AlertTriangle size={32} color="#64748b" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--on-bg)', marginBottom: 10 }}>
            Analysis Failed
          </div>
          <div className="right-panel-empty-text" style={{ fontSize: 13, color: 'var(--on-muted)', lineHeight: 1.5 }}>
            The ML backend engine did not return valid environmental data. Please ensure the Python analytics server is running to process this location.
          </div>
        </div>
      </motion.aside>
    );
  }
  
  return (
    <motion.aside initial={{ x: 300, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="right-panel glass-panel-heavy" key={`${pos?.lat}${pos?.lng}`}>
      {/* ── Header ── */}
      <div className="panel-section">
        <div className="panel-section-header">
          <div className="glow-dot" style={{ background: heatColor, boxShadow: `0 0 8px ${heatColor}` }}/>
          Location Analysis
        </div>
        <div style={{ fontSize: 12, color: 'var(--on-muted)', fontFamily: 'var(--font-display)' }}>
          {pos?.lat?.toFixed(4)}°N · {Math.abs(pos?.lng)?.toFixed(4)}°W · 1km radius
          {uhi_flag &&
            <span style={{ marginLeft: 8, color: 'var(--secondary)', fontWeight: 700, fontSize: 10, letterSpacing: '1px', background: 'rgba(255, 59, 59, 0.1)', padding: '2px 6px', borderRadius: 12 }}>⚠ UHI DETECTED</span>}
        </div>
      </div>

      <MLInsightsPanel ml={mlData} loading={mlLoading}/>

      {/* ── Environmental Metrics ── */}
      <div className="panel-section">
        <div className="panel-section-header">Environmental Metrics</div>
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-label">Surface Temp</div>
            <div className="metric-card-value" style={{ color: heatColor, textShadow: `0 0 10px ${heatColor}55` }}>
              {env.lst_celsius.toFixed(1)}°
            </div>
            <div className="metric-card-sub">{ana?.heat_classification ?? (env.lst_celsius > 37 ? 'High' : env.lst_celsius > 30 ? 'Medium' : 'Low')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-label">Vegetation</div>
            <div className="metric-card-value" style={{ color: 'var(--tertiary)' }}>{env.ndvi.toFixed(2)}</div>
            <div className="metric-card-sub">{ana?.vegetation_level ?? (env.ndvi > 0.4 ? 'High' : env.ndvi > 0.2 ? 'Moderate' : 'Low')}</div>
            <ProgressBar pct={{ Low: 18, Moderate: 52, High: 82 }[ana?.vegetation_level] ?? Math.round((env.ndvi + 1) / 2 * 100)} color="var(--tertiary)"/>
          </div>
          <div className="metric-card">
            <div className="metric-card-label">Urban Density</div>
            <div className="metric-card-value" style={{ color: '#FFD700' }}>{env.ndbi.toFixed(2)}</div>
            <div className="metric-card-sub">{ana?.urban_density ?? (env.ndbi > 0.15 ? 'High' : env.ndbi > 0 ? 'Moderate' : 'Low')}</div>
            <ProgressBar pct={{ Low: 18, Moderate: 52, High: 82 }[ana?.urban_density] ?? Math.round((env.ndbi + 1) / 2 * 100)} color="#FFD700"/>
          </div>
        </div>

        {/* v2 extended metrics row — only shown when GEE returns them */}
        {(env.evi != null || env.elevation != null || env.ntl != null) && (
          <div className="metric-grid" style={{ marginTop: 8 }}>
            {env.evi != null && (
              <div className="metric-card">
                <div className="metric-card-label">EVI</div>
                <div className="metric-card-value" style={{ color: '#4ade80' }}>{env.evi.toFixed(2)}</div>
                <div className="metric-card-sub">{env.evi > 0.4 ? 'Dense' : env.evi > 0.2 ? 'Moderate' : 'Sparse'}</div>
                <ProgressBar pct={Math.round((env.evi + 1) / 2 * 100)} color="#4ade80" />
              </div>
            )}
            {env.elevation != null && (
              <div className="metric-card">
                <div className="metric-card-label">Elevation</div>
                <div className="metric-card-value" style={{ color: '#94a3b8', fontSize: 15 }}>{Math.round(env.elevation)}m</div>
                <div className="metric-card-sub">SRTM 30m</div>
              </div>
            )}
            {env.ntl != null && (
              <div className="metric-card">
                <div className="metric-card-label">Night Lights</div>
                <div className="metric-card-value" style={{ color: '#fbbf24', fontSize: 15 }}>{env.ntl.toFixed(1)}</div>
                <div className="metric-card-sub">{env.ntl > 20 ? 'High' : env.ntl > 5 ? 'Medium' : 'Low'} nW/cm²</div>
              </div>
            )}
          </div>
        )}
      </div>

      <EnvBarChart env={env}/>

      {/* ── UHI Causes ── */}
      {ana?.causes?.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-header">
            <div className="glow-dot" style={{ background: 'var(--secondary)', boxShadow: '0 0 6px var(--secondary)' }}/>
            <AlertTriangle size={12} style={{ color: 'var(--secondary)', flexShrink: 0 }}/>
            UHI Causes Detected
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ana.causes.map((c, i) => (
              <div key={c.id ?? i} className="cause-item" style={{ borderLeftColor:
                c.id === 'low_vegetation' ? 'var(--veg)' :
                c.id?.includes('buildup') ? '#FFD700' :
                c.id === 'heat_retention' ? 'var(--secondary)' : 'var(--primary)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-bg)', marginBottom: 4 }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--on-muted)', lineHeight: 1.5 }}>
                    {c.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recommendations ── */}
      {ana?.recommendations?.length > 0 && (
        <div className="panel-section">
          <div className="panel-section-header">
            <div className="glow-dot" style={{ background: 'var(--veg)', boxShadow: '0 0 6px var(--veg)' }}/>
            <CheckCircle2 size={12} style={{ color: 'var(--veg)', flexShrink: 0 }}/>
            Mitigation Recommendations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ana.recommendations.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: 'var(--bg-card)', borderRadius: 10, padding: '12px 12px',
                border: '1px solid var(--outline-light)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-lift)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >
                {/* Rank badge */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                  color: 'var(--veg)', marginTop: 1,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-bg)', marginBottom: 4 }}>
                    {r.action}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--on-muted)', lineHeight: 1.5, marginBottom: 6 }}>
                    {r.explanation}
                  </div>
                  {r.impact_celsius != null && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)',
                      borderRadius: 20, padding: '2px 8px',
                      fontSize: 10, fontWeight: 700, color: 'var(--veg)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      ↓ {r.impact_celsius.toFixed(1)}°C reduction
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {ana.estimated_reduction_celsius != null && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: 'rgba(0,242,255,0.05)', border: '1px solid rgba(0,242,255,0.2)',
              borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--on-muted)' }}>Total Cooling Potential</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--veg)', textShadow: 'var(--glow-veg)' }}>
                ↓ {ana.estimated_reduction_celsius.toFixed(1)}°C
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Simulation ── */}
      <div className="panel-section" style={{ marginBottom: 20 }}>
        <div className="panel-section-header">
          <div className="glow-dot" style={{ background: '#FFD700', boxShadow: '0 0 6px #FFD700' }}/>
          Impact Simulation
          {simLoading && <span className="loading-text" style={{ marginLeft: 8, fontSize: 9, color: 'var(--primary)' }}>COMPUTING…</span>}
        </div>

        {[
          { key: 'trees',    icon: <Trees size={16} />, label: 'Tree Coverage',    val: treePct,  set: setTreePct  },
          { key: 'cool_roof',icon: <Home size={16} />, label: 'Roof Reflectivity',val: roofPct,  set: setRoofPct  },
          { key: 'water',    icon: <Droplets size={16} />, label: 'Water Features',   val: waterPct, set: setWaterPct },
        ].map(s => (
          <div key={s.key} className="sim-slider-wrap">
            <div className="sim-slider-label">
              <span style={{ fontSize: 12, color: 'var(--on-bg)', fontWeight: 500 }}>{s.icon} {s.label}</span>
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>{s.val}%</span>
            </div>
            <input type="range" min="0" max="100" value={s.val} onChange={e => s.set(Number(e.target.value))}/>
          </div>
        ))}

        {simResult ? (
          <>
            <div className="sim-result">
              <div className="sim-result-row">
                <span>Baseline LST</span>
                <span className="sim-result-val" style={{ color: heatColor }}>{simResult.current_temp.toFixed(1)}°C</span>
              </div>
              <div className="sim-result-row">
                <span>Projected Post-Intervention</span>
                <span className="sim-result-val" style={{ color: 'var(--tertiary)' }}>{simResult.predicted_temp.toFixed(1)}°C</span>
              </div>
              {simResult.breakdown?.map((b, i) => (
                <div key={i} className="sim-result-row" style={{ fontSize: 11, color: 'var(--on-muted)', border: 'none', paddingBottom: 2 }}>
                  <span>{b.label} Effect</span>
                  <span style={{ color: 'var(--tertiary)' }}>↓ {b.reduction.toFixed(1)}°C (@ {b.intensity}%)</span>
                </div>
              ))}
              <div className="sim-result-row" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--outline-light)' }}>
                <span style={{ fontWeight: 600, color: 'var(--on-bg)' }}>Gross Reduction</span>
                <span className="sim-delta" key={`${treePct}-${roofPct}-${waterPct}`}>↓ {simResult.reduction.toFixed(1)}°C</span>
              </div>
            </div>
            <SimTrendChart currentTemp={env.lst_celsius} simData={simResult}/>
          </>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--on-muted)', padding: '12px 0', textAlign: 'center' }}>
            Adjust intensities above to preview cooling models
          </div>
        )}
      </div>
    </motion.aside>
  );
}
