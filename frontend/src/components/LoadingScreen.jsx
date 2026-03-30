import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGES = [
  "INITIALIZING UHI PIPELINE...",
  "CONNECTING TO SATELLITE NODE-01...",
  "CALIBRATING THERMAL SENSORS...",
  "SYNCING URBAN GRID DATA...",
  "SYSTEM ONLINE."
];

export default function LoadingScreen({ onComplete }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    // Cycle messages every ~900ms
    const interval = setInterval(() => {
      setMsgIdx((prev) => {
        if (prev < MESSAGES.length - 1) return prev + 1;
        clearInterval(interval);
        setTimeout(onComplete, 800); // Wait a beat on "SYSTEM ONLINE." then unmount
        return prev;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0a0b10',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: 'var(--font-display), sans-serif',
      }}
    >
      {/* Background Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        opacity: 0.4
      }} />

      {/* Radar Animation Container */}
      <div style={{ position: 'relative', width: 260, height: 260, marginBottom: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Outer Pulse Ring */}
        <motion.div
          animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: 'absolute',
            width: '100%', height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(0, 242, 255, 0.5)',
            boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)'
          }}
        />

        {/* Outer Pulse Ring 2 (Staggered Thermal Red) */}
        <motion.div
          animate={{ scale: [1, 1.5, 2], opacity: [0.6, 0.1, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1 }}
          style={{
            position: 'absolute',
            width: '100%', height: '100%',
            borderRadius: '50%',
            border: '2px solid rgba(255, 59, 59, 0.4)',
            boxShadow: '0 0 20px rgba(255, 59, 59, 0.2)'
          }}
        />

        {/* Inner Glassmorphism Ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            width: '80%', height: '80%',
            borderRadius: '50%',
            border: '1px solid rgba(0, 242, 255, 0.2)',
            borderTop: '3px solid #00F2FF',
            borderRight: '1px solid transparent',
            boxShadow: 'inset 0 0 30px rgba(0, 242, 255, 0.1)',
            backdropFilter: 'blur(4px)',
          }}
        />

        {/* Counter-rotating Thermal Ring */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            width: '60%', height: '60%',
            borderRadius: '50%',
            border: '1px solid rgba(255, 59, 59, 0.3)',
            borderBottom: '3px solid #FF3B3B',
            borderLeft: '1px solid transparent',
            boxShadow: 'inset 0 0 20px rgba(255, 59, 59, 0.1)',
          }}
        />

        {/* Core Glowing Orb */}
        <motion.div
          animate={{ scale: [0.95, 1.1, 0.95], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute',
            width: 40, height: 40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #00F2FF 0%, rgba(0,242,255,0) 70%)',
            boxShadow: '0 0 30px 10px rgba(0, 242, 255, 0.5)',
          }}
        />
        
        {/* Radar Scanner Line */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            position: 'absolute',
            width: '40%', height: '2px',
            background: 'linear-gradient(90deg, rgba(0,242,255,0) 0%, #00F2FF 100%)',
            top: '50%', left: '50%',
            transformOrigin: '0 50%',
            boxShadow: '0 0 10px #00F2FF'
          }}
        />
      </div>

      {/* Typography Feed */}
      <div style={{
        textAlign: 'center',
        padding: '20px 40px',
        background: 'rgba(0, 242, 255, 0.05)',
        border: '1px solid rgba(0, 242, 255, 0.2)',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        minWidth: 360,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: 11, color: '#00F2FF', letterSpacing: '4px', marginBottom: 12, opacity: 0.8 }}>
          BOOT SEQUENCE INITIATED
        </div>
        
        <div style={{ position: 'relative', height: 24, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={msgIdx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: 16,
                color: '#fff',
                letterSpacing: '2px',
                fontWeight: 600,
                textShadow: '0 0 10px rgba(255,255,255,0.4)',
                whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center'
              }}
            >
              {MESSAGES[msgIdx]}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ marginLeft: 6, color: '#00F2FF', fontWeight: 900 }}
              >
                _
              </motion.span>
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Progress Bar */}
        <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', marginTop: 24, borderRadius: 3, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${((msgIdx + 1) / MESSAGES.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ height: '100%', background: '#00F2FF', boxShadow: '0 0 10px #00F2FF' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
