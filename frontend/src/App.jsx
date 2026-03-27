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

const API = 'http://localhost:8002';
const ML_API = `${API}/ml`;
const LEGACY_API = `${API}/api`;

// Default hotspots shown before the first API call
const DEFAULT_HOTSPOTS = [
  { lat: 40.758, lng: -73.985, temp: 41.2, name: 'Midtown West' },
  { lat: 40.730, lng: -73.990, temp: 38.8, name: 'Chelsea' },
  { lat: 40.712, lng: -74.005, temp: 37.1, name: 'Downtown' },
  { lat: 40.778, lng: -73.967, temp: 39.4, name: 'Upper West Side' },
  { lat: 40.749, lng: -73.975, temp: 40.0, name: 'Koreatown' },
];

const LAYERS_CONFIG = [
  {
    id: 'heat', label: 'Heat Map', color: '#ff4000',
    // thermal: blue → cyan → green → yellow → orange → red
    gradient: 'linear-gradient(to right,#040080,#0000cd,#0080ff,#00d0ff,#00ffb0,#80ff00,#ffff00,#ffa000,#ff4000,#cc0000)',
  },
  {
    id: 'veg', label: 'Vegetation', color: '#3a9820',
    // NDVI: brown (bare) → yellow-green (sparse) → dark green (dense vegetation)
    gradient: 'linear-gradient(to right,#8b4513,#c8a060,#e8d080,#f5f5a0,#b8e060,#78c830,#3a9820,#1a6810,#004000)',
  },
  {
    id: 'density', label: 'Urban Density', color: '#cc8000',
    // NDBI: dark blue (water/veg) → tan (bare) → orange/amber (dense urban)
    gradient: 'linear-gradient(to right,#001060,#0040a0,#2080d0,#80c0e0,#e0e0a0,#d0b050,#cc8000,#c04000,#a00000,#ffff80)',
  },
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
function UHIMap({ onMapClick, layers, selectedPos, flyTo, hotspots, tileLayers }) {
  const mapRef           = useRef(null);
  const mapInstanceRef   = useRef(null);
  const clickMarkerRef   = useRef(null);
  const hotspotLayersRef = useRef([]);
  const tileLayersRef    = useRef({});  // { 'heat': L.TileLayer, 'veg': L.TileLayer, ... }

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

  // satellite tile layers from GEE
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // For each configured layer, add/remove based on tileLayers prop
    const LAYER_KEY_MAP = { heat: 'lst', veg: 'ndvi', density: 'ndbi' };
    Object.entries(LAYER_KEY_MAP).forEach(([toggle, geeKey]) => {
      const tileUrl = tileLayers?.[toggle];
      if (tileUrl && !tileLayersRef.current[toggle]) {
        const tl = L.tileLayer(tileUrl, { opacity: 0.65, attribution: '© Google Earth Engine' });
        tl.addTo(map);
        tileLayersRef.current[toggle] = tl;
      } else if (!tileUrl && tileLayersRef.current[toggle]) {
        tileLayersRef.current[toggle].remove();
        delete tileLayersRef.current[toggle];
      }
    });
  }, [tileLayers]);

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

// ─── ML Insights Panel ───────────────────────────────────────────────────────
function MLInsightsPanel({ ml }) {
  if (!ml) return null;
  const prob   = ml.uhi_probability ?? 0;
  const score  = ml.uhi_score ?? 0;
  const conf   = ml.model_confidence ?? 'medium';
  const confColor = conf === 'high' ? '#00e676' : conf === 'medium' ? '#FFD700' : '#ff7722';
  const probColor = prob > 0.7 ? '#FF3B3B' : prob > 0.4 ? '#ff7722' : '#00e676';
  const scoreColor = score > 0.7 ? '#FF3B3B' : score > 0.4 ? '#ff7722' : '#00e676';

  return (
    <div className="panel-section" style={{background:'rgba(0,242,255,0.03)',border:'1px solid rgba(0,242,255,0.12)',borderRadius:10,padding:'14px 16px',marginBottom:12}}>
      <div className="panel-section-header" style={{marginBottom:12}}>
        <div className="glow-dot" style={{background:'#a78bfa',boxShadow:'0 0 6px #a78bfa'}}/>
        ML Intelligence
        <span style={{marginLeft:'auto',fontSize:9,letterSpacing:'1.5px',color:confColor,fontWeight:700,background:`${confColor}18`,padding:'2px 8px',borderRadius:20,border:`1px solid ${confColor}44`}}>
          {conf.toUpperCase()} CONFIDENCE
        </span>
      </div>

      {/* UHI Probability */}
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--on-muted)',marginBottom:5}}>
          <span>UHI Probability</span>
          <span style={{color:probColor,fontWeight:700,fontSize:12}}>{(prob*100).toFixed(1)}%</span>
        </div>
        <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${prob*100}%`,background:`linear-gradient(to right,#00e676,${probColor})`,borderRadius:4,transition:'width 0.6s ease',boxShadow:`0 0 8px ${probColor}66`}}/>
        </div>
      </div>

      {/* UHI Score */}
      <div style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--on-muted)',marginBottom:5}}>
          <span>UHI Severity Score</span>
          <span style={{color:scoreColor,fontWeight:700,fontSize:12}}>{(score*100).toFixed(0)}/100</span>
        </div>
        <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${score*100}%`,background:`linear-gradient(to right,#4ade80,${scoreColor})`,borderRadius:4,transition:'width 0.6s ease',boxShadow:`0 0 8px ${scoreColor}66`}}/>
        </div>
      </div>

      {/* Predicted vs Actual Temp */}
      {ml.predicted_temperature != null && ml.environmental_data?.lst_celsius != null && (
        <div style={{display:'flex',gap:8,marginBottom:4}}>
          <div style={{flex:1,background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--on-muted)',letterSpacing:'1px',marginBottom:3}}>ACTUAL LST</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'#FF3B3B'}}>{ml.environmental_data.lst_celsius.toFixed(1)}°</div>
            <div style={{fontSize:9,color:'var(--on-muted)'}}>Landsat 8/9</div>
          </div>
          <div style={{display:'flex',alignItems:'center',color:'var(--on-muted)',fontSize:10}}>→</div>
          <div style={{flex:1,background:'rgba(167,139,250,0.06)',borderRadius:8,padding:'8px 10px',textAlign:'center',border:'1px solid rgba(167,139,250,0.15)'}}>
            <div style={{fontSize:9,color:'#a78bfa',letterSpacing:'1px',marginBottom:3}}>ML PREDICTED</div>
            <div style={{fontFamily:'var(--font-display)',fontSize:18,fontWeight:700,color:'#a78bfa'}}>{ml.predicted_temperature.toFixed(1)}°</div>
            <div style={{fontSize:9,color:'var(--on-muted)'}}>RF Regressor</div>
          </div>
        </div>
      )}

      {/* Feature importance mini bars */}
      {ml.feature_importance && (
        <div style={{marginTop:10}}>
          <div style={{fontSize:9,color:'var(--on-muted)',letterSpacing:'1px',marginBottom:6}}>FEATURE IMPORTANCE (CLASSIFIER)</div>
          {Object.entries(ml.feature_importance).sort((a,b)=>b[1]-a[1]).map(([feat,imp])=>(
            <div key={feat} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:9,color:'var(--on-muted)',width:30,textAlign:'right'}}>{feat.toUpperCase()}</span>
              <div style={{flex:1,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2}}>
                <div style={{height:'100%',width:`${imp*100}%`,background:'#a78bfa',borderRadius:2}}/>
              </div>
              <span style={{fontSize:9,color:'#a78bfa',width:30}}>{(imp*100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SimTrendChart({ currentTemp, simData }) {
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

// ─── Left Sidebar ─────────────────────────────────────────────────────
const LAYER_GEE_ID = { heat: 'lst', veg: 'ndvi', density: 'ndbi' };

function LeftSidebar({ layers, onLayerToggle, tileMeta, tileLoading, hotspots, hotspotsLoading }) {
  const avgTemp = hotspots.length ? (hotspots.reduce((s,h)=>s+h.temp,0)/hotspots.length).toFixed(1) : '--';
  return (
    <aside className="left-sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-title">Layer Controls</div>
        {LAYERS_CONFIG.map(l => {
          const meta = tileMeta[l.id];
          const loading = tileLoading[l.id];
          const active  = layers[l.id];
          return (
            <div key={l.id} className="layer-item">
              <div className="layer-header">
                <div className="layer-label">
                  <div className="layer-dot" style={{background:l.color,boxShadow:`0 0 8px ${l.color}`}}/>
                  <span style={{fontSize:13}}>{l.label}</span>
                  {loading && <span style={{fontSize:9,color:l.color,marginLeft:6,opacity:0.8}}>↻</span>}
                </div>
                <Toggle checked={active} onChange={() => onLayerToggle(l.id)}/>
              </div>

              {/* Live palette legend when active and meta is loaded */}
              {active && meta ? (
                <div style={{marginTop:6}}>
                  <div style={{height:6,borderRadius:3,background:`linear-gradient(to right,${meta.palette.join(',')})`,marginBottom:4}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:'var(--on-muted)'}}>
                    <span>{meta.min}{meta.unit}</span>
                    <span style={{fontSize:9,color:l.color,letterSpacing:'0.5px'}}>GEE LIVE</span>
                    <span>{meta.max}{meta.unit}</span>
                  </div>
                </div>
              ) : (
                <div className="legend-bar" style={{background: active ? l.gradient : 'rgba(255,255,255,0.04)', opacity: active ? 1 : 0.3}}/>
              )}
            </div>
          );
        })}
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
function RightPanel({ analysis, mlData, loading, pos }) {
  const [treePct,  setTreePct]  = useState(30);
  const [roofPct,  setRoofPct]  = useState(20);
  const [waterPct, setWaterPct] = useState(0);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // call /ml/simulate (falls back to /api/simulate) whenever sliders or temp change
  const currentTemp = mlData?.environmental_data?.lst_celsius
    ?? analysis?.environmental_data?.lst_celsius;
  const currentNdvi = mlData?.environmental_data?.ndvi
    ?? analysis?.environmental_data?.ndvi;
  const currentNdbi = mlData?.environmental_data?.ndbi
    ?? analysis?.environmental_data?.ndbi;

  useEffect(() => {
    if (!currentTemp) return;
    const actions = [];
    const intensities = {};
    if (treePct  > 0) { actions.push('trees');    intensities.trees     = treePct;  }
    if (roofPct  > 0) { actions.push('cool_roof'); intensities.cool_roof = roofPct; }
    if (waterPct > 0) { actions.push('water');     intensities.water     = waterPct; }
    if (actions.length === 0) { setSimResult(null); return; }

    const timer = setTimeout(async () => {
      setSimLoading(true);
      try {
        // Try ML simulate first
        if (currentNdvi != null && currentNdbi != null) {
          const r = await fetch(`${ML_API}/simulate`, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ ndvi: currentNdvi, ndbi: currentNdbi, actions }),
          });
          if (r.ok) {
            const d = await r.json();
            // Normalise to the shape the UI expects
            setSimResult({
              current_temp:   d.original_temperature,
              predicted_temp: d.new_temperature,
              reduction:      d.temperature_reduction,
              breakdown: actions.map((a,i) => ({
                action: a, label: a,
                reduction: parseFloat((d.temperature_reduction / actions.length).toFixed(2)),
                intensity: intensities[a] || 100,
              })),
            });
            setSimLoading(false);
            return;
          }
        }
        // Fallback: legacy /api/simulate
        const r2 = await fetch(`${LEGACY_API}/simulate`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ current_temp: currentTemp, actions, intensities }),
        });
        if (r2.ok) { setSimResult(await r2.json()); setSimLoading(false); return; }
      } catch { /* fall through */ }
      // Local fallback
      const impacts = {trees:2.5,cool_roof:2.0,water:1.5,green_roof:2.0};
      let drop = 0;
      const breakdown = actions.map(a => {
        const red = ((intensities[a]||100)/100)*(impacts[a]||1.5);
        drop += red;
        return {action:a,label:a,reduction:parseFloat(red.toFixed(2)),intensity:intensities[a]||100};
      });
      setSimResult({ current_temp:currentTemp, predicted_temp:parseFloat(Math.max(currentTemp-drop,15).toFixed(1)), reduction:parseFloat(drop.toFixed(2)), breakdown });
      setSimLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [treePct, roofPct, waterPct, currentTemp, currentNdvi, currentNdbi]);

  useEffect(() => { setTreePct(30); setRoofPct(20); setWaterPct(0); setSimResult(null); }, [pos]);

  if (!pos && !loading && !analysis && !mlData) {
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

  const env       = mlData?.environmental_data ?? analysis?.environmental_data;
  const ana       = analysis?.analysis;
  const uhi_flag  = mlData?.uhi_detected ?? ana?.uhi_detected;
  const heatColor = !env ? '#00F2FF'
    : (mlData ? (mlData.uhi_detected ? '#FF3B3B' : '#00e676')
      : (ana?.heat_classification==='High'?'#FF3B3B':ana?.heat_classification==='Medium'?'#ff7722':'#00e676'));

  if (!env) return null;
  const vegPct  = {Low:18,Moderate:52,High:82}[ana?.vegetation_level]??18;
  const denPct  = {Low:18,Moderate:52,High:82}[ana?.urban_density]??60;
  const recoIcons = {vegetation:'🌳',infrastructure:'🏠',water:'💧',mixed:'💧',monitoring:'📊'};

  return (

    <aside className="right-panel" key={`${pos?.lat}${pos?.lng}`}>
      {/* ── Header ── */}
      <div className="panel-section">
        <div className="panel-section-header"><div className="glow-dot"/>Location Analysis</div>
        <div style={{fontSize:11,color:'var(--on-muted)',fontFamily:'var(--font-display)'}}>
          {pos?.lat?.toFixed(4)}°N · {Math.abs(pos?.lng)?.toFixed(4)}° · 1km radius
          {uhi_flag &&
            <span style={{marginLeft:8,color:'#FF3B3B',fontWeight:700,fontSize:10,letterSpacing:'1px'}}>⚠ UHI DETECTED</span>}
        </div>
      </div>

      {/* ── ML Insights (new) ── */}
      <MLInsightsPanel ml={mlData}/>

      {/* ── Environmental Metrics ── */}
      <div className="panel-section">
        <div className="panel-section-header">Environmental Metrics</div>
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-card-label">Surface Temp</div>
            <div className="metric-card-value" style={{color:heatColor,textShadow:`0 0 10px ${heatColor}`}}>
              {env.lst_celsius.toFixed(1)}°
            </div>
            <div className="metric-card-sub">{ana?.heat_classification ?? (env.lst_celsius > 37 ? 'High' : env.lst_celsius > 30 ? 'Medium' : 'Low')}</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-label">Vegetation</div>
            <div className="metric-card-value" style={{color:'#00e676'}}>{env.ndvi.toFixed(2)}</div>
            <div className="metric-card-sub">{ana?.vegetation_level ?? (env.ndvi > 0.4 ? 'High' : env.ndvi > 0.2 ? 'Moderate' : 'Low')}</div>
            <ProgressBar pct={{Low:18,Moderate:52,High:82}[ana?.vegetation_level]??Math.round((env.ndvi+1)/2*100)} color="#00e676"/>
          </div>
          <div className="metric-card">
            <div className="metric-card-label">Built-Up</div>
            <div className="metric-card-value" style={{color:'#FFD700'}}>{env.ndbi.toFixed(2)}</div>
            <div className="metric-card-sub">{ana?.urban_density ?? (env.ndbi > 0.15 ? 'High' : env.ndbi > 0 ? 'Moderate' : 'Low')}</div>
            <ProgressBar pct={{Low:18,Moderate:52,High:82}[ana?.urban_density]??Math.round((env.ndbi+1)/2*100)} color="#FFD700"/>
          </div>
        </div>
      </div>

      {/* ── Bar Chart ── */}
      <EnvBarChart env={env}/>

      {/* ── Cause Detection (legacy layer — when available) ── */}
      {ana?.causes && (<div className="panel-section">
        <div className="panel-section-header">
          <div className="glow-dot" style={{background:'#FF3B3B',boxShadow:'0 0 6px #FF3B3B'}}/>
          Cause Detection
        </div>
        {ana?.causes?.map((c,i) => (
          <div key={i} className="cause-item" style={{borderLeftColor:c.id==='low_vegetation'?'#00e676':c.id==='high_buildup'?'#FFD700':'#FF3B3B'}}>
            <span className="cause-icon">{c.icon}</span>
            <div>
              <div style={{fontSize:12,fontWeight:500}}>{c.label}</div>
              <div style={{fontSize:10,color:'var(--on-muted)',marginTop:2,lineHeight:1.4}}>{c.description.slice(0,80)}…</div>
            </div>
          </div>
        ))}
      </div>)}

      {/* ── Recommendations (legacy layer — when available) ── */}
      {ana?.recommendations && (<div className="panel-section">
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
      </div>)}

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
  const [mlData,           setMlData]           = useState(null);
  const [loading,          setLoading]           = useState(false);
  const [pos,              setPos]               = useState(null);
  const [layers,           setLayers]            = useState({heat:true,veg:false,density:false});
  const [tileLayers,       setTileLayers]        = useState({});   // { layerId: tileUrl }
  const [tileMeta,         setTileMeta]          = useState({});   // { layerId: {min,max,unit,palette} }
  const [tileLoading,      setTileLoading]       = useState({});   // { layerId: bool }
  const [flyTo,            setFlyTo]             = useState(null);
  const [hotspots,         setHotspots]          = useState(DEFAULT_HOTSPOTS);
  const [hotspotsLoading,  setHotspotsLoading]   = useState(false);

  // Layer toggle: if turning on, fetch GEE tile URL; if turning off, clear it
  const handleLayerToggle = useCallback(async (id) => {
    const willBeOn = !layers[id];
    setLayers(p => ({...p, [id]: willBeOn}));

    if (!willBeOn) {
      // Remove tile layer
      setTileLayers(p => { const n={...p}; delete n[id]; return n; });
      setTileMeta(p  => { const n={...p}; delete n[id]; return n; });
      return;
    }

    // Fetch GEE tile URL for this layer
    const geeLayer = LAYER_GEE_ID[id];
    const centre   = pos ?? { lat: 40.74, lng: -73.99 };  // default to NYC
    setTileLoading(p => ({...p, [id]: true}));
    try {
      const r = await fetch(
        `${LEGACY_API}/layer-tiles?layer=${geeLayer}&lat=${centre.lat}&lon=${centre.lng}&radius_km=150`
      );
      if (r.ok) {
        const d = await r.json();
        setTileLayers(p => ({...p, [id]: d.tile_url}));
        setTileMeta(p  => ({...p, [id]: {min:d.min,max:d.max,unit:d.unit,palette:d.palette}}));
      }
    } catch (e) {
      console.warn('layer-tiles fetch failed:', e);
    } finally {
      setTileLoading(p => ({...p, [id]: false}));
    }
  }, [layers, pos]);

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
    setMlData(null);
    // kick off hotspots + ML analysis in parallel
    fetchHotspots(lat, lng);

    // 1. Call ML endpoint (primary)
    fetch(`${ML_API}/analyze-location`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({lat, lon:lng, radius_m:1000}),
    }).then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMlData(d); })
      .catch(() => {});

    // 2. Call legacy endpoint (for causes + recommendations)
    try {
      const r = await fetch(`${LEGACY_API}/analyze-location`, {
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

      <LeftSidebar
        layers={layers}
        onLayerToggle={handleLayerToggle}
        tileMeta={tileMeta}
        tileLoading={tileLoading}
        hotspots={hotspots}
        hotspotsLoading={hotspotsLoading}
      />

      <div className="map-area">
        <UHIMap onMapClick={handleMapClick} layers={layers} selectedPos={pos} flyTo={flyTo} hotspots={hotspots} tileLayers={tileLayers}/>
      </div>

      <RightPanel analysis={analysis} mlData={mlData} loading={loading} pos={pos}/>
    </div>
  );
}
