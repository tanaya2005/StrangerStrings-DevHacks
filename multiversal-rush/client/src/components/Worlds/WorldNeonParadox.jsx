import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';
import GlitchPlatform from '../Obstacles/GlitchPlatform';
import {
    CyberpunkBuilding,
    GlitchSky,
    FlyingVehicle
} from '../Environment/NeonParadoxComponents';

/**
 * World: Neon Paradox Sector
 * Complete Redesign: Simpler, stable, checkpoints, left/right turns.
 */

const DIE_DISTANCE = 2.0;
function checkDeathHazard(pos, hazardPos, emitFell, playerRef, checkpoint) {
    if (!pos || !hazardPos) return;
    const dist = Math.sqrt((pos.x - hazardPos.x) ** 2 + (pos.y - hazardPos.y) ** 2 + (pos.z - hazardPos.z) ** 2);
    if (dist < DIE_DISTANCE) {
        pos.set(...checkpoint); // Reset to checkpoint
        if (playerRef.current) {
            // Player.jsx does not expose velocityXZ via imperative handle explicitly
            // But if it has physics quirks, resetting position is usually enough
        }
        emitFell?.();
    }
}

// ============================================================
//  OBSTACLE: Slow Rotating Neon Beam
// ============================================================
function RotatingBeam({ position, speed = 1, emitFell, playerRef, getCurrentCheckpoint }) {
    const groupRef = useRef();
    const hazard1 = useRef(new THREE.Vector3());
    const hazard2 = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y = state.clock.elapsedTime * speed;

        if (playerRef?.current?.position) {
            const pos = playerRef.current.position;
            // Get world positions of the beam ends
            groupRef.current.children[0].getWorldPosition(hazard1.current);
            groupRef.current.children[1].getWorldPosition(hazard2.current);

            checkDeathHazard(pos, hazard1.current, emitFell, playerRef, getCurrentCheckpoint());
            checkDeathHazard(pos, hazard2.current, emitFell, playerRef, getCurrentCheckpoint());
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Blade 1 */}
            <mesh position={[3, 1, 0]}>
                <boxGeometry args={[6, 0.5, 0.5]} />
                <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={2} />
            </mesh>
            {/* Blade 2 */}
            <mesh position={[-3, 1, 0]}>
                <boxGeometry args={[6, 0.5, 0.5]} />
                <meshStandardMaterial color="#ff0055" emissive="#ff0055" emissiveIntensity={2} />
            </mesh>
            {/* Core */}
            <mesh position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 2, 8]} />
                <meshStandardMaterial color="#222" />
            </mesh>
        </group>
    );
}


// ============================================================
//  MAIN WORLD
// ============================================================
export default function WorldNeonParadox({ emitMove, emitFinished, emitFell, emitWorldTransition, hidePlayer = false }) {
    const portalRef = useRef();
    const playerRef = useRef();
    const finishedRef = useRef(false);

    // Dynamic Checkpoint System
    const checkpointRef = useRef([0, 2, 0]);
    const getCurrentCheckpoint = () => checkpointRef.current;

    // 1. Generate City Layout
    const city = useMemo(() => {
        const buildings = [];
        for (let i = 0; i < 20; i++) {
            // Left block
            buildings.push({ pos: [-35, -5, -i * 15], h: 30 + Math.random() * 40, w: 8 });
            // Right block
            buildings.push({ pos: [45, -5, -i * 15], h: 30 + Math.random() * 40, w: 8 });
            // Far front block
            buildings.push({ pos: [60 + (i * 15), -5, -120], h: 30 + Math.random() * 40, w: 8 });
        }
        return buildings;
    }, []);

    // 2. Generate Ambient Vehicles
    const vehicles = useMemo(() => {
        const v = [];
        for (let i = 0; i < 20; i++) {
            v.push({
                start: [(Math.random() - 0.5) * 100, 10 + Math.random() * 20, -Math.random() * 200],
                speed: 10 + Math.random() * 20,
                dir: Math.random() > 0.5 ? 1 : -1
            });
        }
        return v;
    }, []);

    useFrame((_, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 2;

        if (playerRef.current) {
            const pos = playerRef.current.position;
            if (!pos) return;

            // Checkpoints triggers (based on coordinates)
            if (pos.z < -25 && pos.z > -35 && pos.x > 10 && pos.x < 30) checkpointRef.current = [20, 2, -30]; // Checkpoint 1: After right turn
            if (pos.z < -65 && pos.z > -75 && pos.x > 50 && pos.x < 70) checkpointRef.current = [60, 2, -70]; // Checkpoint 2: Before Narrow Path

            // Manual Death Y-Check (intercept before Player.jsx FALL_LIMIT)
            if (pos.y < -5) {
                pos.set(...checkpointRef.current);
                emitFell?.();
            }

            // Portal Victory
            if (!finishedRef.current && pos.x > 55 && pos.x < 65 && pos.z < -165) {
                finishedRef.current = true;
                emitFinished?.();
            }
        }
    });

    return (
        <>
            {/* ---- 🌌 Atmosphere & Environment ---- */}
            <GlitchSky />
            <color attach="background" args={["#050011"]} />
            <fog attach="fog" args={["#050011", 30, 180]} />

            <ambientLight intensity={0.3} />
            <pointLight position={[0, 15, -15]} color="#ff00ff" intensity={1.5} distance={50} />
            <pointLight position={[30, 15, -30]} color="#00ffff" intensity={1.5} distance={50} />
            <pointLight position={[60, 15, -80]} color="#ff00ff" intensity={1.5} distance={50} />

            {city.map((b, i) => (
                <CyberpunkBuilding key={i} position={b.pos} height={b.h} width={b.w} depth={b.w} />
            ))}
            {vehicles.map((v, i) => (
                <FlyingVehicle key={i} startPos={v.start} speed={v.speed} direction={v.dir} />
            ))}

            <Stars radius={200} depth={50} count={3000} factor={4} saturation={1} fade speed={1} />

            {/* ---- LEVEL PATH DESIGN ---- */}

            {/* 1. Straight Neon Road */}
            <Platform position={[0, 0, 0]} scale={[8, 1, 8]} type="static" color="#111133" />
            <Platform position={[0, 0, -12]} scale={[6, 0.5, 14]} type="static" color="#00ffff" />

            {/* 2. Right Turn */}
            <Platform position={[0, 0, -30]} scale={[10, 0.5, 10]} type="static" color="#ff00ff" />
            <Platform position={[10, 0, -30]} scale={[12, 0.5, 6]} type="static" color="#00ffff" />

            {/* 3. Checkpoint 1 Platform */}
            <Platform position={[24, 0, -30]} scale={[10, 0.5, 10]} type="static" color="#111133" />
            <mesh position={[24, 0.5, -30]}><cylinderGeometry args={[1.5, 1.5, 0.2, 16]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} opacity={0.3} transparent /></mesh>

            {/* 4. Moving Platform Section */}
            <Platform position={[40, 0, -30]} scale={[8, 0.5, 6]} type="moving" axis="x" range={6} speed={1.5} color="#ff00ff" />

            {/* 5. Left Turn (Moving towards -Z now) */}
            <Platform position={[60, 0, -30]} scale={[10, 0.5, 10]} type="static" color="#111133" />
            <Platform position={[60, 0, -42]} scale={[6, 0.5, 12]} type="static" color="#00ffff" />

            {/* 6. Rotating Beam Obstacle */}
            <Platform position={[60, 0, -56]} scale={[8, 0.5, 8]} type="static" color="#ff0055" />
            <RotatingBeam position={[60, 0.5, -56]} speed={1.5} playerRef={playerRef} emitFell={emitFell} getCurrentCheckpoint={getCurrentCheckpoint} />

            {/* 7. Jump Gap with Disappearing Tile */}
            <GlitchPlatform position={[60, 0, -68]} scale={[4, 0.5, 4]} interval={2500} duration={1200} color="#00ffff" />

            {/* 8. Checkpoint 2 Platform */}
            <Platform position={[60, 0, -80]} scale={[10, 0.5, 10]} type="static" color="#111133" />
            <mesh position={[60, 0.5, -80]}><cylinderGeometry args={[1.5, 1.5, 0.2, 16]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} opacity={0.3} transparent /></mesh>

            {/* 9. Narrow Neon Path */}
            <Platform position={[60, 0, -96]} scale={[2, 0.5, 20]} type="static" color="#ff00ff" />

            {/* Small safe tile */}
            <Platform position={[60, 0, -112]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />

            {/* 10. Final Elevated Bridge (Jump Steps) */}
            <Platform position={[60, 1.5, -124]} scale={[6, 0.5, 6]} type="static" color="#ff00ff" />
            <Platform position={[60, 3.0, -136]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            <Platform position={[60, 4.5, -148]} scale={[6, 0.5, 6]} type="static" color="#ff00ff" />

            {/* 11. Final Portal Platform */}
            <Platform position={[60, 4.5, -165]} scale={[12, 1, 16]} type="static" color="#111133" />

            {/* Gateway Visual Portal */}
            <group position={[60, 7.5, -170]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[3.5, 0.2, 16, 100]} />
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={3} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0, 0]}>
                    <cylinderGeometry args={[3.5, 3.5, 0.1, 32]} />
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} opacity={0.6} transparent rotation={[Math.PI / 2, 0, 0]} />
                </mesh>
            </group>

            {/* Player Component */}
            {!hidePlayer && (
                <Player
                    ref={playerRef}
                    emitMove={emitMove}
                    emitFell={emitFell}
                    emitWorldTransition={() => emitFinished?.()}
                    world={1}
                    startPosition={[0, 2, 0]}
                />
            )}
        </>
    );
}
