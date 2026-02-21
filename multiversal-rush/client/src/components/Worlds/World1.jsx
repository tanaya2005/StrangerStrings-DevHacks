import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
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

export default function World1({ emitMove, emitWorldTransition, emitFell }) {
    const portalRef = useRef();
    const playerRef = useRef();

    // 1. Generate City Layout (Extended for 300 units)
    const city = useMemo(() => {
        const buildings = [];
        for (let i = 0; i < 30; i++) {
            buildings.push({
                pos: [-25 - Math.random() * 20, 0, -i * 10 - 20],
                h: 15 + Math.random() * 45,
                w: 6 + Math.random() * 6
            });
            buildings.push({
                pos: [25 + Math.random() * 20, 0, -i * 10 - 20],
                h: 15 + Math.random() * 45,
                w: 6 + Math.random() * 6
            });
        }
        return buildings;
    }, []);

    // 2. Generate Vehicles
    const vehicles = useMemo(() => {
        const v = [];
        for (let i = 0; i < 25; i++) {
            v.push({
                start: [(Math.random() - 0.5) * 70, 10 + Math.random() * 25, -Math.random() * 300],
                speed: 12 + Math.random() * 20,
                dir: Math.random() > 0.5 ? 1 : -1
            });
        }
        return v;
    }, []);

    // 3. Teleport Targets (Phased sections)
    const teleportTargets = useMemo(() => [
        [4, 2, -60],  // Phase 2 start
        [0, 10, -215], // Phase 4 start (Secret skip)
        [0, 5, 0]      // Back to spawn
    ], []);

    useFrame((_, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 0.8;
    });

    return (
        <>
            {/* ---- Neon Paradox Environment ---- */}
            <GlitchSky />
            <fog attach="fog" args={["#100020", 30, 180]} />

            {/* Lighting */}
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 20, 10]} intensity={0.5} />
            <pointLight position={[0, 8, -50]} color="#00ffff" intensity={1} />
            <pointLight position={[0, 8, -150]} color="#ff00ff" intensity={1} />
            <pointLight position={[0, 8, -250]} color="#00ffff" intensity={1} />

            {/* Background Assets */}
            {city.map((b, i) => (
                <CyberpunkBuilding key={i} position={b.pos} height={b.h} width={b.w} depth={b.w} />
            ))}
            {vehicles.map((v, i) => (
                <FlyingVehicle key={i} startPos={v.start} speed={v.speed} direction={v.dir} />
            ))}

            <HologramAd position={[-15, 12, -30]} text="CYBERVERSE: LEVEL 1" color="#00ffff" />
            <HologramAd position={[15, 15, -80]} text="NEON SECTOR" color="#ff00ff" />
            <HologramAd position={[-15, 18, -145]} text="FINAL SEQUENCE" color="#00ffff" />

            {/* ---- PHASE 1: THE GATEWAY (0 to -30) ---- */}
            <Platform position={[0, -0.5, 0]} scale={[20, 1, 20]} type="static" color="#0a1a2f" />
            <gridHelper args={[20, 20, '#00ffe0', '#003355']} position={[0, 0.01, 0]} />

            {/* Side-by-side pair */}
            <Platform position={[-4, 1, -15]} scale={[6, 0.5, 6]} type="static" color="#1a2a4a" />
            <Platform position={[4, 1, -15]} scale={[6, 0.5, 6]} type="static" color="#1a2a4a" />

            <GlitchPlatform position={[0, 2, -28]} scale={[12, 0.5, 6]} interval={4000} duration={1500} color="#ff00cc" />

            {/* ---- PHASE 2: PLATFORM CHALLENGE (-30 to -85) ---- */}
            {/* Side-by-side pair */}
            <Platform position={[-4, 3, -40]} scale={[7, 0.5, 7]} type="static" color="#00ffcc" />
            <Platform position={[4, 3, -40]} scale={[7, 0.5, 7]} type="static" color="#00ffcc" />

            <Platform position={[-8, 4, -52]} scale={[6, 0.5, 6]} type="moving" axis="x" range={6} speed={2} color="#ff00cc" />
            <Platform position={[8, 4, -58]} scale={[6, 0.5, 6]} type="moving" axis="x" range={6} speed={2.5} color="#00ffcc" />

            {/* Side-by-side pair */}
            <Platform position={[-4, 5, -65]} scale={[6, 0.5, 6]} type="rotating" speed={1.5} color="#00ffcc" />
            <Platform position={[4, 5, -65]} scale={[6, 0.5, 6]} type="rotating" speed={1.5} color="#00ffcc" />

            <GlitchPlatform position={[0, 6, -78]} scale={[8, 0.5, 6]} interval={3000} duration={1200} color="#ff00cc" />

            {/* ---- PHASE 3: THE NEXUS (-85 to -125) ---- */}
            <Platform position={[0, 8, -95]} scale={[12, 0.5, 12]} type="static" color="#0a1a2f" />
            <TeleportTile position={[0, 8.2, -95]} targets={teleportTargets} playerRef={playerRef} />

            <Platform position={[-10, 8, -110]} scale={[10, 0.5, 10]} type="static" color="#1a2a4a" />
            {/* Fake Tiles */}
            <mesh position={[10, 7.8, -110]}>
                <boxGeometry args={[10, 0.1, 10]} />
                <meshStandardMaterial color="#00ffff" transparent opacity={0.2} emissive="#00ffff" emissiveIntensity={1} />
            </mesh>
            <GlitchPlatform position={[0, 9, -125]} scale={[8, 0.5, 6]} interval={2500} duration={1000} color="#ff00cc" />

            {/* ---- PHASE 4: THE TRIAL (-125 to -180) ---- */}
            <LaserGrid
                position={[0, 11, -140]} size={[12, 6, 1]} playerRef={playerRef}
                onHit={() => { playerRef.current.position.set(0, 8, -95); emitFell?.(); }}
            />
            <Platform position={[0, 10, -140]} scale={[10, 0.5, 10]} type="static" color="#0a1a2f" />

            <LaserGrid
                position={[0, 12, -158]} size={[10, 8, 1]} playerRef={playerRef}
                onHit={() => { playerRef.current.position.set(0, 8, -95); emitFell?.(); }}
            />
            <Platform position={[0, 11, -158]} scale={[6, 0.5, 12]} type="static" color="#00ffcc" />

            <LaserGrid
                position={[0, 13, -170]} size={[15, 8, 1]} playerRef={playerRef}
                onHit={() => { playerRef.current.position.set(0, 8, -95); emitFell?.(); }}
            />
            <Platform position={[0, 12, -170]} scale={[10, 0.5, 8]} type="static" color="#ff00cc" />

            {/* ---- PHASE 5: FINAL DASH (-170 to -215) ---- */}
            <GlitchPlatform position={[-5, 13, -182]} scale={[6, 0.5, 6]} interval={4000} duration={2000} color="#00ffcc" offset={0} />
            <GlitchPlatform position={[5, 14, -192]} scale={[6, 0.5, 6]} interval={4000} duration={2000} color="#ff00cc" offset={3000} />

            <Platform position={[0, 13.5, -205]} scale={[18, 1, 18]} type="static" color="#0a1a2f" />

            {/* Finish Portal */}
            <group position={[0, 16, -205]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[2.5, 0.15, 16, 60]} />
                    <meshStandardMaterial color="#a862ff" emissive="#a862ff" emissiveIntensity={5} />
                </mesh>
                <Text position={[0, 0, 0]} fontSize={1} color="#00ffff">REACH WORLD 2</Text>
            </group>

            {/* Player */}
            <Player
                ref={playerRef}
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={emitWorldTransition}
                world={1}
                startPosition={[0, 5, 0]}
            />
        </>
    );
}
