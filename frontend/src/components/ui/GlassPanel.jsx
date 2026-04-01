import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function GlassPanel({ children, className, glow = false }) {
  return (
    <div
      className={cn(
        "bg-surface/60 backdrop-blur-xl border border-white/5 rounded-2xl relative overflow-hidden transition-all duration-300",
        glow && "hover:shadow-neon-cyan/20 hover:border-neon-cyan/30",
        className
      )}
    >
      {glow && (
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      )}
      {children}
    </div>
  );
}
