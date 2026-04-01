import React from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

export default function NavigationHUD() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-[70px] z-50 flex items-center justify-between px-8 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
      <div className="flex items-center gap-3 pointer-events-auto">
        <Flame className="w-6 h-6 text-neon-cyan" />
        <span className="font-display font-bold text-xl tracking-widest text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]">
          UHI <span className="font-normal text-[0.6em] text-neon-cyan uppercase">Intelligence</span>
        </span>
      </div>
      
      <div className="flex items-center gap-8 pointer-events-auto">
        <Link to="/" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Mission</Link>
        <Link to="/dashboard" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Tactical Map</Link>
        <Link to="/reports" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Intel</Link>
        <Link to="/engine" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Diagnostics</Link>
        <button className="px-6 py-2 border border-neon-cyan/30 bg-neon-cyan/10 font-mono text-xs uppercase tracking-widest hover:bg-neon-cyan/20 hover:shadow-neon-cyan hover:border-neon-cyan transition-all duration-300 rounded-sm text-neon-cyan">
          Init Sequence
        </button>
      </div>
    </nav>
  );
}
