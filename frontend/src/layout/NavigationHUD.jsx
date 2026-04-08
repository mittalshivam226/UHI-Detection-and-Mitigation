import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShieldCheck } from 'lucide-react';
import AuthModal from '../components/ui/AuthModal';
import { MissionStatusBadges } from '../components/MissionStatusBar.jsx';

export default function NavigationHUD() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 h-[70px] z-50 flex items-center justify-between px-8 bg-black/80 backdrop-blur-md border-b border-neon-cyan/20 pointer-events-auto">
        <div className="flex items-center gap-3 pointer-events-auto">
          <Flame className="w-6 h-6 text-neon-cyan" />
          <span className="font-display font-bold text-xl tracking-widest text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]">
            UHI <span className="font-normal text-[0.6em] text-neon-cyan uppercase">Intelligence</span>
          </span>
        </div>

        {/* ── Mission Status Badges (center of nav) ── */}
        <div className="hidden lg:flex items-center gap-3 pointer-events-auto">
          <MissionStatusBadges />
        </div>
        
        <div className="flex items-center gap-8 pointer-events-auto">
          <Link to="/" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Mission</Link>
          <Link to="/dashboard" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Tactical Map</Link>
          <Link to="/reports" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Intel</Link>
          <Link to="/engine" className="font-mono text-sm uppercase tracking-wide text-white/70 hover:text-neon-cyan transition-colors duration-300">Diagnostics</Link>
          
          {!isAuthenticated ? (
            <button 
              onClick={() => setIsAuthOpen(true)}
              className="px-6 py-2 border border-neon-cyan/30 bg-neon-cyan/10 font-mono text-xs uppercase tracking-widest hover:bg-neon-cyan/20 hover:shadow-[0_0_15px_rgba(0,242,255,0.4)] hover:border-neon-cyan transition-all duration-300 rounded-sm text-neon-cyan"
            >
              Init Sequence
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2 border border-[#00ff88]/30 bg-[#00ff88]/10 rounded-sm drop-shadow-[0_0_10px_rgba(0,255,136,0.3)] cursor-default">
              <ShieldCheck size={14} className="text-[#00ff88]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#00ff88] font-bold">CMDR [ONLINE]</span>
            </div>
          )}
        </div>
      </nav>

      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onAuthenticated={() => {
          setIsAuthenticated(true);
          setIsAuthOpen(false);
        }}
      />
    </>
  );
}
