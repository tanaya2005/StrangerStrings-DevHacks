import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Platform from './Platform';
import * as THREE from 'three';

/**
 * WindBridge Obstacle
 * A bridge of staggered ice platforms across a wind tunnel with dynamic wind effects.
 *
 * Props:
 *   position   – [bx, by, bz] world anchor
 *   playerRef  – ref to local PlayerCryo for wind resistance physics
 *
 * Wind physics: while the player is inside the tunnel Z range,
 * we continuously apply oscillating wind force to push the player sideways.
 */
export default function WindBridge({ position, playerRef }) {
    const [bx, by, bz] = position; // e.g. [0, 1, -190]
    const windTime = useRef(0);

    // Z bounds of the wind tunnel in world space (matches FrozenFrenzyArena Phase 3)
    const TUNNEL_Z_MIN = bz - 25;   // entry
    const TUNNEL_Z_MAX = bz + 25;   // exit
    const BASE_WIND_FORCE = 12.0;   // Base wind strength

    useFrame((state, delta) => {
        if (!playerRef?.current?.position) return;
        const pz = playerRef.current.position.z;

        // Player inside the tunnel → apply dynamic crosswind
        if (pz >= TUNNEL_Z_MIN && pz <= TUNNEL_Z_MAX) {
            windTime.current += delta;
            
            // Oscillating wind with gusts
            const windWave = Math.sin(windTime.current * 1.5) * 0.7;
            const gustWave = Math.sin(windTime.current * 3.2) * 0.3;
            const windForce = BASE_WIND_FORCE * (1 + windWave + gustWave);
            
            // Apply wind force
            playerRef.current.applyForce?.(windForce * delta, 0, 0);
        }
    });

    return (
        <group>
            {/* Enhanced platforms with better spacing */}

            {/* Entrance Row: Z: -18 relative */}
            <Platform position={[bx, by, bz - 18]} scale={[14, 0.5, 10]} type="static" color="#b2ebf2" isSlippery={true} />

            {/* Row 2: Z: -10 relative - offset left */}
            <Platform position={[bx - 2, by + 0.2, bz - 10]} scale={[12, 0.5, 9]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Row 3: Z: -2 relative - offset right */}
            <Platform position={[bx + 3, by + 0.4, bz - 2]} scale={[11, 0.5, 9]} type="static" color="#ffffff" isSlippery={true} />

            {/* Row 4: Z: +6 relative - center */}
            <Platform position={[bx, by + 0.2, bz + 6]} scale={[12, 0.5, 9]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Row 5: Z: +14 relative - offset left */}
            <Platform position={[bx - 2, by, bz + 14]} scale={[13, 0.5, 9]} type="static" color="#b2ebf2" isSlippery={true} />

            {/* Exit Row: Z: +22 relative */}
            <Platform position={[bx, by, bz + 22]} scale={[14, 0.5, 10]} type="static" color="#ffffff" isSlippery={true} />

            {/* Wind visual indicators - floating particles */}
            {[...Array(8)].map((_, i) => (
                <WindIndicator key={i} position={[bx + (i % 2 === 0 ? -8 : 8), by + 2, bz - 20 + i * 6]} />
            ))}
        </group>
    );
}

// Visual wind indicator component
function WindIndicator({ position }) {
    const ref = useRef();
    const offset = useRef(Math.random() * Math.PI * 2);

    useFrame((state) => {
        if (!ref.current) return;
        const time = state.clock.elapsedTime + offset.current;
        ref.current.position.x = position[0] + Math.sin(time * 2) * 2;
        ref.current.rotation.y = time;
    });

    return (
        <mesh ref={ref} position={position}>
            <coneGeometry args={[0.3, 1, 4]} />
            <meshStandardMaterial 
                color="#b3e5fc" 
                transparent 
                opacity={0.4}
                emissive="#4fc3f7"
                emissiveIntensity={0.5}
            />
        </mesh>
    );
}
