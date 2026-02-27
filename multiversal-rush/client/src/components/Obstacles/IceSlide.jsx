import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import Platform from '../Obstacles/Platform';
import * as THREE from 'three';

/**
 * IceSlide — Enhanced Downhill Chaos Section
 * Rotated -22.5 degrees downwards with rolling snowball obstacles.
 * Applies active force to ensure smooth sliding experience.
 */
export default function IceSlide({ position = [0, 0, 0], playerRef }) {
    const slideRef = useRef();
    const snowballs = useRef([]);

    // Initialize snowball obstacles
    useMemo(() => {
        snowballs.current = [
            { lane: -4, z: -10, speed: 8, size: 1.5 },
            { lane: 0, z: -18, speed: 10, size: 1.8 },
            { lane: 4, z: -25, speed: 7, size: 1.6 },
            { lane: -4, z: -35, speed: 9, size: 1.7 },
            { lane: 4, z: -42, speed: 11, size: 1.4 },
        ];
    }, []);

    useFrame((state, delta) => {
        if (!playerRef?.current) return;
        const pPos = playerRef.current.position;

        // Transform player position to slide local space
        const localPos = new THREE.Vector3(
            pPos.x - position[0],
            pPos.y - position[1],
            pPos.z - position[2]
        );

        // Rotate to slide space (inverse of slide rotation)
        const angle = Math.PI / 8; // 22.5 degrees
        const rotatedZ = localPos.z * Math.cos(angle) + localPos.y * Math.sin(angle);
        const rotatedY = -localPos.z * Math.sin(angle) + localPos.y * Math.cos(angle);

        // Check if player is on the slide
        if (Math.abs(localPos.x) < 7 && rotatedZ > -55 && rotatedZ < 5 && rotatedY < 8 && rotatedY > -5) {
            // Apply ENHANCED SLIDE FORCE
            if (playerRef.current.velocityXZ) {
                // Strong downward acceleration
                const slideAccel = 55 * delta;
                playerRef.current.velocityXZ.z -= slideAccel;

                // Clamp minimum speed to ensure continuous movement
                if (playerRef.current.velocityXZ.z > -18) {
                    playerRef.current.velocityXZ.z = -18;
                }

                // Lateral stability - reduce side-to-side wobble
                playerRef.current.velocityXZ.x *= 0.96;

                // Add slight gravity boost feel
                if (playerRef.current.applyForce) {
                    playerRef.current.applyForce(0, -2 * delta, -8 * delta);
                }
            } else {
                // Fallback direct position update
                pPos.z -= 22 * delta;
            }
        }

        // Animate snowballs rolling down
        snowballs.current.forEach((ball) => {
            ball.z += ball.speed * delta;
            if (ball.z > 5) ball.z = -50; // Reset to top
        });
    });

    return (
        <group ref={slideRef} position={position} rotation={[-Math.PI / 8, 0, 0]}>

            {/* ---- 3 Lane Slide Surfaces with Enhanced Visuals ---- */}
            {/* Left Lane */}
            <Platform
                position={[-4, 0, -25]}
                scale={[4.5, 0.5, 54]}
                type="static"
                color="#80deea"
                isSlippery={true}
            />
            {/* Center Lane */}
            <Platform
                position={[0, 0, -25]}
                scale={[4.5, 0.5, 54]}
                type="static"
                color="#4dd0e1"
                isSlippery={true}
            />
            {/* Right Lane */}
            <Platform
                position={[4, 0, -25]}
                scale={[4.5, 0.5, 54]}
                type="static"
                color="#80deea"
                isSlippery={true}
            />

            {/* ---- Lane Dividers with Ice Texture ---- */}
            <mesh position={[-2.25, 0.4, -25]}>
                <boxGeometry args={[0.3, 0.6, 54]} />
                <meshStandardMaterial 
                    color="#0277bd" 
                    roughness={0.2}
                    metalness={0.3}
                />
            </mesh>
            <mesh position={[2.25, 0.4, -25]}>
                <boxGeometry args={[0.3, 0.6, 54]} />
                <meshStandardMaterial 
                    color="#0277bd"
                    roughness={0.2}
                    metalness={0.3}
                />
            </mesh>

            {/* ---- Enhanced Outer Rails ---- */}
            <mesh position={[-7, 0.8, -25]}>
                <boxGeometry args={[0.5, 1.6, 54]} />
                <meshStandardMaterial color="#01579b" />
            </mesh>
            <mesh position={[7, 0.8, -25]}>
                <boxGeometry args={[0.5, 1.6, 54]} />
                <meshStandardMaterial color="#01579b" />
            </mesh>

            {/* ---- Rolling Snowball Obstacles ---- */}
            {snowballs.current.map((ball, i) => (
                <mesh key={i} position={[ball.lane, 0.8, ball.z]}>
                    <sphereGeometry args={[ball.size, 16, 16]} />
                    <meshStandardMaterial 
                        color="#ffffff" 
                        roughness={0.7}
                        emissive="#b3e5fc"
                        emissiveIntensity={0.2}
                    />
                </mesh>
            ))}

            {/* ---- Ice Crystals for Visual Flair ---- */}
            {[...Array(12)].map((_, i) => (
                <mesh 
                    key={`crystal${i}`} 
                    position={[
                        (i % 2 === 0 ? -7.5 : 7.5),
                        1.5,
                        -5 - i * 4
                    ]}
                    rotation={[0, Math.random() * Math.PI, 0]}
                >
                    <coneGeometry args={[0.3, 1, 6]} />
                    <meshStandardMaterial 
                        color="#b3e5fc" 
                        transparent 
                        opacity={0.6}
                        emissive="#4fc3f7"
                        emissiveIntensity={0.4}
                    />
                </mesh>
            ))}
        </group>
    );
}
