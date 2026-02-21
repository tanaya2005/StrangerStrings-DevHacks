import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';
import GlitchPlatform from '../Obstacles/GlitchPlatform';
import ReverseZone from '../Obstacles/ReverseZone';
import TeleportTile from '../Obstacles/TeleportTile';
import LaserGrid from '../Obstacles/LaserGrid';
import {
    CyberpunkBuilding,
    HologramAd,
    GlitchSky,
    FlyingVehicle
} from '../Environment/NeonParadoxComponents';

/**
 * World: Neon Paradox Sector
 * Theme: Glitch + Cyberpunk City
 */
export default function WorldNeonParadox({ emitMove, emitFinished, emitFell, emitWorldTransition }) {
    const portalRef = useRef();
    const playerRef = useRef();

    // 1. Generate City Layout (Extended for 300 units)
    const city = useMemo(() => {
        const buildings = [];
        for (let i = 0; i < 25; i++) {
            buildings.push({
                pos: [-25 - Math.random() * 20, 0, -i * 12],
                h: 20 + Math.random() * 50,
                w: 7 + Math.random() * 5
            });
            buildings.push({
                pos: [25 + Math.random() * 20, 0, -i * 12],
                h: 20 + Math.random() * 50,
                w: 7 + Math.random() * 5
            });
        }
        return buildings;
    }, []);

    // 2. Generate Vehicles
    const vehicles = useMemo(() => {
        const v = [];
        for (let i = 0; i < 30; i++) {
            v.push({
                start: [(Math.random() - 0.5) * 80, 15 + Math.random() * 30, -Math.random() * 300],
                speed: 15 + Math.random() * 25,
                dir: Math.random() > 0.5 ? 1 : -1
            });
        }
        return v;
    }, []);

    // 3. Teleport Targets (Strategically safe)
    const teleportTargets = useMemo(() => [
        [0, 6, -200], // Start of Phase 4 (Short cut)
        [15, 8, -170], // Side platform (Phase 3)
        [-15, 8, -170] // Side platform (Phase 3)
    ], []);

    useFrame((state, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 2;
    });

    return (
        <>
            {/* ---- 🌌 Atmosphere & Environment ---- */}
            <GlitchSky />
            <fog attach="fog" args={["#1a0033", 40, 220]} />

            <ambientLight intensity={0.2} />
            <pointLight position={[0, 20, -50]} color="#ff00ff" intensity={1} />
            <pointLight position={[0, 20, -150]} color="#00ffff" intensity={1} />
            <pointLight position={[0, 20, -250]} color="#ff00ff" intensity={1} />

            {city.map((b, i) => (
                <CyberpunkBuilding key={i} position={b.pos} height={b.h} width={b.w} depth={b.w} />
            ))}
            {vehicles.map((v, i) => (
                <FlyingVehicle key={i} startPos={v.start} speed={v.speed} direction={v.dir} />
            ))}

            <HologramAd position={[-12, 12, -30]} text="PHASE 1: GATEWAY" color="#00ffff" />
            <HologramAd position={[12, 15, -70]} text="PHASE 2: PLATFORMING" color="#ff00ff" />
            <HologramAd position={[-15, 18, -140]} text="PHASE 4: TRIAL" color="#ff0000" />

            <Stars radius={200} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />

            {/* ---- PHASE 1: THE GATEWAY (0 to -30) ---- */}
            <Platform position={[0, -0.5, 0]} scale={[12, 1, 15]} type="static" color="#0a0a1a" />
            {/* Side-by-side pair */}
            <Platform position={[-4, 1, -15]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            <Platform position={[4, 1, -15]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            <GlitchPlatform position={[0, 2, -28]} scale={[12, 0.5, 6]} interval={4000} duration={1500} color="#ff00ff" />

            {/* ---- PHASE 2: PLATFORMING (-30 to -85) ---- */}
            {/* Side-by-side pair */}
            <Platform position={[-4, 3, -40]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            <Platform position={[4, 3, -40]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />

            <GlitchPlatform position={[0, 4, -50]} scale={[10, 0.5, 6]} interval={3000} duration={1200} color="#ff00ff" />

            {/* Side-by-side pair */}
            <Platform position={[-4.5, 5, -60]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            <Platform position={[4.5, 5, -60]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />

            <GlitchPlatform position={[0, 6, -72]} scale={[6, 0.5, 6]} interval={3000} duration={1200} color="#ff00ff" />

            {/* Side-by-side pair */}
            <Platform position={[-5, 7, -85]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            <Platform position={[5, 7, -85]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />

            {/* ---- PHASE 3: THE GLITCH NEXUS (-85 to -125) ---- */}
            <Platform position={[0, 8, -95]} scale={[10, 0.5, 10]} type="static" color="#0f0f1b" />
            <TeleportTile position={[0, 8.3, -95]} targets={teleportTargets} playerRef={playerRef} />

            {/* Split Paths */}
            <Platform position={[-12, 8, -110]} scale={[6, 0.5, 6]} type="static" color="#ff00ff" />
            <Platform position={[12, 8, -110]} scale={[6, 0.5, 6]} type="static" color="#00ffff" />
            {/* Fake Tiles */}
            <mesh position={[0, 7.8, -110]}>
                <boxGeometry args={[6, 0.1, 6]} />
                <meshStandardMaterial color="#ff00ff" transparent opacity={0.3} emissive="#ff00ff" emissiveIntensity={2} />
            </mesh>
            <GlitchPlatform position={[0, 9, -125]} scale={[8, 0.5, 6]} interval={2500} duration={1000} color="#00ffff" />

            {/* ---- PHASE 4: THE PROTOCOL TRIAL (-125 to -180) ---- */}
            {/* Section 1: Horizontal */}
            <LaserGrid
                position={[0, 11, -140]} size={[12, 6, 1]} playerRef={playerRef}
                onHit={() => { playerRef.current.position.set(0, 8, -95); emitFell?.(); }}
            />
            <Platform position={[0, 10, -140]} scale={[10, 0.5, 10]} type="static" color="#0a0a1a" />

            {/* Section 2: Vertical */}
            <LaserGrid
                position={[0, 12, -155]} size={[10, 8, 1]} playerRef={playerRef}
                onHit={() => { playerRef.current.position.set(0, 8, -95); emitFell?.(); }}
            />
            <Platform position={[0, 11, -155]} scale={[6, 0.5, 12]} type="static" color="#00ffff" />

            {/* Section 3: The Combined Grid */}
            <LaserGrid
                position={[0, 13, -167]} size={[14, 8, 1]} playerRef={playerRef}
                onHit={() => { playerRef.current.position.set(0, 8, -95); emitFell?.(); }}
            />
            <Platform position={[0, 12, -167]} scale={[10, 0.5, 8]} type="static" color="#ff00ff" />

            {/* ---- PHASE 5: ZERO-DAY FINISH (-167 to -205) ---- */}
            <GlitchPlatform position={[-4, 13, -180]} scale={[6, 0.5, 6]} interval={1500} duration={800} color="#00ffff" />
            <GlitchPlatform position={[4, 14, -190]} scale={[6, 0.5, 6]} interval={1500} duration={800} color="#ff00ff" />
            <Platform position={[0, 13.5, -205]} scale={[18, 1, 18]} type="static" color="#0a0a1a" />

            {/* Victory Portal */}
            <group position={[0, 16, -205]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[3, 0.15, 16, 100]} />
                    <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={5} toneMapped={false} />
                </mesh>
                <Text position={[0, 0, 0]} fontSize={1.2} color="#00ffff">FINISH</Text>
            </group>

            <Player
                ref={playerRef}
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={() => emitFinished?.()}
                world={4}
                startPosition={[0, 2, 0]}
            />
        </>
    );
}
