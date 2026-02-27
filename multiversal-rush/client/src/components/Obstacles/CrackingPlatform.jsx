// ============================================================
//  components/Obstacles/CrackingPlatform.jsx
//  Logic: Cracks when stood upon, falls after a timer.
//  Multiplayer: Falls faster if 2+ players are present.
// ============================================================
import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store/store';
import { aabbCollision } from '../../utils/collision';

/**
 * @param {string} id - Unique ID for the platform
 * @param {Vector3} position - Position [x, y, z]
 * @param {Vector3} size - Size [w, h, d]
 * @param {function} onStatusChange - (id, state) => void
 */
export default function CrackingPlatform({ id, position, size, onStatusChange }) {
    const meshRef = useRef();

    // States: "stable" | "cracking" | "fallen"
    const [state, setState] = useState("stable");
    const crackTimer = useRef(0);
    const respawnTimer = useRef(0);

    // Remote players and my position from store
    const players = useStore((s) => s.players);
    const myPosition = useStore((s) => s.myPosition);

    const platPos = { x: position[0], y: position[1], z: position[2] };
    const platHalfSize = { w: size[0] / 2, h: size[1] / 2, d: size[2] / 2 };
    const playerSize = { w: 0.5, h: 0.5, d: 0.5 };

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        // 1. Gather all players (local + remote)
        const allPlayers = [
            myPosition,
            ...Object.values(players).map(p => p.position)
        ].filter(p => !!p);

        // 2. Count players currently standing on this platform
        const playersOnTop = allPlayers.filter(pPos => {
            // Check if player is within X/Z bounds and slightly above the platform
            return aabbCollision(
                pPos, playerSize,
                platPos, platHalfSize
            ) && pPos.y >= platPos.y + platHalfSize.h - 0.1;
        });

        const playerCount = playersOnTop.length;

        // 3. Finite State Machine for Cracking Logic
        if (state === "stable") {
            if (playerCount > 0) {
                setState("cracking");
                onStatusChange?.(id, "cracking");
            }
        }
        else if (state === "cracking") {
            // Multiplayer Rule: Faster cracking if 2+ players (was 3)
            // Base: 1.5s for 1 player, 1.0s for 2+ players
            const crackLimit = playerCount >= 2 ? 1.0 : 1.5;
            crackTimer.current += delta;

            // Visual Shake
            meshRef.current.position.x = platPos.x + Math.sin(Date.now() * 0.05) * 0.03;

            if (crackTimer.current >= crackLimit) {
                setState("fallen");
                onStatusChange?.(id, "fallen");
                crackTimer.current = 0;
            }
        }
        else if (state === "fallen") {
            respawnTimer.current += delta;

            // Visual Fall Animation
            meshRef.current.position.y -= delta * 15;
            meshRef.current.rotation.x += delta * 2;
            meshRef.current.scale.multiplyScalar(Math.max(0, 1 - delta));

            // Respawn after 5 seconds
            if (respawnTimer.current >= 5.0) {
                setState("stable");
                onStatusChange?.(id, "stable");
                respawnTimer.current = 0;

                // Reset visual transform
                meshRef.current.position.set(...position);
                meshRef.current.rotation.set(0, 0, 0);
                meshRef.current.scale.set(1, 1, 1);
            }
        }
    });

    // Determine material color based on state
    const materialProps = useMemo(() => {
        switch (state) {
            case "cracking": return { color: "#55aaff", emissive: "#ff3300", emissiveIntensity: 0.5 };
            case "fallen": return { color: "#223344", emissive: "#000000", emissiveIntensity: 0, transparent: true, opacity: 0.5 };
            default: return { color: "#aaddff", emissive: "#00aaff", emissiveIntensity: 0.3 };
        }
    }, [state]);

    return (
        <mesh ref={meshRef} position={position} receiveShadow castShadow={state !== "fallen"}>
            <boxGeometry args={size} />
            <meshStandardMaterial {...materialProps} roughness={0.1} />
        </mesh>
    );
}
