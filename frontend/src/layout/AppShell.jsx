import React from 'react';
import NavigationHUD from './NavigationHUD.jsx';
import SceneCanvas from '../three/SceneCanvas.jsx';

export default function AppShell({ children }) {
  return (
    <div className="relative w-full h-[100vh] overflow-hidden bg-obsidian text-white">
      {/* 3D Global Space: z-index -1 to remain completely behind UI */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <SceneCanvas />
      </div>

      {/* Persistent Navigation */}
      <NavigationHUD />

      {/* Main Page Content */}
      <main className="relative z-10 w-full h-full pointer-events-none">
        {/* We use pointer-events-none on the main wrapper so pointer events can
            pass through to 3D canvas where needed, but inside individual pages 
            we set pointer-events-auto for actual UI panels */}
        {children}
      </main>
    </div>
  );
}
