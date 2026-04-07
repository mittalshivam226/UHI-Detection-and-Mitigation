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

  const handleMapClick = async (lat, lng) => {
    setPos({ lat, lng });
    setLoading(true);
    setMlLoading(true);

    const reqBody = JSON.stringify({ lat, lon: lng, radius_m: 1000 });
    const reqOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reqBody };
    
    // Legacy API fetch
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8002';
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
  };

  const handleScanRegion = async () => {
    if (!pos) return;
    setHotspotsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/hotspots?lat=${pos.lat}&lon=${pos.lng}&radius_km=5`);
      const data = await res.json();
      setHotspots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setHotspotsLoading(false);
    }
  };

  const handleLayerToggle = async (layerId) => {
    const active = !layers[layerId];
    setLayers(p => ({ ...p, [layerId]: active }));
    
    // Predicted UHI layer is purely vector (drawn via React Leaflet), so we skip fetching a raster tile.
    if (layerId === 'uhi') return;

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
      className="w-full h-[100vh] pt-[80px] pb-[20px] pointer-events-auto flex flex-row px-6 gap-6 overflow-x-auto overflow-y-hidden min-w-[1280px]"
    >
      <div className="flex-none w-[320px] h-full relative z-20">
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
