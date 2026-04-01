import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../../animations/framer/variants.js';
import { GlassPanel } from '../../components/ui/GlassPanel.jsx';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { HologramGlobe } from '../../components/ui/HologramGlobe.jsx';
import { useUHIContext } from '../../context/UHIContext.jsx';
import { Download, AlertTriangle, Cpu, MapPin, Zap, Activity } from 'lucide-react';

export default function ReportsPage() {
  const { mlData, analysis, pos } = useUHIContext();
  const reportRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  // Extract variables safely
  const env = mlData?.environmental_data || analysis?.environmental_data;
  const causes = analysis?.analysis?.causes || [];
  const recs = analysis?.analysis?.recommendations || [];
  const score = mlData?.uhi_score ? (mlData.uhi_score * 100).toFixed(0) : '--';

  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full pt-[90px] px-8 pb-8 pointer-events-auto overflow-y-auto"
    >
      <GlassPanel className="w-full min-h-full p-8 flex flex-col relative" style={{ overflow: 'hidden' }}>
        
        {/* Printable Area Identifier */}
        <div ref={reportRef} className="w-full h-full flex flex-col z-10 print-container">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b border-white/10 pb-6 mb-8 print-header">
            <div>
              <h2 className="text-4xl font-display font-bold text-neon-cyan tracking-wide flex items-center gap-3">
                <Cpu size={36} /> Intelligence Report
              </h2>
              <div className="font-mono text-white/50 mt-2 text-sm tracking-widest flex items-center gap-2">
                <MapPin size={14} /> 
                {pos 
                  ? `COORDINATES: ${pos.lat.toFixed(4)}° N, ${Math.abs(pos.lng || pos.lon).toFixed(4)}° W` 
                  : 'AWAITING SCANNED TARGET'}
              </div>
            </div>
            
            {/* Export Button (Hidden on Print) */}
            <button 
              onClick={handlePrint}
              disabled={!env}
              className={`flex items-center gap-2 px-6 py-2.5 font-mono text-xs transition-all no-print
                ${env ? 'bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black hover:shadow-[0_0_15px_rgba(0,242,255,0.4)]' 
                      : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'}`}
            >
              <Download size={14} /> EXPORT PDF
            </button>
          </div>

          {!env ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center opacity-60">
              <div className="w-[400px] h-[400px] relative mb-8">
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 5, 5]} color="#64748b" />
                  <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
                    <icosahedronGeometry args={[3, 1]} />
                    <meshBasicMaterial color="#64748b" wireframe transparent opacity={0.2} />
                  </mesh>
                  <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
                </Canvas>
              </div>
              <p className="font-mono text-white/50 tracking-[0.2em] animate-pulse flex items-center gap-2">
                <AlertTriangle size={16} /> RETURN TO TACTICAL MAP AND SCAN A REGION
              </p>
            </div>
          ) : (
            /* Data View */
            <div className="flex flex-col lg:flex-row gap-12 flex-1">
              
              {/* Left Column: 3D Hologram (Hidden on Print to save ink/layout, or replaced by a static frame) */}
              <div className="w-full lg:w-1/3 flex flex-col items-center justify-start rounded-xl bg-black/40 border border-white/5 relative overflow-hidden h-[500px] lg:h-auto no-print">
                <div className="absolute top-4 left-4 z-10 font-mono text-xs text-neon-cyan/70 tracking-widest bg-black/40 px-2 py-1 rounded border border-neon-cyan/20">
                  ML CORE DIAGNOSTIC
                </div>
                <Canvas camera={{ position: [0, 0, 9], fov: 45 }}>
                  <HologramGlobe />
                  <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
                </Canvas>
              </div>

              {/* Right Column: Report Content */}
              <div className="w-full lg:w-2/3 flex flex-col gap-8 print-full-width">
                
                {/* Executive Summary Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 p-5 rounded-lg text-center">
                    <div className="text-[10px] text-white/50 tracking-widest font-mono mb-2">SURFACE TEMP</div>
                    <div className="text-3xl font-display font-bold text-neon-magenta text-glow-magenta">{env.lst_celsius.toFixed(1)}°</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-lg text-center">
                    <div className="text-[10px] text-white/50 tracking-widest font-mono mb-2">UHI SCORE</div>
                    <div className="text-3xl font-display font-bold text-neon-cyan">{score}/100</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-lg text-center">
                    <div className="text-[10px] text-white/50 tracking-widest font-mono mb-2">VEGETATION</div>
                    <div className="text-3xl font-display font-bold text-neon-green">{env.ndvi.toFixed(2)}</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-5 rounded-lg text-center">
                    <div className="text-[10px] text-white/50 tracking-widest font-mono mb-2">URBAN DENSITY</div>
                    <div className="text-3xl font-display font-bold text-amber-400">{env.ndbi.toFixed(2)}</div>
                  </div>
                </div>

                {/* Extended Environment Data */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="font-mono text-sm tracking-widest text-neon-cyan mb-4 flex items-center gap-2">
                    <Activity size={16} /> ENVIRONMENTAL METRICS
                  </h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    {env.elevation != null && (
                      <div className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-xs text-white/60">Altitude (SRTM)</span>
                        <span className="font-display font-bold bg-white/10 px-2 py-0.5 rounded text-sm">{Math.round(env.elevation)}m</span>
                      </div>
                    )}
                    {env.ntl != null && (
                      <div className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-xs text-white/60">Night Lights</span>
                        <span className="font-display font-bold bg-white/10 px-2 py-0.5 rounded text-sm">{env.ntl.toFixed(1)} nW/cm²</span>
                      </div>
                    )}
                    {env.lst_delta != null && (
                      <div className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-xs text-white/60">Urban-Rural ΔT</span>
                        <span className="font-display font-bold text-neon-magenta bg-white/10 px-2 py-0.5 rounded text-sm">+{env.lst_delta.toFixed(1)}°</span>
                      </div>
                    )}
                    {env.evi != null && (
                      <div className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-xs text-white/60">EVI (Enhanced)</span>
                        <span className="font-display font-bold text-neon-green bg-white/10 px-2 py-0.5 rounded text-sm">{env.evi.toFixed(3)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Causes & Mitigations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {causes.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="font-mono text-sm tracking-widest text-amber-400 mb-2 border-b border-white/10 pb-2">DETECTED CAUSES</h3>
                      {causes.map((c, i) => (
                        <div key={i} className="bg-black/40 border-l-2 border-amber-400 p-4 rounded-r-lg">
                          <div className="text-xs font-bold mb-1 text-white">{c.label}</div>
                          <div className="text-[11px] text-white/50 leading-relaxed">{c.description}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {recs.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h3 className="font-mono text-sm tracking-widest text-neon-green mb-2 border-b border-white/10 pb-2">RECOMMENDED MITIGATIONS</h3>
                      {recs.map((r, i) => (
                        <div key={i} className="bg-black/40 border-l-2 border-neon-green p-4 rounded-r-lg flex flex-col">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-white">{r.action}</span>
                            {r.impact_celsius && (
                              <span className="text-[10px] font-mono text-neon-green bg-neon-green/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                ↓ {r.impact_celsius.toFixed(1)}°
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 leading-relaxed">{r.explanation}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Watermark for Print */}
                <div className="mt-12 text-center text-[9px] text-white/30 font-mono tracking-[0.3em] font-light print-only-block" style={{ display: 'none' }}>
                  URBAN HEAT INTELLIGENCE · GENERATED {new Date().toISOString().split('T')[0]} · ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}
                </div>
              </div>

            </div>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
}
