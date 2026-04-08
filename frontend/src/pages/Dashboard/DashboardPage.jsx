import React from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../../animations/framer/variants.js';
import LeftSidebar from '../../components/LeftSidebar.jsx';
import RightSidebar from '../../components/RightSidebar.jsx';
import MapView from '../../components/MapView.jsx';
import { useUHIContext } from '../../context/UHIContext.jsx';

export default function DashboardPage() {
  const {
    layers, setLayers,
    tileMeta, setTileMeta,
    tileLayers, setTileLayers,
    tileLoading, setTileLoading,
    hotspots, setHotspots,
    hotspotsLoading, setHotspotsLoading,
    pos, setPos,
    setAnalysis, setMlData, 
    setLoading, setMlLoading,
    setFlyTo
  } = useUHIContext();

  // ── API base URL (hoisted so all handlers can access it) ──
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';

  const handleMapClick = async (lat, lng) => {
    setPos({ lat, lng });
    setLoading(true);
    setMlLoading(true);

    const reqBody = JSON.stringify({ lat, lon: lng, radius_m: 1000 });
    const reqOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reqBody };

    // Legacy API fetch
    fetch(`${API_BASE}/api/analyze-location`, reqOpts)
      .then(res => { if (!res.ok) throw new Error('API failed'); return res.json(); })
      .then(data => setAnalysis(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    // ML API fetch
    fetch(`${API_BASE}/ml/analyze-location`, reqOpts)
      .then(res => { if (!res.ok) throw new Error('ML API failed'); return res.json(); })
      .then(data => setMlData(data))
      .catch(err => console.error(err))
      .finally(() => setMlLoading(false));

    // Auto-scan nearby hotspots for the new location (drives Predictive UHI circles)
    scanHotspots(lat, lng);
  };

  // ── Scan hotspots around a lat/lng, with mock fallback ──
  const scanHotspots = async (lat, lng) => {
    setHotspotsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hotspots?lat=${lat}&lon=${lng}&radius_km=5`);
      if (!res.ok) throw new Error('hotspots API failed');
      const data = await res.json();
      setHotspots(Array.isArray(data) && data.length > 0 ? data : generateMockHotspots(lat, lng));
    } catch (e) {
      console.warn('Hotspot API unavailable — using generated mock data:', e.message);
      setHotspots(generateMockHotspots(lat, lng));
    } finally {
      setHotspotsLoading(false);
    }
  };

  // ── Generate mock hotspots around any lat/lng when the backend is offline ──
  const generateMockHotspots = (lat, lng) => {
    const offsets = [
      { dlat:  0.005, dlng:  0.008, name: 'Urban Core',       temp: 41.2 },
      { dlat: -0.004, dlng:  0.006, name: 'Industrial Zone',  temp: 39.1 },
      { dlat:  0.007, dlng: -0.005, name: 'Commercial Strip', temp: 38.5 },
      { dlat: -0.006, dlng: -0.007, name: 'Dense Residential',temp: 37.8 },
      { dlat:  0.002, dlng:  0.012, name: 'Transport Hub',    temp: 40.3 },
    ];
    return offsets.map(o => ({
      lat:  lat  + o.dlat,
      lng:  lng  + o.dlng,
      temp: o.temp,
      name: o.name,
    }));
  };

  const handleScanRegion = () => {
    if (!pos) return;
    scanHotspots(pos.lat, pos.lng);
  };

  const handleLayerToggle = async (layerId) => {
    const active = !layers[layerId];
    setLayers(p => ({ ...p, [layerId]: active }));

    // Predicted UHI layer is purely vector (drawn via React Leaflet), so we skip fetching a raster tile.
    if (layerId === 'uhi') return;

    // Only fetch if turning ON and we don't already have a cached tile URL
    if (active && (!tileLayers[layerId] || !tileMeta[layerId])) {
      setTileLoading(p => ({ ...p, [layerId]: true }));
      try {
        const center = pos || { lat: 40.74, lon: -73.99 };
        const layerMap = { heat: 'lst', veg: 'ndvi', density: 'ndbi', ntl: 'ntl' };
        const backendLayer = layerMap[layerId] || layerId;

        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';
        const res = await fetch(`${API_BASE}/api/layer-tiles?layer=${backendLayer}&lat=${center.lat}&lon=${center.lng || center.lon || -73.99}`);
        const data = await res.json();

        setTileLayers(p => ({ ...p, [layerId]: data.tile_url }));
        if (data.metadata) {
          setTileMeta(p => ({ ...p, [layerId]: data.metadata }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setTileLoading(p => ({ ...p, [layerId]: false }));
      }
    }
    // When toggling OFF: tileLayers state is intentionally kept intact.
    // MapView hides the layer instantly via setOpacity(0) and shows it
    // instantly via setOpacity(targetOpacity) — no re-fetch needed.
  };

  const handleLocationSelect = (lat, lng) => {
    setFlyTo({ lat, lng });
    // Don't auto-fetch unless the map effectively clicks, but we can do it:
    handleMapClick(lat, lng);
  };

  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-[100vh] pt-[70px] pb-[16px] pointer-events-auto flex flex-row px-4 gap-4 overflow-x-auto overflow-y-hidden min-w-[1280px]"
    >
      {/* Bug Fix 1: wider sidebar (w-[360px]), Bug Fix 2: overflow-y-auto on sidebar wrapper */}
      <div className="flex-none w-[360px] h-full relative z-20 overflow-y-auto">
        <LeftSidebar 
          layers={layers}
          onLayerToggle={handleLayerToggle}
          tileMeta={tileMeta}
          tileLoading={tileLoading}
          hotspots={hotspots}
          hotspotsLoading={hotspotsLoading}
          onLocationSelect={handleLocationSelect}
          onScanRegion={handleScanRegion}
        />
      </div>

      <div className="flex-1 h-full overflow-hidden p-0 border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl relative z-10 glass-panel-heavy">
        <MapView 
          onMapClick={handleMapClick} 
          onMapMoveEnd={(lat, lng) => console.log('Map Moved', lat, lng)} 
        />
      </div>

      <div className="flex-none w-[420px] h-full relative z-20">
        <RightSidebar />
      </div>
    </motion.div>
  );
}
