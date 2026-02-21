import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { checkAABB } from '../../utils/collision';

/**
 * ReverseZone Component
 * Reverses player controls (multiplier = -1) while inside.
 * Visual: Purple pulsing glitch cube.
 */
export default function ReverseZone({ position, size = [10, 5, 10], playerRef }) {
    const meshRef = useRef();

    useFrame((state) => {
        if (!playerRef.current || !meshRef.current) return;

        const time = state.clock.elapsedTime;

        // 1. Visual pulsing effect
        meshRef.current.scale.setScalar(1 + Math.sin(time * 4) * 0.05);
        meshRef.current.material.emissiveIntensity = 2 + Math.sin(time * 8) * 1;

        // 2. Collision detection (AABB)
        const playerPos = playerRef.current.position;
        if (!playerPos) return;

        // Half extents
        const hw = size[0] / 2;
        const hh = size[1] / 2;
        const hd = size[2] / 2;

        const playerMin = { x: playerPos.x - 0.5, y: playerPos.y - 0.5, z: playerPos.z - 0.5 };
        const playerMax = { x: playerPos.x + 0.5, y: playerPos.y + 0.5, z: playerPos.z + 0.5 };

        const zoneMin = { x: position[0] - hw, y: position[1] - hh, z: position[2] - hd };
        const zoneMax = { x: position[0] + hw, y: position[1] + hh, z: position[2] + hd };

        if (checkAABB(playerMin, playerMax, zoneMin, zoneMax)) {
            // Apply reverse controls
            playerRef.current.controlMultiplier = -1;
        }
    });

    return (
        <mesh position={position} ref={meshRef}>
            <boxGeometry args={size} />
            <meshStandardMaterial
                color="#9d00ff"
                emissive="#ff00ff"
                emissiveIntensity={2}
                transparent
                opacity={0.3}
                wireframe={false}
            />
            {/* Inner wireframe for 'glitch' feel */}
            <mesh>
                <boxGeometry args={[size[0] * 1.01, size[1] * 1.01, size[2] * 1.01]} />
                <meshStandardMaterial color="#ff00ff" wireframe transparent opacity={0.1} />
            </mesh>
        </mesh>
    );
}
