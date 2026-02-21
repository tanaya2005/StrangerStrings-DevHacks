import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { checkAABB } from '../../utils/collision';

/**
 * TeleportTile Component
 * Teleports player to a random target from a predefined list.
 * Features a 3-second cooldown per player (locally tracked).
 */
export default function TeleportTile({ position, size = [2, 0.2, 2], targets = [], playerRef }) {
    const meshRef = useRef();
    const lastTeleportTime = useRef(0);
    const [isPulsing, setIsPulsing] = useState(false);

    useFrame((state) => {
        if (!meshRef.current || !playerRef.current || targets.length === 0) return;

        const time = state.clock.elapsedTime;

        // 1. Visual Glitch Effect (RGB split flicker)
        const intensity = 1.5 + Math.sin(time * 10) * 0.5;
        if (Math.random() > 0.95) {
            meshRef.current.material.emissive.set(Math.random() > 0.5 ? "#ff0000" : "#00ffff");
            meshRef.current.material.emissiveIntensity = 5;
        } else {
            meshRef.current.material.emissive.set("#0066ff");
            meshRef.current.material.emissiveIntensity = intensity;
        }

        // 2. AABB Collision Detection
        const playerPos = playerRef.current.position;
        if (!playerPos) return;

        const hw = size[0] / 2;
        const hh = size[1] / 2;
        const hd = size[2] / 2;

        const playerMin = { x: playerPos.x - 0.5, y: playerPos.y - 0.5, z: playerPos.z - 0.5 };
        const playerMax = { x: playerPos.x + 0.5, y: playerPos.y + 0.5, z: playerPos.z + 0.5 };

        const tileMin = { x: position[0] - hw, y: position[1] - hh, z: position[2] - hd };
        const tileMax = { x: position[0] + hw, y: position[1] + hh, z: position[2] + hd };

        if (checkAABB(playerMin, playerMax, tileMin, tileMax)) {
            const now = Date.now();
            // 3-second cooldown check
            if (now - lastTeleportTime.current > 3000) {
                lastTeleportTime.current = now;

                // Randomly select target
                const target = targets[Math.floor(Math.random() * targets.length)];

                // Teleport!
                playerPos.set(target[0], target[1] + 1, target[2]);

                console.log(`[Teleport] To: ${target}`);
                setIsPulsing(true);
                setTimeout(() => setIsPulsing(false), 500);
            }
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color="#001133"
                    emissive="#0066ff"
                    emissiveIntensity={1.5}
                    roughness={0.1}
                    metalness={0.8}
                />
            </mesh>

            {/* Visual indicator of active state / burst potential */}
            <mesh position={[0, 0.1, 0]}>
                <planeGeometry args={[size[0] * 0.8, size[2] * 0.8]} rotation={[-Math.PI / 2, 0, 0]} />
                <meshBasicMaterial
                    color="#00ffff"
                    transparent
                    opacity={isPulsing ? 0.8 : 0.2}
                />
            </mesh>

            {/* Glowing borders */}
            <mesh>
                <boxGeometry args={[size[0] * 1.05, size[1] * 1.05, size[2] * 1.05]} />
                <meshStandardMaterial color="#00ffff" wireframe emissive="#00ffff" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}
