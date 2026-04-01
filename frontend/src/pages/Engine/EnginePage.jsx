import React from 'react';
import { motion } from 'framer-motion';
import { pageTransitions } from '../../animations/framer/variants.js';
import { GlassPanel } from '../../components/ui/GlassPanel.jsx';

export default function EnginePage() {
  return (
    <motion.div
      variants={pageTransitions}
      initial="initial"
      animate="animate"
      exit="exit"
      className="w-full h-full pt-[90px] px-8 pb-8 pointer-events-auto"
    >
      <GlassPanel className="w-full h-full p-8 flex flex-col items-center justify-center">
        <h2 className="text-4xl font-display font-bold text-neon-magenta mb-4">ML Pipeline Engine</h2>
        <div className="flex gap-4 mb-8">
           <div className="w-4 h-4 rounded-full bg-neon-cyan animate-ping" />
           <span className="font-mono text-neon-cyan/80">XGBoost Diagnostics Active</span>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
