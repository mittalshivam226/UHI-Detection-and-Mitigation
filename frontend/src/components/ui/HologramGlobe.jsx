import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Float } from '@react-three/drei';

export function HologramGlobe() {
  const shellRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();

  useFrame((state, delta) => {
    // Spin the outer shell
    if (shellRef.current) {
      shellRef.current.rotation.y += delta * 0.25;
      shellRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    // Spin the rings in opposite directions
    if (ring1Ref.current) ring1Ref.current.rotation.z -= delta * 0.5;
    if (ring2Ref.current) ring2Ref.current.rotation.z += delta * 0.3;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.5}>
      <group>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={2} color="#00f2ff" />
        <directionalLight position={[-10, -10, -5]} intensity={1.5} color="#a78bfa" />
        
        {/* Outer Data Shell - Distorted Wireframe */}
        <Sphere ref={shellRef} args={[2.5, 32, 32]}>
          <MeshDistortMaterial
            color="#00f2ff"
            emissive="#00f2ff"
            emissiveIntensity={0.5}
            wireframe
            transparent
            opacity={0.35}
            distort={0.3}
            speed={2.5}
          />
        </Sphere>

        {/* Inner Solid Core */}
        <Sphere args={[1.8, 64, 64]}>
          <meshStandardMaterial
            color="#0a0b10"
            emissive="#00f2ff"
            emissiveIntensity={0.15}
            roughness={0.2}
            metalness={0.9}
          />
        </Sphere>
        
        {/* Orbital Scanning Rings */}
        <mesh ref={ring1Ref} rotation={[Math.PI / 2.2, 0.2, 0]}>
          <torusGeometry args={[3.2, 0.02, 16, 100]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.5} />
        </mesh>
        
        <mesh ref={ring2Ref} rotation={[Math.PI / 1.5, -0.4, 0]}>
          <torusGeometry args={[3.6, 0.015, 16, 100]} />
          <meshBasicMaterial color="#00f2ff" transparent opacity={0.3} />
        </mesh>
      </group>
    </Float>
  );
}
