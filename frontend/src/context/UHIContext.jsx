import React, { createContext, useContext, useState, useCallback } from 'react';

const UHIContext = createContext();

const DEFAULT_HOTSPOTS = [
  { lat: 40.758, lng: -73.985, temp: 41.2, name: 'Midtown West' },
  { lat: 40.730, lng: -73.990, temp: 38.8, name: 'Chelsea' },
  { lat: 40.712, lng: -74.005, temp: 37.1, name: 'Downtown' },
  { lat: 40.778, lng: -73.967, temp: 39.4, name: 'Upper West Side' },
  { lat: 40.749, lng: -73.975, temp: 40.0, name: 'Koreatown' },
];

export function UHIProvider({ children }) {
  // Core Location & Analysis Data
  const [pos, setPos] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mlLoading, setMlLoading] = useState(false);  // ML endpoint in-flight

  // Map Layers & Hotspots
  const [layers, setLayers] = useState({ heat: false, uhi: false, veg: false, density: false, ntl: false });
  const [layerOpacity, setLayerOpacity] = useState({ heat: 0.85, uhi: 0.85, veg: 0.85, density: 0.85, ntl: 0.85 });
  const [tileLayers, setTileLayers] = useState({});
  const [tileMeta, setTileMeta] = useState({});
  const [tileLoading, setTileLoading] = useState({});
  const [hotspots, setHotspots] = useState(DEFAULT_HOTSPOTS);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);

  // Simulation State
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simulationState, setSimulationState] = useState({
    activeOptions: {},
    predictedTempC: null,
    overlayActive: false
  });

  // Map Theme
  const [mapTheme, setMapTheme] = useState('dark'); // 'dark' | 'light'

  const value = {
    pos, setPos,
    flyTo, setFlyTo,
    analysis, setAnalysis,
    mlData, setMlData,
    loading, setLoading,
    mlLoading, setMlLoading,
    layers, setLayers,
    layerOpacity, setLayerOpacity,
    tileLayers, setTileLayers,
    tileMeta, setTileMeta,
    tileLoading, setTileLoading,
    hotspots, setHotspots,
    hotspotsLoading, setHotspotsLoading,
    simResult, setSimResult,
    simLoading, setSimLoading,
    simulationState, setSimulationState,
    mapTheme, setMapTheme,
  };

  return <UHIContext.Provider value={value}>{children}</UHIContext.Provider>;
}

export function useUHIContext() {
  const context = useContext(UHIContext);
  if (!context) {
    throw new Error('useUHIContext must be used within a UHIProvider');
  }
  return context;
}
