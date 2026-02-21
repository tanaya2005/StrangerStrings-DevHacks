// ============================================================
//  components/Obstacles/WindZone.jsx
//  Logic: Applies sideways force and slows down players inside.
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { aabbCollision } from '../../utils/collision';

/**
 * @param {Vector3} position - Center of the zone
 * @param {number} windForce - Speed of sideways push (positive or negative X)
 * @param {Array} size - [width, height, depth]
 * @param {Object} playerRef - Ref to the local player
 */
export default function WindZone({ position, windForce = 5, size = [10, 5, 10], playerRef }) {
    const zonePos = { x: position[0], y: position[1], z: position[2] };
    const zoneHalfSize = { w: size[0] / 2, h: size[1] / 2, d: size[2] / 2 };
    const playerBoxSize = { w: 0.5, h: 0.5, d: 0.5 };

    useFrame((_, delta) => {
        if (!playerRef.current) return;

        const pPos = playerRef.current.position;
        const pVel = playerRef.current.velocityXZ;

        if (!pPos || !pVel) return;

        // Collision Check (AABB)
        const isInside = aabbCollision(
            { x: pPos.x, y: pPos.y, z: pPos.z }, playerBoxSize,
            zonePos, zoneHalfSize
        );

        if (isInside) {
            // Apply sideways push
            pVel.x += windForce * delta;

            // Reduce forward speed slightly (drag)
            // Multiplying by 0.8 per second (handled via delta)
            const dragFactor = Math.pow(0.8, delta);
            pVel.z *= dragFactor;
        }
    });

    return (
        <group position={position}>
            {/* Invisible Trigger Mesh */}
            <mesh visible={false}>
                <boxGeometry args={size} />
                <meshStandardMaterial transparent opacity={0.1} />
            </mesh>

            {/* Subtle Visual Effect: Localized snow particles to indicate wind */}
            <Stars
                radius={Math.max(...size) / 2}
                depth={2}
                count={50}
                factor={1}
                saturation={0}
                fade
                speed={windForce * 0.5}
            />
        </group>
    );
}
