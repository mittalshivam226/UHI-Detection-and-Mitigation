import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { pageTransitions } from '../../animations/framer/variants.js';
import { initLandingTimeline } from '../../animations/gsap/landingTimeline.js';
import { Flame, ArrowRight, ShieldAlert, Cpu, Leaf } from 'lucide-react';

export default function LandingPage() {
  const containerRef = useRef(null);
  const sectionsRef = useRef([]);

  useEffect(() => {
    // A small delay ensures the DOM layout is ready and the scroller exists
    const timer = setTimeout(() => {
      const tl = initLandingTimeline(containerRef, sectionsRef.current);
      return () => {
        if (tl) tl.kill();
      };
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      id="landing-scroller"
      /* Make sure this wrapper handles scrolling and catches pointer events */
      className="w-full h-full pointer-events-auto overflow-y-auto"
    >
      <div ref={containerRef} className="relative w-full h-screen overflow-hidden">
        
        {/* Scene 0: HERO */}
        <div ref={el => sectionsRef.current[0] = el} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="flex flex-col items-center px-4 text-center"
          >
            <Flame className="w-20 h-20 text-neon-cyan mb-6 drop-shadow-neon-cyan" />
            <h1 className="text-5xl md:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta text-center">
              Urban Heat Intelligence
            </h1>
            <p className="mt-6 text-white/50 font-mono tracking-widest uppercase text-sm">
              ML-Driven Climate Action Protocol
            </p>
            <div className="mt-12 animate-bounce">
              <p className="text-neon-cyan/50 font-mono text-xs uppercase tracking-widest">Scroll to Initialize</p>
              <div className="w-[1px] h-12 bg-neon-cyan/50 mx-auto mt-2"></div>
            </div>
          </motion.div>
        </div>

        {/* Scene 1: PROBLEM */}
        <div ref={el => sectionsRef.current[1] = el} className="absolute inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-none px-6">
          <ShieldAlert className="w-16 h-16 text-neon-magenta mb-6 drop-shadow-[0_0_15px_rgba(255,0,229,0.5)]" />
          <h2 className="text-4xl md:text-6xl font-display font-bold text-neon-magenta shadow-neon-magenta text-center">
            The Invisible Threat
          </h2>
          <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl text-center font-body leading-relaxed">
            Urban Heat Islands are expanding rapidly. Concrete and asphalt absorb solar radiation, creating localized anomalies of up to 15°C that amplify heatwaves, burden energy grids, and threaten public health in modern metropolises.
          </p>
        </div>

        {/* Scene 2: DATA/SOLUTION */}
        <div ref={el => sectionsRef.current[2] = el} className="absolute inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-none px-6">
          <Cpu className="w-16 h-16 text-neon-cyan mb-6 drop-shadow-neon-cyan" />
          <h2 className="text-4xl md:text-5xl font-display font-bold text-neon-cyan drop-shadow-neon-cyan text-center">
            High-Fidelity Diagnostics
          </h2>
          <p className="mt-4 text-base md:text-lg text-white/70 max-w-3xl text-center font-body mb-10">
            Our XGBoost pipeline fuses real-time Landsat telemetry with spatial cross-validation. We process complex predictors—from NDVI to Night Lights—to pinpoint thermal anomalies and map structural mitigation pathways.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
             <div className="h-32 border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 flex flex-col items-center justify-center drop-shadow-[0_0_15px_rgba(0,242,255,0.2)]">
               <span className="text-xs text-white/50 uppercase tracking-widest font-mono mb-2">Model Accuracy</span>
               <span className="font-display font-bold text-4xl text-white">93.5%</span>
             </div>
             <div className="h-32 border border-neon-magenta/30 rounded-lg bg-neon-magenta/5 flex flex-col items-center justify-center drop-shadow-[0_0_15px_rgba(255,0,229,0.2)]">
               <span className="text-xs text-white/50 uppercase tracking-widest font-mono mb-2">Algorithm</span>
               <span className="font-display font-bold text-3xl text-white">XGBoost</span>
             </div>
             <div className="h-32 border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 flex flex-col items-center justify-center drop-shadow-[0_0_15px_rgba(0,242,255,0.2)]">
               <span className="text-xs text-white/50 uppercase tracking-widest font-mono mb-2">Data Source</span>
               <span className="font-display font-bold text-2xl text-white">Landsat 8/9</span>
             </div>
          </div>
        </div>

        {/* Scene 3: CTA */}
        <div ref={el => sectionsRef.current[3] = el} className="absolute inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-auto px-6">
          <Leaf className="w-16 h-16 text-[#00e676] mb-6 drop-shadow-[0_0_15px_rgba(0,230,118,0.5)]" />
          <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-6 text-center">Initiate Action</h2>
          <p className="mt-2 text-lg text-white/70 max-w-2xl text-center font-body mb-10">
            Deploy the Tactical Map to identify structural countermeasures, simulate cool rooftops and tree coverage, and optimize localized temperature reductions.
          </p>
          <Link to="/dashboard" className="px-10 py-4 border border-neon-cyan bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan hover:text-black hover:shadow-[0_0_30px_rgba(0,242,255,0.6)] transition-all duration-300 font-mono tracking-widest uppercase flex items-center gap-3 scale-100 hover:scale-105">
             Launch Tactical Map <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

      </div>
    </motion.div>
  );
}
