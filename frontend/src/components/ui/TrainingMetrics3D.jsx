import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

// A smooth lerp function for mouse tracking
const lerp = (start, end, factor) => start + (end - start) * factor;

function OrbitRing({ score, radius, tube, color, speedX, speedY, speedZ }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speedX;
      meshRef.current.rotation.y += delta * speedY;
      meshRef.current.rotation.z += delta * speedZ;
    }
  });

  const scale = 1 + (score * 0.2);

  return (
    <group scale={scale}>
      {/* Clean, mathematical orbiting ring */}
      <mesh ref={meshRef} rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}>
        <torusGeometry args={[radius, tube, 32, 100]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={0.8}
          transparent 
          opacity={0.8} 
          metalness={0.5}
          roughness={0.2}
        />
        {/* Wireframe outer glow for visual density */}
        <mesh>
          <torusGeometry args={[radius, tube + 0.02, 16, 100]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.15} />
        </mesh>
      </mesh>
    </group>
  );
}

export function TrainingMetrics3D({ accuracy = 0.93, f1 = 0.89, auc = 0.98 }) {
  const rootRef = useRef();

  useFrame((state, delta) => {
    if (rootRef.current) {
      // 1. Idle Planetary Rotation
      const idleY = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
      const idleX = Math.PI / 8 + Math.cos(state.clock.elapsedTime * 0.3) * 0.1;

      // 2. Mouse Parallax (Aggressively tracking the pointer)
      // state.pointer.x and y are normalized between -1 and 1
      const targetX = idleX + (state.pointer.y * 0.8); // Pointer Y tilts the X axis
      const targetY = idleY + (state.pointer.x * 0.8); // Pointer X spins the Y axis

      // 3. Smooth Lerp Interactivity
      rootRef.current.rotation.x = lerp(rootRef.current.rotation.x, targetX, 0.05);
      rootRef.current.rotation.y = lerp(rootRef.current.rotation.y, targetY, 0.05);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={rootRef} position={[0, -0.5, 0]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[0, 0, 0]} intensity={3} color="#ffffff" distance={10} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#00f2ff" />
        
        {/* Outer Orbit: ROC AUC */}
        <OrbitRing score={auc} radius={1.8} tube={0.02} color="#FF00E5" speedX={0.1} speedY={0.2} speedZ={0.3} />

        {/* Middle Core: Accuracy */}
        <OrbitRing score={accuracy} radius={1.1} tube={0.03} color="#00f2ff" speedX={-0.2} speedY={0.1} speedZ={-0.1} />

        {/* Inner Core: F1 */}
        <OrbitRing score={f1} radius={0.5} tube={0.04} color="#FFD700" speedX={0.3} speedY={-0.3} speedZ={0.2} />

        {/* Central Quantum Node */}
        <mesh>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.8} />
        </mesh>
      </group>
    </Float>
  );
}
