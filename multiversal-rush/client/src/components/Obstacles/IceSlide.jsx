import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Platform from '../Obstacles/Platform';

/**
 * IceSlide — Downhill Chaos Section
 * Rotated -22.5 degrees downwards.
 * Now applies active force to the player to ensure they slide.
 */
export default function IceSlide({ position = [0, 0, 0], playerRef }) {
    const slideRef = useRef();

    useFrame((state, delta) => {
        if (!playerRef?.current) return;
        const pPos = playerRef.current.position;

        // Check if player is within the slide's horizontal and depth bounds
        // Slide is roughly from Z: -220 to -295 in world space
        // Width is roughly X: -7 to +7
        const dx = pPos.x - position[0];
        const dz = pPos.z - position[2];
        const dy = pPos.y - position[1];

        // Bounds check (Local space roughly)
        // The slide is 52 units long in local Z (from 0 to -52)
        // Since it's rotated, we check a box around the slide area
        if (Math.abs(dx) < 7 && dz < 2 && dz > -55 && dy < 5 && dy > -25) {
            // Apply SLIDE FORCE (Automatic movement)
            if (playerRef.current.velocityXZ) {
                // Ensure a base downward speed
                playerRef.current.velocityXZ.z = Math.min(playerRef.current.velocityXZ.z, -15);

                // Accelerate downhill
                playerRef.current.velocityXZ.z -= 45 * delta;

                // Stability
                playerRef.current.velocityXZ.x *= 0.98;
            } else {
                pPos.z -= 20 * delta;
            }
        }
    });

    return (
        <group ref={slideRef} position={position} rotation={[-Math.PI / 8, 0, 0]}>

            {/* ---- 3 Lane Slide Surfaces ---- */}
            {/* Left Lane */}
            <Platform
                position={[-4, 0, -25]}
                scale={[4.2, 0.5, 52]}
                type="static"
                color="#80deea"
                isSlippery={true}
            />
            {/* Center Lane */}
            <Platform
                position={[0, 0, -25]}
                scale={[4.2, 0.5, 52]}
                type="static"
                color="#4dd0e1"
                isSlippery={true}
            />
            {/* Right Lane */}
            <Platform
                position={[4, 0, -25]}
                scale={[4.2, 0.5, 52]}
                type="static"
                color="#80deea"
                isSlippery={true}
            />

            {/* ---- Lane Dividers ---- */}
            <mesh position={[-2, 0.4, -25]}>
                <boxGeometry args={[0.2, 0.5, 52]} />
                <meshStandardMaterial color="#0277bd" />
            </mesh>
            <mesh position={[2, 0.4, -25]}>
                <boxGeometry args={[0.2, 0.5, 52]} />
                <meshStandardMaterial color="#0277bd" />
            </mesh>

            {/* ---- Outer Rails ---- */}
            <mesh position={[-6.5, 0.6, -25]}>
                <boxGeometry args={[0.4, 1.2, 52]} />
                <meshStandardMaterial color="#01579b" />
            </mesh>
            <mesh position={[6.5, 0.6, -25]}>
                <boxGeometry args={[0.4, 1.2, 52]} />
                <meshStandardMaterial color="#01579b" />
            </mesh>
        </group>
    );
}
