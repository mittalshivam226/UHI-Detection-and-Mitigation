import React, { useState, useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTip,
  LineChart, Line, ResponsiveContainer, Cell,
} from 'recharts';
import './index.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API = 'http://localhost:8001';

// Default hotspots shown before the first API call
const DEFAULT_HOTSPOTS = [
  { lat: 40.758, lng: -73.985, temp: 41.2, name: 'Midtown West' },
  { lat: 40.730, lng: -73.990, temp: 38.8, name: 'Chelsea' },
  { lat: 40.712, lng: -74.005, temp: 37.1, name: 'Downtown' },
  { lat: 40.778, lng: -73.967, temp: 39.4, name: 'Upper West Side' },
  { lat: 40.749, lng: -73.975, temp: 40.0, name: 'Koreatown' },
];

const LAYERS_CONFIG = [
  { id: 'heat',    label: 'Heat Map',      color: '#FF3B3B', gradient: 'linear-gradient(to right,#1a0000,#ff7722,#ff3b3b)' },
  { id: 'veg',     label: 'Vegetation',    color: '#00e676', gradient: 'linear-gradient(to right,#001a0a,#00c853,#69f0ae)' },
  { id: 'density', label: 'Urban Density', color: '#FFD700', gradient: 'linear-gradient(to right,#1a1500,#ffd700,#fff176)' },
];

// ─── Icons ──────────────────────────────────────────────────────────────────
const SearchIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const SettingsIcon= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const InfoIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const ExportIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:14,height:14}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const XIcon       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width:12,height:12}}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// ─── Reusables ───────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <div className="toggle-track"><div className="toggle-thumb"/></div>
    </label>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-fill" style={{width:`${pct}%`,background:color,boxShadow:`0 0 6px ${color}`}}/>
    </div>
  );
}

// ─── Nominatim search hook ────────────────────────────────────────────────────
function useGeocoder(onResult) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        setResults(await r.json());
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }, []);

  const pick = useCallback((item) => {
    setQuery(item.display_name.split(',')[0]);
    setResults([]);
    onResult(parseFloat(item.lat), parseFloat(item.lon), item.display_name.split(',')[0]);
  }, [onResult]);

  const clear = useCallback(() => { setQuery(''); setResults([]); }, []);

  return { query, results, searching, search, pick, clear };
}

// ─── Leaflet Map ─────────────────────────────────────────────────────────────
function UHIMap({ onMapClick, layers, selectedPos, flyTo, hotspots }) {
  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const clickMarkerRef   = useRef(null);
  const hotspotLayersRef = useRef([]);

  // init map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center:[40.74,-73.99], zoom:13, zoomControl:false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains:'abcd', maxZoom:20 }).addTo(map);
    map.on('click', e => onMapClick(e.latlng.lat, e.latlng.lng));
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fly-to from search
  useEffect(() => {
    if (flyTo && mapInstanceRef.current)
      mapInstanceRef.current.flyTo([flyTo.lat, flyTo.lng], 13, { duration: 1.2 });
  }, [flyTo]);

  // hotspot circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    hotspotLayersRef.current.forEach(l => l.remove());
    hotspotLayersRef.current = [];
    if (layers.heat) {
      hotspots.forEach(h => {
        const color = h.temp > 40 ? '#FF3B3B' : h.temp > 36 ? '#ff7722' : '#FFD700';
        const c = L.circle([h.lat, h.lng || h.lon], {radius:450,color:'transparent',fillColor:color,fillOpacity:0.38}).addTo(map);
        c.bindTooltip(`<b>${h.name}</b><br>🌡️ ${h.temp}°C`);
        hotspotLayersRef.current.push(c);
        const o = L.circle([h.lat, h.lng || h.lon], {radius:700,color,fillColor:color,fillOpacity:0.08,weight:1}).addTo(map);
        hotspotLayersRef.current.push(o);
      });
    }
    if (layers.veg) {
      [{lat:40.785,lng:-73.965},{lat:40.764,lng:-73.973}].forEach(g => {
        hotspotLayersRef.current.push(
          L.circle([g.lat,g.lng],{radius:350,color:'transparent',fillColor:'#00c853',fillOpacity:0.22}).addTo(map)
        );
      });
    }
  }, [layers]);

  // selected-pos marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (clickMarkerRef.current) { clickMarkerRef.current.remove(); clickMarkerRef.current = null; }
    if (selectedPos) {
      clickMarkerRef.current = L.circleMarker([selectedPos.lat,selectedPos.lng],
        {radius:8,color:'#00F2FF',fillColor:'#00F2FF',fillOpacity:0.9,weight:2}).addTo(map);
    }
  }, [selectedPos]);

  return <div ref={mapRef} className="map-container"/>;
}

// ─── Mini charts ─────────────────────────────────────────────────────────────
const ChartTooltipStyle = {
  contentStyle: { background:'#18202e', border:'1px solid rgba(0,242,255,0.2)', borderRadius:8, fontSize:11 },
  labelStyle:   { color:'#8892a4' },
  itemStyle:    { color:'#dae3f6' },
};

function EnvBarChart({ env }) {
  const data = [
    { name:'LST (°C)',   value: parseFloat(env.lst_celsius.toFixed(1)), fill:'#FF3B3B', max:60 },
    { name:'NDVI',       value: parseFloat(((env.ndvi + 1) / 2 * 100).toFixed(1)), fill:'#00e676', max:100 },
    { name:'NDBI',       value: parseFloat(((env.ndbi + 1) / 2 * 100).toFixed(1)), fill:'#FFD700', max:100 },
  ];
  return (
    <div className="panel-section">
      <div className="panel-section-header">
        <div className="glow-dot" style={{background:'#00F2FF',boxShadow:'0 0 6px #00F2FF'}}/>
        Index Comparison
      </div>
      <div style={{fontSize:10,color:'var(--on-muted)',marginBottom:10}}>Values normalised 0–100%</div>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart data={data} barSize={22} margin={{top:0,right:0,bottom:0,left:-20}}>
          <XAxis dataKey="name" tick={{fill:'#8892a4',fontSize:10}} axisLine={false} tickLine={false}/>
          <YAxis domain={[0,100]} tick={{fill:'#8892a4',fontSize:9}} axisLine={false} tickLine={false}/>
          <RechartsTip {...ChartTooltipStyle} formatter={v=>[`${v}%`]}/>
          <Bar dataKey="value" radius={[4,4,0,0]}>
            {data.map((e,i)=><Cell key={i} fill={e.fill} fillOpacity={0.8}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimTrendChart({ currentTemp, simData }) {
  if (!simData) return null;
  const treeSteps = [0,25,50,75,100].map(pct => {
    const drop = (pct/100) * 3.0;
    return { pct:`${pct}%`, temp: parseFloat((currentTemp - drop).toFixed(1)) };
  });
  return (
    <div style={{marginTop:14}}>
      <div style={{fontSize:10,color:'var(--on-muted)',marginBottom:8,letterSpacing:'1px',textTransform:'uppercase'}}>
        Projected Temp vs Tree Coverage
      </div>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={treeSteps} margin={{top:0,right:4,bottom:0,left:-22}}>
          <XAxis dataKey="pct" tick={{fill:'#8892a4',fontSize:9}} axisLine={false} tickLine={false}/>
          <YAxis domain={['auto','auto']} tick={{fill:'#8892a4',fontSize:9}} axisLine={false} tickLine={false}/>
          <RechartsTip {...ChartTooltipStyle} formatter={v=>[`${v}°C`]}/>
          <Line type="monotone" dataKey="temp" stroke="#00e676" strokeWidth={2} dot={{fill:'#00e676',r:3}} activeDot={{r:5}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Left Sidebar ─────────────────────────────────────────────────────────────
function LeftSidebar({ layers, setLayers, hotspots, hotspotsLoading }) {
  const toggle = id => setLayers(p => ({...p,[id]:!p[id]}));
  const avgTemp = hotspots.length ? (hotspots.reduce((s,h)=>s+h.temp,0)/hotspots.length).toFixed(1) : '--';
  return (
    <aside className="left-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-title">Layer Controls</div>
        {LAYERS_CONFIG.map(l => (
          <div key={l.id} className="layer-item">
            <div className="layer-header">
              <div className="layer-label">
                <div className="layer-dot" style={{background:l.color,boxShadow:`0 0 8px ${l.color}`}}/>
                <span style={{fontSize:13}}>{l.label}</span>
              </div>
              <Toggle checked={layers[l.id]} onChange={()=>toggle(l.id)}/>
            </div>
            <div className="legend-bar" style={{background:l.gradient}}/>
          </div>
        ))}
      </div>

      <div className="sidebar-section" style={{flex:1,overflow:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div className="sidebar-section-title">Active Hotspots</div>
          {hotspotsLoading && <div style={{fontSize:10,color:'#00F2FF',letterSpacing:'1px'}}>SCANNING…</div>}
        </div>
        {hotspots.map((h,i) => (
          <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <div>
              <div style={{fontSize:12,fontWeight:500}}>{h.name}</div>
              <div style={{fontSize:10,color:'var(--on-muted)',marginTop:2}}>{h.lat.toFixed(3)}° N</div>
            </div>
            <div style={{fontFamily:'var(--font-display)',fontSize:14,fontWeight:700,color:h.temp>40?'var(--secondary)':h.temp>36?'#ff7722':'#FFD700'}}>
              {h.temp}°C
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-title">City Status</div>
        <div className="stats-grid">
          <div className="stat-mini"><div className="stat-mini-label">Coverage</div><div className="stat-mini-value">Regional</div></div>
          <div className="stat-mini"><div className="stat-mini-label">Avg LST</div><div className="stat-mini-value" style={{color:'#ff7722'}}>{avgTemp}°</div></div>
          <div className="stat-mini"><div className="stat-mini-label">Hotspots</div><div className="stat-mini-value" style={{color:'var(--secondary)'}}>{hotspots.length}</div></div>
        </div>
      </div>
    </aside>
  );
}

// ─── Right Analysis Panel ─────────────────────────────────────────────────────
function RightPanel({ analysis, loading, pos }) {
  const [treePct,  setTreePct]  = useState(30);
  const [roofPct,  setRoofPct]  = useState(20);
  const [waterPct, setWaterPct] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // call /api/simulate whenever sliders or temp change
  const currentTemp = analysis?.environmental_data?.lst_celsius;
  useEffect(() => {
    if (!currentTemp) return;
    const actions = [];
    const intensities = {};
    if (treePct  > 0) { actions.push('trees');    intensities.trees    = treePct;  }
    if (roofPct  > 0) { actions.push('cool_roof'); intensities.cool_roof = roofPct; }
    if (waterPct > 0) { actions.push('water');     intensities.water    = waterPct; }
    if (actions.length === 0) { setSimResult(null); return; }

    const timer = setTimeout(async () => {
      setSimLoading(true);
      try {
        const r = await fetch(`${API}/api/simulate`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ current_temp: currentTemp, actions, intensities }),
        });
        if (r.ok) { setSimResult(await r.json()); return; }
      } catch { /* fall through to local fallback */ }
      // always-working local fallback
      const impacts = {trees:2.5,cool_roof:2.0,water:1.5,green_roof:2.0};
      let drop = 0;
      const breakdown = actions.map(a => {
        const red = ((intensities[a]||100)/100)*(impacts[a]||1.5);
        drop += red;
        return {action:a,label:a,reduction:parseFloat(red.toFixed(2)),intensity:intensities[a]||100};
      });
      setSimResult({ current_temp:currentTemp, predicted_temp: parseFloat(Math.max(currentTemp-drop,15).toFixed(1)), reduction:parseFloat(drop.toFixed(2)), breakdown });
      setSimLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [treePct, roofPct, waterPct, currentTemp]);


  // reset sim when location changes
  useEffect(() => { setTreePct(30); setRoofPct(20); setWaterPct(0); setSimResult(null); }, [pos]);

  if (!pos && !loading && !analysis) {
    return (
      <aside className="right-panel">
        <div className="right-panel-empty">
          <div className="right-panel-empty-icon">🛰️</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:16,fontWeight:600,color:'var(--on-bg)',marginBottom:10}}>Select a Location</div>
          <div className="right-panel-empty-text">Click anywhere on the map to extract satellite thermal data and analyze UHI conditions in real time.</div>
        </div>
      </aside>
    );
  }

  if (loading) {
    return (
      <aside className="right-panel">
        <div className="loading-overlay" style={{flex:1}}>
          <div className="spinner"/>
          <div className="loading-text">Querying Earth Engine...</div>
          <div style={{fontSize:11,color:'var(--on-muted)',marginTop:4}}>Fetching LST · NDVI · NDBI</div>
        </div>
      </aside>
    );
  }

  if (!analysis) return null;

  const { environmental_data: env, analysis: ana } = analysis;
  const heatColor = ana.heat_classification==='High'?'#FF3B3B':ana.heat_classification==='Medium'?'#ff7722':'#00e676';
  const vegPct  = {Low:18,Moderate:52,High:82}[ana.vegetation_level]??18;
  const denPct  = {Low:18,Moderate:52,High:82}[ana.urban_density]??60;
  const recoIcons = {vegetation:'🌳',infrastructure:'🏠',water:'💧',mixed:'💧',monitoring:'📊'};

  return (
    <aside className="right-panel" key={`${pos?.lat}${pos?.lng}`}>
      {/* ── Header ── */}
      <div className="panel-section">
        <div className="panel-section-header"><div className="glow-dot"/>Location Analysis</div>
        <div style={{fontSize:11,color:'var(--on-muted)',fontFamily:'var(--font-display)'}}>
          {pos?.lat?.toFixed(4)}°N · {Math.abs(pos?.lng)?.toFixed(4)}° · 1km radius
          {analysis?.analysis?.uhi_detected &&
            <span style={{marginLeft:8,color:'#FF3B3B',fontWeight:700,fontSize:10,letterSpacing:'1px'}}>⚠ UHI DETECTED</span>}
        </div>
      </div>

      {/* ── Environmental Metrics ── */}
      <div className="panel-section">
        <div className="panel-section-header">Environmental Metrics</div>
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-label">Surface Temp</div>
            <div className="metric-card-value" style={{color:heatColor,textShadow:`0 0 10px ${heatColor}`}}>
              {env.lst_celsius.toFixed(1)}°
            </div>
            <div className="metric-card-sub">{ana.heat_classification}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-label">Vegetation</div>
            <div className="metric-card-value" style={{color:'#00e676'}}>{env.ndvi.toFixed(2)}</div>
            <div className="metric-card-sub">{ana.vegetation_level}</div>
            <ProgressBar pct={vegPct} color="#00e676"/>
          </div>
          <div className="metric-card">
            <div className="metric-card-label">Built-Up</div>
            <div className="metric-card-value" style={{color:'#FFD700'}}>{env.ndbi.toFixed(2)}</div>
            <div className="metric-card-sub">{ana.urban_density}</div>
            <ProgressBar pct={denPct} color="#FFD700"/>
          </div>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <EnvBarChart env={env}/>

      {/* ── Cause Detection ── */}
      <div className="panel-section">
        <div className="panel-section-header">
          <div className="glow-dot" style={{background:'#FF3B3B',boxShadow:'0 0 6px #FF3B3B'}}/>
          Cause Detection
        </div>
        {ana.causes.map((c,i) => (
          <div key={i} className="cause-item" style={{borderLeftColor:c.id==='low_vegetation'?'#00e676':c.id==='high_buildup'?'#FFD700':'#FF3B3B'}}>
            <span className="cause-icon">{c.icon}</span>
            <div>
              <div style={{fontSize:12,fontWeight:500}}>{c.label}</div>
              <div style={{fontSize:10,color:'var(--on-muted)',marginTop:2,lineHeight:1.4}}>{c.description.slice(0,80)}…</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recommendations ── */}
      <div className="panel-section">
        <div className="panel-section-header">
          <div className="glow-dot" style={{background:'#00e676',boxShadow:'0 0 6px #00e676'}}/>
          Smart Recommendations
        </div>
        {ana.recommendations.map((r,i) => (
          <div key={i} className="reco-card">
            <div className="reco-icon">{recoIcons[r.type]||'🔧'}</div>
            <div>
              <div className="reco-title">{r.action}</div>
              <div style={{fontSize:10,color:'var(--on-muted)',marginTop:2,lineHeight:1.4}}>{r.explanation?.slice(0,70)}…</div>
              <div className="reco-impact">↓ Est. {r.impact_celsius}°C</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Simulation ── */}
      <div className="panel-section" style={{marginBottom:20}}>
        <div className="panel-section-header">
          <div className="glow-dot" style={{background:'#FFD700',boxShadow:'0 0 6px #FFD700'}}/>
          Impact Simulation
          {simLoading && <span style={{marginLeft:8,fontSize:9,color:'var(--primary)',animation:'none'}}>● computing…</span>}
        </div>

        {[
          {key:'trees',    icon:'🌳', label:'Tree Coverage',    val:treePct,  set:setTreePct  },
          {key:'cool_roof',icon:'🏠', label:'Roof Reflectivity',val:roofPct,  set:setRoofPct  },
          {key:'water',    icon:'💧', label:'Water Features',   val:waterPct, set:setWaterPct },
        ].map(s => (
          <div key={s.key} className="sim-slider-wrap">
            <div className="sim-slider-label">
              <span style={{fontSize:12,color:'var(--on-muted)'}}>{s.icon} {s.label}</span>
              <span>{s.val}%</span>
            </div>
            <input type="range" min="0" max="100" value={s.val} onChange={e=>s.set(Number(e.target.value))}/>
          </div>
        ))}

        {simResult ? (
          <>
            <div className="sim-result">
              <div className="sim-result-row">
                <span>Current Temp</span>
                <span className="sim-result-val" style={{color:heatColor}}>{simResult.current_temp.toFixed(1)}°C</span>
              </div>
              <div className="sim-result-row">
                <span>Projected Temp</span>
                <span className="sim-result-val">{simResult.predicted_temp.toFixed(1)}°C</span>
              </div>
              {simResult.breakdown?.map((b,i)=>(
                <div key={i} className="sim-result-row" style={{fontSize:10,color:'var(--on-muted)'}}>
                  <span>{b.label}</span>
                  <span style={{color:'#00e676'}}>↓{b.reduction.toFixed(1)}°C @ {b.intensity}%</span>
                </div>
              ))}
              <div className="sim-result-row" style={{marginTop:10,paddingTop:10,borderTop:'1px solid rgba(0,242,255,0.1)'}}>
                <span style={{fontWeight:600}}>Total Drop</span>
                <span className="sim-delta" key={`${treePct}-${roofPct}-${waterPct}`}>↓ {simResult.reduction.toFixed(1)}°C</span>
              </div>
            </div>
            <SimTrendChart currentTemp={env.lst_celsius} simData={simResult}/>
          </>
        ) : (
          <div style={{fontSize:11,color:'var(--on-muted)',padding:'12px 0',textAlign:'center'}}>
            Adjust sliders to simulate temperature reduction
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [analysis,         setAnalysis]         = useState(null);
  const [loading,          setLoading]           = useState(false);
  const [pos,              setPos]               = useState(null);
  const [layers,           setLayers]            = useState({heat:true,veg:false,density:false});
  const [flyTo,            setFlyTo]             = useState(null);
  const [hotspots,         setHotspots]          = useState(DEFAULT_HOTSPOTS);
  const [hotspotsLoading,  setHotspotsLoading]   = useState(false);

  // Fetch real GEE hotspots centred on the given coordinate
  const fetchHotspots = useCallback(async (lat, lng) => {
    setHotspotsLoading(true);
    try {
      const r = await fetch(`${API}/api/hotspots?lat=${lat}&lon=${lng}&radius_km=12&top_n=8`);
      if (r.ok) setHotspots(await r.json());
    } catch { /* keep previous hotspots on error */ }
    finally { setHotspotsLoading(false); }
  }, []);

  const handleMapClick = useCallback(async (lat, lng) => {
    setPos({lat, lng});
    setLoading(true);
    setAnalysis(null);
    // kick off both in parallel
    fetchHotspots(lat, lng);
    try {
      const r = await fetch(`${API}/api/analyze-location`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({lat, lon:lng, radius_m:1000}),
      });
      if (!r.ok) throw new Error(`API ${r.status}`);
      setAnalysis(await r.json());
    } catch {
      const lst = 34 + Math.random() * 8;
      setAnalysis({
        coordinates:{lat,lon:lng},
        environmental_data:{lst_celsius:lst,ndvi:0.12+Math.random()*0.15,ndbi:0.18+Math.random()*0.18},
        analysis:{
          heat_classification: lst>38?'High':lst>32?'Medium':'Low',
          vegetation_level:'Low', urban_density:'High', uhi_detected:true,
          causes:[
            {id:'low_vegetation',label:'Low Vegetation Coverage',icon:'🌿',description:'Sparse vegetation detected. Urban areas with little canopy absorb more solar radiation.'},
            {id:'high_buildup',label:'High Built-Up Density',icon:'🏙️',description:'Dense concrete and asphalt create a thermal mass that retains heat.'},
            {id:'heat_retention',label:'Heat Retention Surfaces',icon:'🌡️',description:'Dark materials strongly absorb solar radiation and re-emit it as infrared.'},
          ],
          recommendations:[
            {action:'Increase Urban Tree Cover',explanation:'Planting trees reduces surface temperatures by 2–4°C through shade and evapotranspiration.',impact_celsius:3.0,type:'vegetation'},
            {action:'Install Cool / Reflective Roofing',explanation:'High-albedo coatings reflect up to 80% of incoming solar radiation.',impact_celsius:4.0,type:'infrastructure'},
            {action:'Introduce Water Features',explanation:'Fountains and ponds cool the local environment via evaporative effect.',impact_celsius:2.0,type:'water'},
          ],
          estimated_reduction_celsius:9.0,
        },
      });
    } finally { setLoading(false); }
  }, [fetchHotspots]);

  const geocoder = useGeocoder((lat, lng, name) => {
    setFlyTo({lat, lng});
    handleMapClick(lat, lng);
  });

  return (
    <div className="app-layout">
      {/* ── Top Bar ── */}
      <header className="top-bar">
        <div className="top-bar-logo">UHIS <span>Urban Heat Intelligence System</span></div>

        <div className="top-bar-search">
          <span className="top-bar-search-icon"><SearchIcon/></span>
          <input
            type="text"
            placeholder="Search city or region..."
            value={geocoder.query}
            onChange={e => geocoder.search(e.target.value)}
            onKeyDown={e => { if(e.key==='Escape') geocoder.clear(); }}
          />
          {geocoder.query && (
            <button onClick={geocoder.clear} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--on-muted)',cursor:'pointer',display:'flex',alignItems:'center'}}>
              <XIcon/>
            </button>
          )}
          {/* ── Dropdown ── */}
          {geocoder.results.length > 0 && (
            <div style={{
              position:'absolute',top:'calc(100% + 6px)',left:0,right:0,
              background:'#18202e',border:'1px solid rgba(0,242,255,0.2)',
              borderRadius:8,zIndex:9999,overflow:'hidden',
              boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
            }}>
              {geocoder.results.map((item,i) => (
                <div key={i} onClick={()=>geocoder.pick(item)} style={{
                  padding:'10px 14px',fontSize:12,cursor:'pointer',
                  borderBottom:i<geocoder.results.length-1?'1px solid rgba(255,255,255,0.04)':'none',
                  display:'flex',alignItems:'center',gap:8,
                  transition:'background 0.15s',
                }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,242,255,0.06)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <span style={{fontSize:14}}>📍</span>
                  <div>
                    <div style={{fontWeight:500,color:'var(--on-bg)'}}>{item.display_name.split(',')[0]}</div>
                    <div style={{fontSize:10,color:'var(--on-muted)',marginTop:1}}>{item.display_name.split(',').slice(1,3).join(',').trim()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {geocoder.searching && (
            <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,right:0,background:'#18202e',border:'1px solid rgba(0,242,255,0.2)',borderRadius:8,padding:'12px 14px',fontSize:12,color:'var(--on-muted)'}}>
              Searching…
            </div>
          )}
        </div>

        <div className="top-bar-coords">
          {pos ? `${pos.lat.toFixed(4)}° N  ·  ${Math.abs(pos.lng).toFixed(4)}° ${pos.lng<0?'W':'E'}` : 'Click map to select location'}
        </div>
        <div className="top-bar-actions">
          <button className="icon-btn" title="Settings"><SettingsIcon/></button>
          <button className="icon-btn" title="Info"><InfoIcon/></button>
          <button className="icon-btn" title="Export"><ExportIcon/></button>
        </div>
      </header>

      <LeftSidebar layers={layers} setLayers={setLayers} hotspots={hotspots} hotspotsLoading={hotspotsLoading}/>

      <div className="map-area">
        <UHIMap onMapClick={handleMapClick} layers={layers} selectedPos={pos} flyTo={flyTo} hotspots={hotspots}/>
      </div>

      <RightPanel analysis={analysis} loading={loading} pos={pos}/>
    </div>
  );
}
