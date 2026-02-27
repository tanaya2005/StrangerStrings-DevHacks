// ============================================================
//  components/Obstacles/FrostbiteZone.jsx
//  Logic: Slows down the player while they are inside.
//  Visual: Glowing blue ice platform.
// ============================================================
import React from 'react';
import { useFrame } from '@react-three/fiber';
import { aabbCollision } from '../../utils/collision';

/**
 * @param {Vector3} position - Position [x, y, z]
 * @param {Array} size - [width, height, depth]
 * @param {number} slowFactor - Speed multiplier (default 0.7)
 * @param {Object} playerRef - Ref to the local player
 */
export default function FrostbiteZone({ position, size = [6, 0.2, 6], slowFactor = 0.7, playerRef }) {
    const zonePos = { x: position[0], y: position[1], z: position[2] };
    const zoneHalfSize = { w: size[0] / 2, h: size[1] / 2, d: size[2] / 2 };
    const playerBoxSize = { w: 0.5, h: 0.5, d: 0.5 };

    useFrame(() => {
        if (!playerRef.current) return;

        const pMesh = playerRef.current.mesh;
        if (!pMesh) return;

        const pPos = pMesh.position;

        // Detection using AABB
        const isInside = aabbCollision(
            { x: pPos.x, y: pPos.y, z: pPos.z }, playerBoxSize,
            zonePos, zoneHalfSize
        );

        if (isInside) {
            // Apply slowing effect
            // We set the multiplier; Player resets it to 1.0 at start of its frame
            playerRef.current.speedMultiplier = slowFactor;
        }
    });

    return (
        <mesh position={position} receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={1.5}
                transparent
                opacity={0.8}
                roughness={0}
            />
            {/* Subtle glow rim */}
            <mesh position={[0, 0, 0]} scale={[1.05, 1, 1.05]}>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#ffffff" transparent opacity={0.1} />
            </mesh>
        </mesh>
    );
}
