import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useUHIContext } from '../context/UHIContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';

// A dynamic tooltip that follows the cursor on the map
function HoverPreview({ map }) {
  const [pos, setPos] = useState({ x: -100, y: -100, active: false });

  useEffect(() => {
    if (!map) return;
    const moveFn = (e) => {
      // Offset slightly from cursor
      setPos({ x: e.originalEvent.clientX + 15, y: e.originalEvent.clientY + 15, active: true });
    };
    const outFn = () => setPos(p => ({ ...p, active: false }));

    map.on('mousemove', moveFn);
    map.on('mouseout', outFn);
    return () => {
      map.off('mousemove', moveFn);
      map.off('mouseout', outFn);
    };
  }, [map]);

  return (
    <AnimatePresence>
      {pos.active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="bg-black/80 backdrop-blur-md border border-cyan-500/50 rounded-lg px-3 py-2 shadow-[0_0_15px_rgba(0,242,255,0.3)] text-white text-xs font-mono"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Scan Area
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Click ripple effect via fixed portal
function ClickRipple({ pos }) {
  if (!pos) return null;
  return (
    <motion.div
      initial={{ scale: 0, opacity: 1 }}
      animate={{ scale: 3, opacity: 0 }}
      transition={{ duration: 1, ease: 'easeOut' }}
      style={{
        position: 'fixed', left: pos.x - 30, top: pos.y - 30,
        width: 60, height: 60, borderRadius: '50%',
        border: '2px solid #00F2FF', pointerEvents: 'none', zIndex: 9999,
      }}
    />
  );
}

export default function MapView({ onMapClick, onMapMoveEnd }) {
  const { layers, layerOpacity, pos, flyTo, hotspots, tileLayers, simulationState, mapTheme } = useUHIContext();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const hotspotLayersRef = useRef([]);
  const tileLayersRef = useRef({});
  const simOverlayRef = useRef(null);

  const [clickScreenPos, setClickScreenPos] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const map = L.map(mapRef.current, { center: [40.74, -73.99], zoom: 13, zoomControl: false });
    const darkUrl  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    baseTileRef.current = L.tileLayer(darkUrl, { subdomains: 'abcd', maxZoom: 20 }).addTo(map);

    map.on('click', e => {
      setClickScreenPos({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });
      setTimeout(() => setClickScreenPos(null), 1000); // clear ripple
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    });

    map.on('moveend', () => {
      const center = map.getCenter();
      if (onMapMoveEnd) onMapMoveEnd(center.lat, center.lng);
    });
    
    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, [onMapClick, onMapMoveEnd]);

  // Handle Map Theme (Dark ↔ Light)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseTileRef.current) return;

    const TILES = {
      dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    };
    baseTileRef.current.setUrl(TILES[mapTheme] || TILES.dark);

    // Toggle the data-theme attribute so CSS filters apply/remove
    mapRef.current?.setAttribute('data-theme', mapTheme);
  }, [mapTheme]);

  // Handle Fly-to
  useEffect(() => {
    if (flyTo && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([flyTo.lat, flyTo.lng], 13, { duration: 1.2 });
    }
  }, [flyTo]);

  // Handle Hotspots & Base Circle Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    hotspotLayersRef.current.forEach(l => l.remove());
    hotspotLayersRef.current = [];

    if (layers.heat) {
      hotspots.forEach(h => {
        const temp = h.temp - (simulationState?.overlayActive ? (simulationState.predictedReduction || 0) : 0);
        const color = temp > 40 ? '#FF3B3B' : temp > 36 ? '#ff7722' : '#FFD700'; // Default thermal
        
        const c = L.circle([h.lat, h.lng || h.lon], { radius: 450, color: 'transparent', fillColor: color, fillOpacity: 0.38 }).addTo(map);
        c.bindTooltip(`<b>${h.name}</b><br>🌡️ ${temp.toFixed(1)}°C`);
        hotspotLayersRef.current.push(c);
        
        const o = L.circle([h.lat, h.lng || h.lon], { radius: 700, color, fillColor: color, fillOpacity: 0.08, weight: 1 }).addTo(map);
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
  }, [layers, hotspots, simulationState]);

  // Selected Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (clickMarkerRef.current) { clickMarkerRef.current.remove(); clickMarkerRef.current = null; }
    if (pos) {
      clickMarkerRef.current = L.circleMarker([pos.lat, pos.lng], {
        radius: 8, color: '#00F2FF', fillColor: '#00F2FF', fillOpacity: 0.9, weight: 2
      }).addTo(map);
    }
  }, [pos]);

  // Google Earth Engine Satellite Tiles
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const LAYER_KEY_MAP = { heat: 'lst', veg: 'ndvi', density: 'ndbi', ntl: 'ntl' };
    
    Object.keys(LAYER_KEY_MAP).forEach((toggle) => {
      const tileUrl = tileLayers?.[toggle];
      if (tileUrl && !tileLayersRef.current[toggle]) {
        const opacity = layerOpacity?.[toggle] ?? 0.85;
        const tl = L.tileLayer(tileUrl, { opacity, className: `tile-layer-${toggle}` });
        tl.addTo(map);
        tileLayersRef.current[toggle] = tl;
      } else if (!tileUrl && tileLayersRef.current[toggle]) {
        tileLayersRef.current[toggle].remove();
        delete tileLayersRef.current[toggle];
      }
    });
  }, [tileLayers, layerOpacity]);

  // Handle Opacity changes dynamically for existing layers
  useEffect(() => {
    Object.keys(tileLayersRef.current).forEach(toggle => {
      const layer = tileLayersRef.current[toggle];
      if (layer && layerOpacity && layerOpacity[toggle] !== undefined) {
        layer.setOpacity(layerOpacity[toggle]);
      }
    });
  }, [layerOpacity]);

  // WOW MOMENT: Visual Simulation Overlay
  // Crossfade "cooled" tile layer when simulation active
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    const heatUrl = tileLayers?.['heat'];
    if (simulationState?.overlayActive && heatUrl) {
      if (!simOverlayRef.current) {
        // Create duplicate thermal layer with CSS filter via class
        simOverlayRef.current = L.tileLayer(heatUrl, { 
          opacity: 0, 
          className: 'sim-cooled-overlay',
          zIndex: 400
        }).addTo(map);
      }
      
      // Calculate intensity (0 to 1) and animate opacity
      const intensity = Math.min((simulationState.predictedReduction || 0) / 10, 1) * 0.9;
      
      // Use Leaflet's setOpacity to crossfade
      const overlay = simOverlayRef.current;
      let currentOpacity = overlay.options.opacity;
      const step = intensity > currentOpacity ? 0.05 : -0.05;
      
      const interval = setInterval(() => {
        if (Math.abs(currentOpacity - intensity) < 0.06) {
          overlay.setOpacity(intensity);
          clearInterval(interval);
        } else {
          currentOpacity += step;
          overlay.setOpacity(currentOpacity);
        }
      }, 50);
      
    } else if (!simulationState?.overlayActive && simOverlayRef.current) {
      // Fade out and remove
      const overlay = simOverlayRef.current;
      let currentOpacity = overlay.options.opacity;
      const interval = setInterval(() => {
        if (currentOpacity <= 0.05) {
          overlay.remove();
          simOverlayRef.current = null;
          clearInterval(interval);
        } else {
          currentOpacity -= 0.05;
          overlay.setOpacity(currentOpacity);
        }
      }, 50);
    }
  }, [simulationState?.overlayActive, simulationState?.predictedReduction, tileLayers]);

  return (
    <>
      <div ref={mapRef} data-theme={mapTheme} className="map-container relative z-0 h-full w-full" />
      <HoverPreview map={mapInstanceRef.current} />
      <ClickRipple pos={clickScreenPos} />
    </>
  );
}
