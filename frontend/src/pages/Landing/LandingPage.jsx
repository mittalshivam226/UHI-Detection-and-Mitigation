import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { pageTransitions } from '../../animations/framer/variants.js';
import { initLandingTimeline } from '../../animations/gsap/landingTimeline.js';
import { Flame, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const containerRef = useRef(null);
  const sectionsRef = useRef([]);

  useEffect(() => {
    const tl = initLandingTimeline(containerRef, sectionsRef.current);
    return () => {
      if (tl) tl.kill();
    };
  }, []);

  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full pointer-events-auto"
    >
      <div ref={containerRef} className="relative w-full h-screen overflow-hidden">
        
        {/* Scene 0: HERO */}
        <div ref={el => sectionsRef.current[0] = el} className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <Flame className="w-20 h-20 text-neon-cyan mb-6 drop-shadow-neon-cyan" />
            <h1 className="text-5xl md:text-7xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta text-center">
              The Kinetic Obsidian<br />Framework
            </h1>
            <p className="mt-6 text-white/50 font-mono tracking-widest uppercase text-sm">Scroll to Initialize Climate Protocol</p>
          </motion.div>
        </div>

        {/* Scene 1: PROBLEM */}
        <div ref={el => sectionsRef.current[1] = el} className="absolute inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-none">
          <h2 className="text-6xl font-display font-bold text-neon-magenta shadow-neon-magenta">Critical Thermal Mass</h2>
          <p className="mt-4 text-xl text-white/70 max-w-2xl text-center font-body">
            Urban heat islands amplify deadly climate events. Our sensory array detects expanding red zones across global metropolises.
          </p>
        </div>

        {/* Scene 2: DATA/SOLUTION */}
        <div ref={el => sectionsRef.current[2] = el} className="absolute inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-none">
          <h2 className="text-5xl font-display font-bold text-neon-cyan drop-shadow-neon-cyan">Algorithmic Mitigation</h2>
          <p className="mt-4 text-lg text-white/70 max-w-2xl text-center font-body mb-10">
            Fusing real-time Landsat satellite telemetry with neural forecasting.
          </p>
          <div className="grid grid-cols-3 gap-6 w-full max-w-4xl opacity-50">
             {/* Dummy data visualizations for the scroll storytelling */}
             <div className="h-32 border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 drop-shadow-[0_0_15px_rgba(0,242,255,0.2)]"></div>
             <div className="h-32 border border-neon-magenta/30 rounded-lg bg-neon-magenta/5 drop-shadow-[0_0_15px_rgba(255,0,229,0.2)]"></div>
             <div className="h-32 border border-neon-cyan/30 rounded-lg bg-neon-cyan/5 drop-shadow-[0_0_15px_rgba(0,242,255,0.2)] flex items-center justify-center font-mono text-neon-cyan text-2xl font-bold">14.6°C DELTA</div>
          </div>
        </div>

        {/* Scene 3: CTA */}
        <div ref={el => sectionsRef.current[3] = el} className="absolute inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-auto">
          <h2 className="text-6xl font-display font-bold text-white mb-8">Access the Array</h2>
          <Link to="/dashboard" className="px-10 py-4 border border-neon-cyan bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan hover:text-black hover:shadow-[0_0_30px_rgba(0,242,255,0.6)] transition-all duration-300 font-mono tracking-widest uppercase flex items-center gap-3">
             Launch Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

      </div>
    </motion.div>
  );
}
