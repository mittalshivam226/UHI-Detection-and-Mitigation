import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Html } from '@react-three/drei';

function MetricPillar({ index, position, height, color, label, value }) {
  const meshRef = useRef();

  useFrame((state) => {
    // Gentle hovering breath effect on the pillars
    if (meshRef.current) {
      meshRef.current.position.y =
        height / 2 + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
    }
  });

  // Stagger label height so adjacent labels don't clash
  const labelY = height + 0.9 + (index % 2 === 0 ? 0.3 : 0.0);

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Bar */}
      <mesh ref={meshRef} position={[0, height / 2, 0]}>
        <boxGeometry args={[0.8, height, 0.8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Wireframe Outline */}
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[0.82, height + 0.02, 0.82]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.25} />
      </mesh>

      {/* HTML Label (no troika dependency) */}
      <Html
        position={[0, labelY, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.85)',
              textShadow: '0 0 6px rgba(0,0,0,0.9)',
              letterSpacing: '0.05em',
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 'bold',
              color: color,
              textShadow: `0 0 8px ${color}`,
            }}
          >
            {(value * 100).toFixed(1)}%
          </span>
        </div>
      </Html>
    </group>
  );
}

export function Metrics3D({ features }) {
  const groupRef = useRef();

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Scale so tallest pillar reaches ~4 units
  const vals = Object.values(features || {});
  const maxVal = vals.length > 0 ? Math.max(...vals) : 1;
  const heightScale = 4.0 / (maxVal === 0 ? 1 : maxVal);

  const LABELS = {
    lst_delta: 'Urban ΔT', ndvi: 'NDVI', ndbi: 'NDBI',
    evi: 'EVI', elevation: 'Elevation', ntl: 'Night Lights',
  };
  const COLORS = {
    lst_delta: '#FF3B3B', ndvi: '#00e676', ndbi: '#FFD700',
    evi: '#4ade80', elevation: '#7dd3fc', ntl: '#fde725',
  };

  const keys = Object.keys(features || {});
  const count = keys.length;
  const radius = count > 3 ? 3.5 : 2.0;

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
      <group ref={groupRef} position={[0, -2, 0]}>

        {/* Foundation Grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
          <planeGeometry args={[12, 12, 12, 12]} />
          <meshBasicMaterial color="#00f2ff" wireframe transparent opacity={0.1} />
        </mesh>

        {/* Centre pad */}
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
          const height = Math.max(
            0.4,
            isNaN(calculatedHeight) || !isFinite(calculatedHeight) ? 0.4 : calculatedHeight,
          );
          const angle = count > 0 ? (index / count) * Math.PI * 2 : 0;
          const px = Math.cos(angle) * radius;
          const pz = Math.sin(angle) * radius;

          return (
            <MetricPillar
              key={key}
              index={index}
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
