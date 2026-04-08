import React, { createContext, useContext, useState, useCallback } from 'react';

const UHIContext = createContext();

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
  const [hotspots, setHotspots] = useState([]);           // empty until a location is selected
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
