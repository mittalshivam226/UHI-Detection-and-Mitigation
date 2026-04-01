import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';

export default function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 45 }}
      style={{ width: '100vw', height: '100vh', background: '#000000' }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00F2FF" />
        <pointLight position={[-10, -10, -10]} intensity={1.5} color="#FF00E5" />
        
        {/* Simple spinning particle or globe representation for the bg */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={1} fade speed={1} />
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          autoRotate 
          autoRotateSpeed={0.5} 
          maxPolarAngle={Math.PI / 2 + 0.1}
          minPolarAngle={Math.PI / 2 - 0.1}
        />
      </Suspense>
    </Canvas>
  );
}
