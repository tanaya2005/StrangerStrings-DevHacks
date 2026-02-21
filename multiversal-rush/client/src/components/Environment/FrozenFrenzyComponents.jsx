import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 1. Snow Mountain Component
// Optimized: Low-poly cone geometry, shared material
export const SnowMountain = ({ position, scale = [1, 1, 1] }) => {
    return (
        <mesh position={position} scale={scale}>
            <coneGeometry args={[15, 40, 6]} />
            <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
    );
};

// 2. Snow Tree Component
// Optimized: Simple stacked cones, no collision
export const SnowTree = ({ position, scale = [1, 1, 1] }) => {
    return (
        <group position={position} scale={scale}>
            {/* Trunk */}
            <mesh position={[0, 1, 0]}>
                <cylinderGeometry args={[0.3, 0.4, 2, 8]} />
                <meshStandardMaterial color="#5d4037" />
            </mesh>
            {/* Foliage */}
            <mesh position={[0, 2.5, 0]}>
                <coneGeometry args={[1.5, 2.5, 6]} />
                <meshStandardMaterial color="#2e7d32" flatShading />
            </mesh>
            <mesh position={[0, 4, 0]}>
                <coneGeometry args={[1.2, 2, 6]} />
                <meshStandardMaterial color="#2e7d32" flatShading />
            </mesh>
            {/* Snow Cap */}
            <mesh position={[0, 4.8, 0]}>
                <coneGeometry args={[0.5, 0.8, 6]} />
                <meshStandardMaterial color="#ffffff" flatShading />
            </mesh>
        </group>
    );
};

// 3. Ice Slide Base Mesh
// Optimized: A single plane with a curve or angle
export const IceSlide = ({ position, rotation, scale = [1, 1, 1] }) => {
    return (
        <mesh position={position} rotation={rotation} scale={scale}>
            <boxGeometry args={[12, 0.5, 30]} />
            <meshStandardMaterial
                color="#80deea"
                transparent
                opacity={0.8}
                roughness={0}
                metalness={0.2}
            />
        </mesh>
    );
};

// 4. Snow Particle Effect
// Optimized: Simple particles falling in a local volume
export const SnowParticles = ({ count = 500, area = [50, 50, 50] }) => {
    const points = useMemo(() => {
        const p = new Float32Array(count * 3);
        const v = new Float32Array(count); // velocity
        for (let i = 0; i < count; i++) {
            p[i * 3] = (Math.random() - 0.5) * area[0];
            p[i * 3 + 1] = Math.random() * area[1];
            p[i * 3 + 2] = (Math.random() - 0.5) * area[2];
            v[i] = 0.05 + Math.random() * 0.1;
        }
        return { positions: p, velocities: v };
    }, [count, area]);

    const ref = useRef();

    useFrame((state, delta) => {
        if (!ref.current) return;
        const positions = ref.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] -= points.velocities[i];
            if (positions[i * 3 + 1] < -10) {
                positions[i * 3 + 1] = area[1];
            }
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
            <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
        </points>
    );
};
