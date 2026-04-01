import React from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../../animations/framer/variants.js';
import { GlassPanel } from '../../components/ui/GlassPanel.jsx';

export default function ReportsPage() {
  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full pt-[90px] px-8 pb-8 pointer-events-auto"
    >
      <GlassPanel className="w-full h-full p-8 flex flex-col items-center justify-center">
        <h2 className="text-4xl font-display font-bold text-neon-cyan mb-4">Export Sector</h2>
        <p className="font-mono text-white/50 mb-8">REPORT GENERATION PROTOCOL STANDBY</p>
        <button className="px-8 py-3 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan font-mono hover:bg-neon-cyan hover:text-black transition-all">GENERATE FULL PDF</button>
      </GlassPanel>
    </motion.div>
  );
}
