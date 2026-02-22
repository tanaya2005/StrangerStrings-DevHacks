import React from 'react';
import { useFrame } from '@react-three/fiber';
import Platform from './Platform';

/**
 * WindBridge Obstacle
 * A bridge of staggered ice platforms across a wind tunnel.
 *
 * Props:
 *   position   – [bx, by, bz] world anchor
 *   playerRef  – ref to local PlayerCryo for wind resistance physics
 *
 * Wind physics: while the player is inside the tunnel Z range,
 * we continuously call applyForce() with a +Z drag to push against
 * forward momentum — simulating headwind resistance.
 */
export default function WindBridge({ position, playerRef }) {
    const [bx, by, bz] = position; // e.g. [0, 1, -190]

    // Z bounds of the wind tunnel in world space (matches FrozenFrenzyArena Phase 3)
    const TUNNEL_Z_MIN = bz - 20;   // entry  (more negative)
    const TUNNEL_Z_MAX = bz + 20;   // exit   (less negative)
    const WIND_FORCE = 4.5;      // +Z push (slows forward/-Z travel)

    useFrame(() => {
        if (!playerRef?.current?.position) return;
        const pz = playerRef.current.position.z;

        // Player inside the tunnel → apply headwind drag each frame
        if (pz >= TUNNEL_Z_MIN && pz <= TUNNEL_Z_MAX) {
            // applyForce is safe to call every frame — the force decays naturally
            playerRef.current.applyForce?.(0, 0, WIND_FORCE * 0.016); // ~1 frame at 60fps
        }
    });

    return (
        <group>
            {/* All positions are absolute world coordinates */}

            {/* Entrance Row: Staggered Pair (Z: -16 relative) */}
            <Platform position={[bx - 3.5, by, bz - 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />
            <Platform position={[bx + 3.5, by, bz - 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />

            {/* Row 2: Central Platform (Z: -8 relative) */}
            <Platform position={[bx, by + 0.6, bz - 8]} scale={[6.5, 0.5, 4]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Row 3: Wide Pair (Z: 0 relative) */}
            <Platform position={[bx - 4.5, by + 1.2, bz]} scale={[3.5, 1, 3.5]} type="static" color="#ffffff" isSlippery={true} />
            <Platform position={[bx + 4.5, by + 1.2, bz]} scale={[3.5, 1, 3.5]} type="static" color="#ffffff" isSlippery={true} />

            {/* Row 4: Far Central Tile (Z: +8 relative) */}
            <Platform position={[bx, by + 0.6, bz + 8]} scale={[6.5, 0.5, 4]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Exit Row (Z: +16 relative) */}
            <Platform position={[bx - 3.5, by, bz + 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />
            <Platform position={[bx + 3.5, by, bz + 16]} scale={[3.5, 0.5, 3.5]} type="static" color="#b2ebf2" isSlippery={true} />
        </group>
    );
}
