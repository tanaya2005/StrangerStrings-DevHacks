import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { checkAABB } from '../../utils/collision';

/**
 * LaserGrid Component
 * Toggles between Pattern A (Horizontal) and Pattern B (Vertical) every 3 seconds.
 * If player hits an active beam, they are reset (eliminated).
 */
export default function LaserGrid({ position, size = [10, 6, 2], playerRef, onHit }) {
    const groupRef = useRef();
    const [pattern, setPattern] = useState('A');
    const lastToggleTime = useRef(0);

    // Define beam geometries
    const beams = useMemo(() => {
        const horizontal = [];
        const vertical = [];

        // Pattern A: Horizontal beams (3 levels)
        for (let i = 0; i < 3; i++) {
            horizontal.push({
                pos: [0, (i * 2) - 2, 0],
                scale: [size[0], 0.1, 0.1]
            });
        }

        // Pattern B: Vertical beams (4 columns)
        for (let i = 0; i < 4; i++) {
            vertical.push({
                pos: [(i * 2.5) - 3.75, 0, 0],
                scale: [0.1, size[1], 0.1]
            });
        }

        return { A: horizontal, B: vertical };
    }, [size]);

    useFrame((state) => {
        if (!playerRef.current) return;
        const time = state.clock.elapsedTime;

        // 1. Pattern Switching (3-second cycle)
        const currentPattern = Math.floor(time / 3) % 2 === 0 ? 'A' : 'B';
        if (currentPattern !== pattern) {
            setPattern(currentPattern);
        }

        // 2. Collision Detection
        const activeBeams = beams[currentPattern];
        const playerPos = playerRef.current.position;
        if (!playerPos) return;

        const playerMin = { x: playerPos.x - 0.5, y: playerPos.y - 0.5, z: playerPos.z - 0.5 };
        const playerMax = { x: playerPos.x + 0.5, y: playerPos.y + 0.5, z: playerPos.z + 0.5 };

        for (const beam of activeBeams) {
            // Calculate beam AABB relative to group position
            const bPos = [
                position[0] + beam.pos[0],
                position[1] + beam.pos[1],
                position[2] + beam.pos[2]
            ];

            const bMin = {
                x: bPos[0] - beam.scale[0] / 2,
                y: bPos[1] - beam.scale[1] / 2,
                z: bPos[2] - beam.scale[2] / 2
            };
            const bMax = {
                x: bPos[0] + beam.scale[0] / 2,
                y: bPos[1] + beam.scale[1] / 2,
                z: bPos[2] + beam.scale[2] / 2
            };

            if (checkAABB(playerMin, playerMax, bMin, bMax)) {
                onHit?.();
                break;
            }
        }

        // 3. Visual "Hum" Animation (flicker)
        if (groupRef.current) {
            groupRef.current.children.forEach(child => {
                if (child.material) {
                    child.material.emissiveIntensity = 2 + Math.sin(time * 20) * 0.5;
                }
            });
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Render active pattern beams */}
            {beams[pattern].map((beam, i) => (
                <mesh key={`${pattern}-${i}`} position={beam.pos}>
                    <boxGeometry args={beam.scale} />
                    <meshStandardMaterial
                        color="#ff0000"
                        emissive="#ff0000"
                        emissiveIntensity={2}
                        toneMapped={false}
                    />
                </mesh>
            ))}

            {/* Decorative emitters (pillars) */}
            <mesh position={[-size[0] / 2, 0, 0]}>
                <boxGeometry args={[0.4, size[1], 0.4]} />
                <meshStandardMaterial color="#222" metalness={1} roughness={0.1} />
            </mesh>
            <mesh position={[size[0] / 2, 0, 0]}>
                <boxGeometry args={[0.4, size[1], 0.4]} />
                <meshStandardMaterial color="#222" metalness={1} roughness={0.1} />
            </mesh>
        </group>
    );
}
