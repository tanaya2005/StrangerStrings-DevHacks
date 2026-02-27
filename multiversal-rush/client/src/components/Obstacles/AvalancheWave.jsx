import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import socket from '../../socket/socket';

const AVALANCHE_START_Z = 60;   // Behind the start line (world +Z)
const AVALANCHE_END_Z = -230; // Past the finish line
const INITIAL_SPEED = 8;
const MAX_SPEED = 26;
const ACCEL = 0.8;  // Speed increase per second

// How close the wave must be (world Z) to the player to push / eliminate
const PUSH_DISTANCE = 6;
const ELIMINATE_DISTANCE = 1.5;

// How many consecutive seconds inside the danger zone before elimination
const ELIMINATE_HOLDTIME = 1.2; // seconds

/**
 * AvalancheWave
 *
 * Props:
 *   playerRef       – ref to the local player mesh
 *   onEliminate     – callback when the local player is swallowed
 *   onAvalancheEnd  – callback when wave passes the finish line
 */
export default function AvalancheWave({ playerRef, onEliminate, onAvalancheEnd }) {
    const meshRef = useRef();
    const waveZ = useRef(AVALANCHE_START_Z);   // world Z of wave front
    const speed = useRef(INITIAL_SPEED);
    const active = useRef(false);
    const dangerTimer = useRef(0);                   // seconds player has been inside wave
    const [visible, setVisible] = useState(false);
    const [danger, setDanger] = useState(false);     // red screen flash

    // ── Socket events ───────────────────────────────────────────
    useEffect(() => {
        // Server says "go!"
        socket.on('avalancheStart', () => {
            waveZ.current = AVALANCHE_START_Z;
            speed.current = INITIAL_SPEED;
            active.current = true;
            setVisible(true);
            console.log('❄️ Avalanche started!');
        });

        // Server pushes authoritative position every ~1 s to prevent drift
        socket.on('avalancheSync', ({ z, spd }) => {
            waveZ.current = z;
            if (spd !== undefined) speed.current = spd;
        });

        // Server says wave is done (everyone finished / escaped)
        socket.on('avalancheEnd', () => {
            active.current = false;
            setVisible(false);
            setDanger(false);
        });

        return () => {
            socket.off('avalancheStart');
            socket.off('avalancheSync');
            socket.off('avalancheEnd');
        };
    }, []);

    // ── Per-frame movement + collision ──────────────────────────
    useFrame((_, delta) => {
        if (!active.current || !meshRef.current) return;

        // Accelerate
        speed.current = Math.min(speed.current + ACCEL * delta, MAX_SPEED);

        // Advance wave
        waveZ.current -= speed.current * delta;
        meshRef.current.position.z = waveZ.current;

        // Check if past finish — stop
        if (waveZ.current < AVALANCHE_END_Z) {
            active.current = false;
            setVisible(false);
            setDanger(false);
            onAvalancheEnd?.();
            return;
        }

        if (!playerRef?.current) return;
        const playerZ = playerRef.current.position.z;
        const gap = playerZ - waveZ.current; // positive = player ahead of wave

        if (gap < PUSH_DISTANCE) {
            // ── Push forward ──
            const pushForce = (PUSH_DISTANCE - Math.max(gap, 0)) * 6;
            playerRef.current.position.z -= pushForce * delta;

            // Kill backward momentum
            if (playerRef.current.velocityXZ) {
                playerRef.current.velocityXZ.z = Math.min(
                    playerRef.current.velocityXZ.z,
                    -speed.current * 0.6 // force minimum forward speed
                );
            }

            setDanger(gap < ELIMINATE_DISTANCE);

            // ── Elimination timer ──
            if (gap < ELIMINATE_DISTANCE) {
                dangerTimer.current += delta;
                if (dangerTimer.current >= ELIMINATE_HOLDTIME) {
                    dangerTimer.current = 0;
                    active.current = false;
                    setVisible(false);
                    setDanger(false);
                    onEliminate?.();
                    console.log('❄️ Player eliminated by Avalanche!');
                }
            } else {
                dangerTimer.current = Math.max(0, dangerTimer.current - delta);
            }
        } else {
            setDanger(false);
            dangerTimer.current = 0;
        }
    });

    return (
        <>
            {/* ── Wave Mesh ── */}
            {visible && (
                <group ref={meshRef} position={[0, 0, AVALANCHE_START_Z]}>
                    {/* Main snow wall */}
                    <mesh position={[0, 10, 0]} castShadow>
                        <boxGeometry args={[80, 24, 8]} />
                        <meshStandardMaterial
                            color="#e3f2fd"
                            emissive="#ffffff"
                            emissiveIntensity={0.5}
                            transparent
                            opacity={0.92}
                            roughness={1}
                        />
                    </mesh>
                    {/* Foam / crest layer */}
                    <mesh position={[0, 23, 2]}>
                        <boxGeometry args={[80, 4, 5]} />
                        <meshStandardMaterial
                            color="#ffffff"
                            emissive="#ffffff"
                            emissiveIntensity={1.5}
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                </group>
            )}

            {/* ── Danger Overlay (DOM overlay via R3F portal trick) ──
                We render nothing here — parent should read `danger` state.
                Instead we use a simple canvas-level approach: inject into document.
                For now a subtle red point light simulates danger flash. */}
            {danger && visible && (
                <pointLight
                    position={[0, 5, (meshRef.current?.position.z ?? 0) + 5]}
                    color="#ff1744"
                    intensity={6}
                    distance={30}
                />
            )}
        </>
    );
}
