import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 1. Snow Mountain Component
// Optimized: Low-poly cone geometry, shared material
export const SnowMountain = ({ position, scale = [1, 1, 1] }) => {
    return (
        <mesh position={position} scale={scale} castShadow receiveShadow>
            <coneGeometry args={[15, 40, 6]} />
            <meshStandardMaterial 
                color="#ffffff" 
                flatShading 
                roughness={0.8}
            />
        </mesh>
    );
};

// 2. Enhanced Snow Tree Component with Ice Crystals
// Optimized: Simple stacked cones with frosted effect
export const SnowTree = ({ position, scale = [1, 1, 1] }) => {
    return (
        <group position={position} scale={scale}>
            {/* Trunk */}
            <mesh position={[0, 1, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 2, 8]} />
                <meshStandardMaterial color="#5d4037" roughness={0.9} />
            </mesh>
            {/* Foliage - Bottom */}
            <mesh position={[0, 2.5, 0]} castShadow>
                <coneGeometry args={[1.5, 2.5, 6]} />
                <meshStandardMaterial color="#1b5e20" flatShading roughness={0.8} />
            </mesh>
            {/* Foliage - Middle */}
            <mesh position={[0, 4, 0]} castShadow>
                <coneGeometry args={[1.2, 2, 6]} />
                <meshStandardMaterial color="#2e7d32" flatShading roughness={0.8} />
            </mesh>
            {/* Snow Cap */}
            <mesh position={[0, 4.8, 0]} castShadow>
                <coneGeometry args={[0.5, 0.8, 6]} />
                <meshStandardMaterial 
                    color="#ffffff" 
                    flatShading 
                    emissive="#b3e5fc"
                    emissiveIntensity={0.1}
                />
            </mesh>
        </group>
    );
};

// 3. Ice Crystal Decoration
export const IceCrystal = ({ position, scale = [1, 1, 1] }) => {
    const ref = useRef();
    const rotSpeed = useRef(Math.random() * 0.5 + 0.2);

    useFrame((state, delta) => {
        if (!ref.current) return;
        ref.current.rotation.y += rotSpeed.current * delta;
    });

    return (
        <mesh ref={ref} position={position} scale={scale}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial
                color="#b3e5fc"
                transparent
                opacity={0.7}
                roughness={0.1}
                metalness={0.3}
                emissive="#4fc3f7"
                emissiveIntensity={0.3}
            />
        </mesh>
    );
};

// 4. Enhanced Snow Particle Effect with Wind
// Optimized: Particles falling with wind drift and swirling motion
export const SnowParticles = ({ count = 500, area = [50, 50, 50], windStrength = 1.0 }) => {
    const points = useMemo(() => {
        const p = new Float32Array(count * 3);
        const v = new Float32Array(count); // fall velocity
        const w = new Float32Array(count); // wind phase offset
        for (let i = 0; i < count; i++) {
            p[i * 3] = (Math.random() - 0.5) * area[0];
            p[i * 3 + 1] = Math.random() * area[1];
            p[i * 3 + 2] = (Math.random() - 0.5) * area[2];
            v[i] = 0.08 + Math.random() * 0.15; // varied fall speed
            w[i] = Math.random() * Math.PI * 2; // wind phase
        }
        return { positions: p, velocities: v, windPhases: w };
    }, [count, area]);

    const ref = useRef();
    const time = useRef(0);

    useFrame((state, delta) => {
        if (!ref.current) return;
        time.current += delta;
        
        const positions = ref.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            
            // Fall down
            positions[idx + 1] -= points.velocities[i];
            
            // Wind drift (sinusoidal X movement)
            const windPhase = points.windPhases[i] + time.current * 0.5;
            positions[idx] += Math.sin(windPhase) * windStrength * delta * 2;
            
            // Slight Z drift for depth variation
            positions[idx + 2] += Math.cos(windPhase * 0.7) * windStrength * delta * 0.5;
            
            // Reset when particle falls below ground
            if (positions[idx + 1] < -10) {
                positions[idx + 1] = area[1];
                positions[idx] = (Math.random() - 0.5) * area[0];
                positions[idx + 2] = (Math.random() - 0.5) * area[2];
            }
            
            // Wrap X boundaries
            if (positions[idx] < -area[0] / 2) positions[idx] = area[0] / 2;
            if (positions[idx] > area[0] / 2) positions[idx] = -area[0] / 2;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.positions.length / 3}
                    array={points.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial 
                size={0.2} 
                color="#ffffff" 
                transparent 
                opacity={0.75} 
                sizeAttenuation 
            />
        </points>
    );
};
