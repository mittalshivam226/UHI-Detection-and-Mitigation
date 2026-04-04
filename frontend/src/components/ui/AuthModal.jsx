import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ShieldAlert, ShieldCheck, User, X, ScanFace, Activity } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthenticated }) {
  const [phase, setPhase] = useState('idle'); // idle, scanning, analyzing, success, error
  const [typedText, setTypedText] = useState('');
  
  // Terminal text typing effect
  useEffect(() => {
    if (isOpen && phase === 'idle') {
      let isSubscribed = true;
      const text = "REQUESTING UHI COMMANDER CREDENTIALS...";
      let i = 0;
      setTypedText('');
      
      const typeChar = () => {
        if (i < text.length && isSubscribed) {
          setTypedText(prev => prev + text.charAt(i));
          i++;
          setTimeout(typeChar, 40);
        }
      };
      
      setTimeout(typeChar, 300);
      return () => { isSubscribed = false; };
    }
  }, [isOpen, phase]);

  const handleScan = () => {
    setPhase('scanning');
    
    // Simulate biometric analysis
    setTimeout(() => setPhase('analyzing'), 2000);
    
    // Simulate auth success
    setTimeout(() => {
      setPhase('success');
      setTimeout(() => {
        onAuthenticated();
      }, 1500);
    }, 4500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-black/90 border border-neon-cyan/30 shadow-[0_0_50px_rgba(0,242,255,0.1)] rounded-2xl overflow-hidden flex flex-col"
        >
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-neon-cyan" />
              <span className="font-mono text-xs text-white/50 tracking-widest">SECURE LINK</span>
            </div>
            <button onClick={onClose} className="p-1 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          </div>

          <div className="p-10 flex flex-col items-center justify-center relative min-h-[350px]">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: 'linear-gradient(#00f2ff 1px, transparent 1px), linear-gradient(90deg, #00f2ff 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />

            {/* Terminal Console Output */}
            <div className="absolute top-6 left-6 font-mono text-[10px] text-neon-cyan/70 mix-blend-screen h-4">
              {typedText}
              <span className="animate-pulse">_</span>
            </div>

            {/* Core Interaction Circle */}
            <div className="relative mt-8 flex flex-col items-center">
              {/* Outer rotating ring */}
               <motion.div 
                 animate={{ rotate: phase === 'scanning' || phase === 'analyzing' ? 360 : 0 }} 
                 transition={{ repeat: Infinity, duration: phase === 'analyzing' ? 2 : 10, ease: "linear" }}
                 className={`absolute w-36 h-36 rounded-full border border-dashed transition-colors duration-500 ${phase === 'success' ? 'border-[#00ff88]' : 'border-neon-cyan/30'}`}
               />
               
               {/* Inner rotating ring */}
               <motion.div 
                 animate={{ rotate: phase === 'scanning' || phase === 'analyzing' ? -360 : 0, scale: phase === 'scanning' ? [1, 1.1, 1] : 1 }} 
                 transition={{ rotate: { repeat: Infinity, duration: 15, ease: "linear" }, scale: { repeat: Infinity, duration: 2 } }}
                 className={`absolute w-28 h-28 rounded-full border opacity-50 transition-colors duration-500 ${phase === 'success' ? 'border-[#00ff88]' : 'border-neon-cyan'}`}
               />

              {/* Main Button/Icon */}
              <button 
                onClick={phase === 'idle' ? handleScan : undefined}
                disabled={phase !== 'idle'}
                className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500
                  ${phase === 'idle' ? 'bg-neon-cyan/10 hover:bg-neon-cyan/20 border border-neon-cyan shadow-[0_0_20px_rgba(0,242,255,0.3)] cursor-pointer hover:scale-105' : ''}
                  ${phase === 'scanning' || phase === 'analyzing' ? 'bg-neon-cyan/20 border border-neon-cyan shadow-[0_0_30px_rgba(0,242,255,0.5)] cursor-wait' : ''}
                  ${phase === 'success' ? 'bg-[#00ff88]/20 border border-[#00ff88] shadow-[0_0_40px_rgba(0,255,136,0.6)]' : ''}
                `}
              >
                {phase === 'idle' && <Fingerprint size={32} className="text-neon-cyan" />}
                {phase === 'scanning' && <ScanFace size={32} className="text-neon-cyan animate-pulse" />}
                {phase === 'analyzing' && <Activity size={32} className="text-neon-cyan animate-bounce" />}
                {phase === 'success' && <ShieldCheck size={36} className="text-[#00ff88]" />}
                
                {/* Visual scan line during scan */}
                {(phase === 'scanning' || phase === 'analyzing') && (
                  <motion.div 
                    animate={{ y: ["-100%", "100%", "-100%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute w-[150%] h-1 bg-neon-cyan/80 shadow-[0_0_10px_#00f2ff]"
                  />
                )}
              </button>
            </div>

            {/* Status Information */}
            <div className="mt-12 h-16 flex flex-col items-center justify-center text-center">
              {phase === 'idle' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                  <span className="font-display font-medium text-white mb-1">BIOMETRIC AUTHORIZATION</span>
                  <span className="font-mono text-[9px] tracking-widest text-white/40">PRESS TO INITIATE HANDSHAKE</span>
                </motion.div>
              )}
              
              {phase === 'scanning' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                  <span className="font-display text-neon-cyan animate-pulse">CAPTURING BIOMETRICS...</span>
                  <span className="font-mono text-[9px] tracking-widest text-neon-cyan/60">UPLOADING SECURE HASH</span>
                </motion.div>
              )}

              {phase === 'analyzing' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 items-center text-neon-cyan">
                   <Activity size={16} className="animate-spin-slow" />
                   <div className="flex flex-col text-left">
                     <span className="font-mono text-xs">DECRYPTING PAYLOAD_</span>
                     <span className="font-mono text-[9px] tracking-widest opacity-60">VERIFYING CLEARANCE LEVEL</span>
                   </div>
                </motion.div>
              )}

              {phase === 'success' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-[#00ff88]">
                  <span className="font-display text-lg tracking-wider font-bold shadow-black drop-shadow-md">ACCESS GRANTED</span>
                  <span className="font-mono text-[10px] tracking-widest opacity-80 mt-1">COMMANDER CLEARANCE [LEVEL 9]</span>
                </motion.div>
              )}
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
