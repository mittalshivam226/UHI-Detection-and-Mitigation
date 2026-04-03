import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text, Float } from '@react-three/drei';

function MetricPillar({ position, height, color, label, value }) {
  const meshRef = useRef();

  useFrame((state) => {
    // Gentle hovering breath effect on the pillars
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + height / 2 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* The Bar */}
      <Box ref={meshRef} args={[0.8, height, 0.8]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.8}
        />
      </Box>

      {/* Wireframe Outline for tech feel */}
      <Box position={[0, height / 2, 0]} args={[0.82, height + 0.02, 0.82]}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.25} />
      </Box>

      {/* Floating Label */}
      <Text
        position={[0, height + 0.6, 0]}
        fontSize={0.25}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
      
      {/* Floating Value */}
      <Text
        position={[0, height + 0.3, 0]}
        fontSize={0.2}
        color={color}
        anchorX="center"
        anchorY="middle"
      >
        {(value * 100).toFixed(1)}%
      </Text>
    </group>
  );
}

export function Metrics3D({ features }) {
  const groupRef = useRef();

  useFrame((state, delta) => {
    // Slowly orbit the entire cluster
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Calculate scaling factor to keep tallest pillar at a max height
  const vals = Object.values(features || {});
  const maxVal = vals.length > 0 ? Math.max(...vals) : 1;
  const heightScale = 4.0 / (maxVal === 0 ? 1 : maxVal);

  // Map backend feature keys to UI labels and colors
  const LABELS = {
    lst_delta: 'Urban ΔT', ndvi: 'NDVI', ndbi: 'NDBI',
    evi: 'EVI', elevation: 'Elevation', ntl: 'Night Lights'
  };
  const COLORS = {
    lst_delta: '#FF3B3B', ndvi: '#00e676', ndbi: '#FFD700',
    evi: '#4ade80', elevation: '#7dd3fc', ntl: '#fde725'
  };

  const keys = Object.keys(features || {});
  const count = keys.length;
  const radius = count > 3 ? 2.5 : 1.5;

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={groupRef} position={[0, -2, 0]}>
        
        {/* Foundation Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[12, 12, 12, 12]} />
          <meshBasicMaterial color="#00f2ff" wireframe transparent opacity={0.1} />
        </mesh>
        
        {/* Center glowing pad */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[radius + 1, 32]} />
          <meshBasicMaterial color="#0a0b10" transparent opacity={0.8} />
        </mesh>

        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} color="#00f2ff" />
        <pointLight position={[0, 2, 0]} intensity={2} color="#a78bfa" distance={8} />

        {keys.map((key, index) => {
          const rawValue = features[key];
          const value = typeof rawValue === 'number' && !isNaN(rawValue) ? rawValue : 0;
          const calculatedHeight = value * heightScale;
          const height = Math.max(0.1, isNaN(calculatedHeight) || !isFinite(calculatedHeight) ? 0.1 : calculatedHeight);
          const angle = count > 0 ? (index / count) * Math.PI * 2 : 0;
          
          // Position in a circle
          const px = Math.cos(angle) * radius;
          const pz = Math.sin(angle) * radius;

          return (
            <MetricPillar
              key={key}
              position={[px, 0, pz]}
              height={height}
              color={COLORS[key] || '#00f2ff'}
              label={LABELS[key] || key.toUpperCase()}
              value={value}
            />
          );
        })}
      </group>
    </Float>
  );
}
