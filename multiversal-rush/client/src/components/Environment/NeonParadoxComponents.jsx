import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * CyberpunkBuilding Component
 * Optimized with low-poly geometry and random window patterns.
 */
export const CyberpunkBuilding = ({ position, width = 4, height = 10, depth = 4, baseColor = '#0f0f1b' }) => {
    // Generate random window patterns
    const windows = useMemo(() => {
        const count = Math.floor(height / 2);
        const patterns = [];
        const colors = ['#00ffff', '#ff00ff', '#9d00ff'];

        for (let i = 0; i < count; i++) {
            patterns.push({
                y: (i * 2) - (height / 2) + 1,
                color: colors[Math.floor(Math.random() * colors.length)],
                width: Math.random() * 0.8 + 0.1,
                side: Math.floor(Math.random() * 4) // 0: north, 1: south, 2: east, 3: west
            });
        }
        return patterns;
    }, [height]);

    return (
        <group position={position}>
            {/* Main Building Body */}
            <mesh>
                <boxGeometry args={[width, height, depth]} />
                <meshStandardMaterial color={baseColor} roughness={0.9} metalness={0.1} />
            </mesh>

            {/* Neon Window Strips */}
            {windows.map((win, i) => (
                <mesh
                    key={i}
                    position={[
                        win.side === 2 ? width / 2 + 0.05 : win.side === 3 ? -width / 2 - 0.05 : 0,
                        win.y,
                        win.side === 0 ? depth / 2 + 0.05 : win.side === 1 ? -depth / 2 - 0.05 : 0
                    ]}
                >
                    <boxGeometry args={[
                        (win.side === 0 || win.side === 1) ? width * win.width : 0.05,
                        0.2,
                        (win.side === 2 || win.side === 3) ? depth * win.width : 0.05
                    ]} />
                    <meshStandardMaterial
                        color={win.color}
                        emissive={win.color}
                        emissiveIntensity={2}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
};

/**
 * HologramAd Component
 * Floating planes with glitchy text effects.
 */
export const HologramAd = ({ position, text = "SYSTEM BREACH", color = "#00ffff" }) => {
    const meshRef = useRef();
    const materialRef = useRef();

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;

        // Float effect
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.2;

        // Random glitch flicker
        if (Math.random() > 0.98) {
            materialRef.current.opacity = Math.random() * 0.5 + 0.1;
        } else {
            materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, 0.4, 0.1);
        }
    });

    return (
        <mesh ref={meshRef} position={position}>
            <planeGeometry args={[6, 2]} />
            <meshStandardMaterial
                ref={materialRef}
                color={color}
                emissive={color}
                emissiveIntensity={1.5}
                transparent
                opacity={0.4}
                side={THREE.DoubleSide}
            />
            {/* Outline logic or separate text component could go here */}
        </mesh>
    );
};

/**
 * GlitchSky Component
 * Dark purple gradient sky with horizontal glitch lines.
 */
export const GlitchSky = () => {
    const skyRef = useRef();

    useFrame((state) => {
        if (!skyRef.current) return;
        // Subtle RGB shift or flicker effect
        if (Math.random() > 0.97) {
            skyRef.current.material.color.set(Math.random() > 0.5 ? '#1a0033' : '#220044');
        }
    });

    return (
        <mesh ref={skyRef} scale={[500, 500, 500]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#140028" side={THREE.BackSide} fog={false} />
        </mesh>
    );
};

/**
 * FlyingVehicle Component
 * Low-poly cars moving in loops with neon light trails.
 */
export const FlyingVehicle = ({ startPos, direction = 1, speed = 10, range = 200 }) => {
    const meshRef = useRef();
    const trailRef = useRef();

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        meshRef.current.position.z -= speed * delta * direction;

        if (Math.abs(meshRef.current.position.z - startPos[2]) > range) {
            meshRef.current.position.z = startPos[2];
        }
    });

    return (
        <group ref={meshRef} position={startPos}>
            {/* Car Body */}
            <mesh>
                <boxGeometry args={[0.5, 0.2, 1]} />
                <meshStandardMaterial color="#222" metalness={1} roughness={0.1} />
            </mesh>
            {/* Headlights */}
            <mesh position={[0, 0, -0.6]}>
                <boxGeometry args={[0.4, 0.05, 0.1]} />
                <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={5} />
            </mesh>
            {/* Trail (Simple tail light) */}
            <mesh position={[0, 0, 0.5]}>
                <boxGeometry args={[0.4, 0.05, 0.1]} />
                <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={5} />
            </mesh>
        </group>
    );
};
