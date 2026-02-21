import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { aabbCollision } from '../../utils/collision';

// Slide angle (must match the IceSlide group rotation)
const SLIDE_ANGLE = -Math.PI / 8; // ~22.5 degrees downward

/**
 * SlideSnowball — rolls down a slide lane.
 * Lives in local (slide-group) space; travels along -Z (down the slope).
 * Lane offset is applied on the X axis.
 */
export default function SlideSnowball({ id, laneX, size, speed, startZ, endZ, playerRef, onReset }) {
    const meshRef = useRef();
    const posZ = useRef(startZ);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Move down the slope (local -Z)
        posZ.current -= speed * delta;
        meshRef.current.position.z = posZ.current;

        // Rolling rotation
        meshRef.current.rotation.x += speed * delta * 0.8;

        // --- AABB Collision (world-space) ---
        if (playerRef?.current) {
            const worldPos = new THREE.Vector3();
            meshRef.current.getWorldPosition(worldPos);
            const playerPos = playerRef.current.position;

            const hit = aabbCollision(
                { x: playerPos.x, y: playerPos.y, z: playerPos.z },
                { w: 0.5, h: 0.5, d: 0.5 },
                { x: worldPos.x, y: worldPos.y, z: worldPos.z },
                { w: size / 2, h: size / 2, d: size / 2 }
            );

            if (hit) {
                // Knockback: push player up the slope (along World +Z)
                playerRef.current.position.z += 3.0;
                playerRef.current.position.y += 0.8;

                // Kill momentum if player has the velocity system
                if (playerRef.current.velocityXZ) {
                    playerRef.current.velocityXZ.multiplyScalar(0.1);
                }

                console.log(`🎿 SlideSnowball [${id}] hit! Lane: ${laneX}`);
                posZ.current = startZ; // Instant reset on collision
            }
        }

        // Loop back to top when off the bottom
        if (posZ.current < endZ) {
            posZ.current = startZ;
            onReset?.(id);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={[laneX, size / 2 + 0.3, startZ]}
            castShadow
        >
            <sphereGeometry args={[size, 20, 20]} />
            <meshStandardMaterial
                color="#e3f2fd"
                emissive="#64b5f6"
                emissiveIntensity={0.5}
                roughness={0.05}
                metalness={0.1}
            />
        </mesh>
    );
}
