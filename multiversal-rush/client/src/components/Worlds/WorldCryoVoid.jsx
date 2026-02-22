// ============================================================
//  components/Worlds/WorldCryoVoid.jsx — Cryo Void
//  Theme: Floating frozen dimension in space.
// ============================================================
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Float } from '@react-three/drei';
import * as THREE from 'three';
import PlayerCryo from '../Player/PlayerCryo';
import Snowball from '../Obstacles/Snowball';
import CrackingPlatform from '../Obstacles/CrackingPlatform';
import WindZone from '../Obstacles/WindZone';
import FrostbiteZone from '../Obstacles/FrostbiteZone';
import { aabbCollision } from '../../utils/collision';

export default function WorldCryoVoid({ emitMove, emitFinished, emitFell, emitAchievement }) {
    const playerRef = useRef();
    const portalRef = useRef();

    // Track state of special platforms
    const [platformStates, setPlatformStates] = React.useState({});

    const handlePlatformStateChange = (id, state) => {
        setPlatformStates(prev => ({ ...prev, [id]: state }));
    };

    // Static platforms
    const staticPlatforms = useMemo(() => [
        // Spawn Platform (Safe zone)
        { pos: [0, -0.5, 0], size: [12, 1, 12], color: "#1a2a4f" },

        // Slippery Ice Platforms
        { pos: [0, 0, -10], size: [6, 0.5, 8], isSlippery: true, color: "#aaddff" },
        { pos: [4, 1, -18], size: [6, 0.5, 6], isSlippery: true, color: "#aaddff" },
        { pos: [-4, 2, -26], size: [6, 0.5, 6], isSlippery: true, color: "#aaddff" },
        { pos: [0, 3, -35], size: [8, 0.5, 10], isSlippery: true, color: "#aaddff" },

        // The Downward Ice Slide
        // Start Z: -40, End Z: -65
        // We want Y to drop as Z gets more negative.
        {
            pos: [0, 1.5, -52.5],
            size: [10, 0.5, 25],
            rot: [-0.2, 0, 0], // Negative rotation on X tilts it DOWN towards -Z
            isSlippery: true,
            isSlide: true,
            color: "#b0eaff"
        },
        // Side rails
        { pos: [-5, 2.0, -52.5], size: [0.5, 1.5, 25], rot: [-0.2, 0, 0], color: "#1a2a4f" },
        { pos: [5, 2.0, -52.5], size: [0.5, 1.5, 25], rot: [-0.2, 0, 0], color: "#1a2a4f" },

        // Final Platform
        { pos: [0, -1.0, -75], size: [12, 1, 12], color: "#1a2a4f" },
    ], []);

    // Cracking Platforms configuration
    const crackingPlatsData = useMemo(() => [
        { id: 'crack1', pos: [0, -0.5, -66], size: [4, 0.5, 4] },
        { id: 'crack2', pos: [-5, -0.5, -70], size: [4, 0.5, 4] },
        { id: 'crack3', pos: [5, -0.5, -70], size: [4, 0.5, 4] },
    ], []);

    // Combined active platforms for Player collision
    const activePlatforms = useMemo(() => {
        const crackingActive = crackingPlatsData
            .filter(p => platformStates[p.id] !== 'fallen')
            .map(p => ({ ...p, isSlippery: true })); // Cracking platforms are slippery
        return [...staticPlatforms, ...crackingActive];
    }, [staticPlatforms, crackingPlatsData, platformStates]);

    // Snowball spawn points
    const snowballs = [
        [0, 1, -10],
        [4, 2, -18],
        [-4, 3, -26],
        [0, 4, -35],
    ];

    useFrame((state, delta) => {
        // Rotate portal ring
        if (portalRef.current) portalRef.current.rotation.y += delta * 1.5;

        // Check for finish line collision
        if (playerRef.current) {
            const pos = playerRef.current.position;
            if (pos.z < -70 && pos.z > -80 && Math.abs(pos.x) < 3) {
                emitFinished?.();
            }
        }
    });

    return (
        <>
            {/* ---- Environment: Icy Mountains ---- */}
            <color attach="background" args={["#e0f0ff"]} />
            <fog attach="fog" args={["#ffffff", 20, 150]} />

            <ambientLight intensity={0.7} />
            <directionalLight
                position={[50, 100, 50]}
                intensity={1.2}
                color="#ffffff"
            />
            <pointLight position={[0, 20, -35]} color="#0088ff" intensity={1} />

            {/* Background Mountains */}
            <group position={[0, -20, -100]}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <mesh key={i} position={[(i - 3) * 40, 0, -20 * Math.random()]}>
                        <coneGeometry args={[20 + Math.random() * 10, 60 + Math.random() * 20, 4]} />
                        <meshStandardMaterial color="#ffffff" emissive="#aaddff" emissiveIntensity={0.2} />
                    </mesh>
                ))}
            </group>

            {/* Snowfall Effect */}
            <Stars radius={100} depth={50} count={2000} factor={2} saturation={0} fade speed={0.5} />

            {/* ---- Static Platforms ---- */}
            {staticPlatforms.map((plat, i) => (
                <mesh
                    key={i}
                    position={plat.pos}
                    rotation={plat.rot || [0, 0, 0]}
                    receiveShadow
                >
                    <boxGeometry args={plat.size} />
                    <meshStandardMaterial
                        color={plat.color}
                        roughness={plat.isSlippery ? 0.05 : 0.8}
                        emissive={plat.isSlippery ? "#00aaff" : "#003366"}
                        emissiveIntensity={plat.isSlippery ? 0.4 : 0.1}
                    />
                </mesh>
            ))}

            {/* ---- Cracking Platforms ---- */}
            {crackingPlatsData.map((plat) => (
                <CrackingPlatform
                    key={plat.id}
                    id={plat.id}
                    position={plat.pos}
                    size={plat.size}
                    onStatusChange={handlePlatformStateChange}
                />
            ))}

            {/* ---- Obstacles ---- */}
            {snowballs.map((pos, i) => (
                <Snowball key={i} position={pos} playerRef={playerRef} />
            ))}

            {/* ---- Wind Zones ---- */}
            <WindZone
                position={[4, 2, -18]}
                windForce={-8}
                size={[8, 5, 8]}
                playerRef={playerRef}
            />
            <WindZone
                position={[-4, 3, -26]}
                windForce={8}
                size={[8, 5, 8]}
                playerRef={playerRef}
            />

            {/* ---- Frostbite Zones ---- */}
            <FrostbiteZone
                position={[0, 0, -10]}
                size={[6, 0.2, 8]}
                playerRef={playerRef}
            />
            <FrostbiteZone
                position={[4, 1, -18]}
                size={[6, 0.2, 6]}
                playerRef={playerRef}
            />

            {/* ---- Finish Portal ---- */}
            <group position={[0, 1, -75]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[1.8, 0.1, 16, 100]} />
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
                </mesh>
                <mesh>
                    <circleGeometry args={[1.7, 32]} />
                    <meshStandardMaterial color="#00ccff" transparent opacity={0.3} />
                </mesh>
            </group>

            {/* ---- Player ---- */}
            <PlayerCryo
                ref={playerRef}
                emitMove={emitMove}
                emitFell={emitFell}
                emitAchievement={emitAchievement}
                emitWorldTransition={() => { }}
                world={6}
                startPosition={[0, 1, 0]}
                platforms={activePlatforms}
            />
        </>
    );
}
