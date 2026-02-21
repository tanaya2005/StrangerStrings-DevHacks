// ============================================================
//  FrozenFrenzyArena.jsx — World 3
//  5-Phase competitive race map for Multiversal Rush.
//
//  Phase 1 — Slippery Chaos Start      Z:   0 → −70   (22%)
//  Phase 2 — Snowball Gauntlet         Z: −70 → −155  (48%)
//  Phase 3 — Wind Tunnel Bridge        Z: −155 → −220  (67%)
//  Phase 4 — Ice Slide Chaos           Z: −220 → −295  (92%)
//  Phase 5 — Avalanche Finale          Z: −295 → −330  (100%)
//
//  Avalanche triggered server-side when first player hits Z < −220.
// ============================================================
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';
import { SnowCannon } from '../Obstacles/SnowCannon';
import WindBridge from '../Obstacles/WindBridge';
import IceSlide from '../Obstacles/IceSlide';
import AvalancheWave from '../Obstacles/AvalancheWave';
import {
    SnowMountain,
    SnowTree,
    SnowParticles
} from '../Environment/FrozenFrenzyComponents';

export default function FrozenFrenzyArena({ emitMove, emitFinished, emitFell }) {
    const playerRef = useRef();
    const [eliminated, setEliminated] = useState(false);

    // ── Static Background Assets (generated once) ──────────────
    const envAssets = useMemo(() => {
        const mountains = [];
        const trees = [];

        for (let i = 0; i < 18; i++) {
            mountains.push({
                pos: [(Math.random() - 0.5) * 220, -10, -Math.random() * 340 - 20],
                scale: [1.4 + Math.random(), 1 + Math.random() * 0.8, 1.4 + Math.random()]
            });
        }
        // Trees along track edges (both sides, full length)
        for (let i = 0; i < 46; i++) {
            const side = i % 2 === 0 ? 1 : -1;
            trees.push({
                pos: [side * (16 + Math.random() * 5), 0, -i * 7],
                scale: [0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4]
            });
        }
        return { mountains, trees };
    }, []);

    // ── Finish check ────────────────────────────────────────────
    useFrame(() => {
        if (!playerRef.current) return;
        const z = playerRef.current.position.z;
        if (z < -335 && z > -345) {
            emitFinished?.();
        }
    });

    return (
        <>
            {/* ── Atmosphere ── */}
            <color attach="background" args={["#b3e5fc"]} />
            <fog attach="fog" args={["#dff6ff", 50, 220]} />
            <ambientLight intensity={0.55} />
            <directionalLight position={[15, 60, 10]} intensity={1.2} color="#ffffff" />
            <pointLight position={[0, 12, -60]} color="#80deea" intensity={0.8} />
            <pointLight position={[0, 12, -200]} color="#4fc3f7" intensity={0.7} />

            {/* ── Snow particles ── */}
            <SnowParticles count={900} area={[180, 70, 360]} />

            {/* ── Background ── */}
            {envAssets.mountains.map((m, i) => (
                <SnowMountain key={`m${i}`} position={m.pos} scale={m.scale} />
            ))}
            {envAssets.trees.map((t, i) => (
                <SnowTree key={`t${i}`} position={t.pos} scale={t.scale} />
            ))}

            {/* ── Title sign ── */}
            <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
                <Text position={[0, 9, -5]} fontSize={2.2} color="#0288d1"
                    anchorX="center" outlineWidth={0.08} outlineColor="#ffffff">
                    FROZEN FRENZY
                </Text>
            </Float>

            {/* ═══════════════════════════════════════════════════
                PHASE 1 — SLIPPERY CHAOS START   Z: 0 → -70
                Purpose: Momentum tutorial. Organic player collisions.
                No cannons. No wind. No slide.
            ═══════════════════════════════════════════════════ */}

            {/* Snow Start (not slippery — normal control to start) */}
            <Platform position={[0, -0.5, -7]} scale={[30, 1, 15]} type="static" color="#ffffff" />

            {/* Open Ice Field — wide, slippery, scattered bumpers */}
            <Platform position={[0, -0.25, -42]} scale={[28, 0.5, 55]} type="static" color="#b3e5fc" isSlippery={true} />

            {/* Scattered ice bumpers — natural multiplayer collision points */}
            {[
                [-7, 0.4, -22], [5, 0.4, -30], [-3, 0.4, -45],
                [8, 0.4, -55], [-9, 0.4, -62], [2, 0.4, -67]
            ].map(([x, y, z], i) => (
                <mesh key={`bump${i}`} position={[x, y, z]} castShadow>
                    <boxGeometry args={[2, 0.8, 2]} />
                    <meshStandardMaterial color="#e1f5fe" />
                </mesh>
            ))}

            {/* Phase label (decorative) */}
            <Text position={[0, 3, -42]} fontSize={0.6} color="#0277bd" anchorX="center">
                SLIPPERY ICE
            </Text>


            {/* ═══════════════════════════════════════════════════
                PHASE 2 — SNOWBALL GAUNTLET   Z: -70 → -155
                Slightly narrower. 5 staggered cannons across 2 zones.
                Rule: at least 1 clear lane at all times.
            ═══════════════════════════════════════════════════ */}

            {/* Gauntlet Surface */}
            <Platform position={[0, -0.25, -112]} scale={[22, 0.5, 85]} type="static" color="#81d4fa" isSlippery={true} />

            {/* Cannon Zone A — 2 cannons, staggered 1.5s apart */}
            {/* Cannon 1: Left side, large ball, slow */}
            <SnowCannon
                id="cannon_A1"
                position={[-12, 1, -88]}
                rotation={[0, 0, -Math.PI / 2]}
                speed={8}
                size={1.8}
                interval={3000}
                initialDelay={0}
                playerRef={playerRef}
            />
            {/* Cannon 2: Right side, small ball, fast — fires 1.5s after A1 */}
            <SnowCannon
                id="cannon_A2"
                position={[12, 1, -105]}
                rotation={[0, 0, Math.PI / 2]}
                speed={14}
                size={1.0}
                interval={3000}
                initialDelay={1500}
                playerRef={playerRef}
            />

            {/* Breathing Room Z: -108 → -118 (no cannons, open path) */}

            {/* Cannon Zone B — 3 cannons, staggered 0.8s each */}
            {/* Cannon 3: Left, large/slow */}
            <SnowCannon
                id="cannon_B1"
                position={[-12, 1, -125]}
                rotation={[0, 0, -Math.PI / 2]}
                speed={9}
                size={2.0}
                interval={2500}
                initialDelay={0}
                playerRef={playerRef}
            />
            {/* Cannon 4: Right, small/fast */}
            <SnowCannon
                id="cannon_B2"
                position={[12, 1, -138]}
                rotation={[0, 0, Math.PI / 2]}
                speed={15}
                size={1.0}
                interval={2500}
                initialDelay={800}
                playerRef={playerRef}
            />
            {/* Cannon 5: Left, medium */}
            <SnowCannon
                id="cannon_B3"
                position={[-12, 1, -150]}
                rotation={[0, 0, -Math.PI / 2]}
                speed={11}
                size={1.4}
                interval={2500}
                initialDelay={1600}
                playerRef={playerRef}
            />

            <Text position={[0, 3, -112]} fontSize={0.6} color="#b71c1c" anchorX="center">
                SNOWBALL GAUNTLET
            </Text>


            {/* ═══════════════════════════════════════════════════
                PHASE 3 — WIND TUNNEL BRIDGE   Z: -155 → -220
                No cannons. Pure precision + balance.
                Approach (W:5) → Core (W:4) → Recovery (W:12).
            ═══════════════════════════════════════════════════ */}

            {/* Approach bridge — slightly wider than tunnel, eases players in */}
            <Platform position={[0, 1, -162]} scale={[5, 0.5, 15]} type="static" color="#b2ebf2" isSlippery={true} />

            {/* Wind Tunnel Core — WindBridge handles physics + wind text */}
            <WindBridge
                id="wind_bridge_main"
                position={[0, 1, -190]}
            />

            {/* Exit recovery platform — snow (not slippery) to let players stabilise */}
            <Platform position={[0, 1, -210]} scale={[12, 0.5, 8]} type="static" color="#ffffff" />

            <Text position={[0, 10, -190]} fontSize={0.6} color="#0097a7" anchorX="center">
                WIND TUNNEL
            </Text>


            {/* ═══════════════════════════════════════════════════
                PHASE 4 — ICE SLIDE CHAOS   Z: -220 → -295
                3-lane slide. Rolling snowballs. Gravity speed boost.
                IceSlide handles its own geometry + SlideSnowballs.
            ═══════════════════════════════════════════════════ */}

            {/* Small drop-step entry — gives visual "entering the chaos" feel */}
            <Platform position={[0, 4, -217]} scale={[14, 0.5, 6]} type="static" color="#b2ebf2" isSlippery={true} />

            {/* IceSlide — 3 lanes, rotated -22.5° downward, 75 units long */}
            <IceSlide position={[0, 2, -220]} playerRef={playerRef} />

            <Text position={[0, 12, -225]} fontSize={0.6} color="#e65100" anchorX="center">
                ICE SLIDE CHAOS
            </Text>


            {/* ═══════════════════════════════════════════════════
                PHASE 5 — AVALANCHE FINALE   Z: -295 → -330
                Wide final straight. Slippery.
                No cannons/wind — pure sprint vs avalanche.
            ═══════════════════════════════════════════════════ */}

            {/* Final Straight — wide, slippery sprint (Moved down to align with slide exit) */}
            <Platform position={[0, -18.5, -305]} scale={[30, 1, 75]} type="static" color="#e3f2fd" isSlippery={true} />

            {/* Finish Gate (Moved down to Y: -18) */}
            <group position={[0, -18, -338]}>
                <Text position={[0, 9, 0]} fontSize={3} color="#ffffff"
                    anchorX="center" outlineWidth={0.1} outlineColor="#0288d1">
                    FINISH
                </Text>
                <mesh position={[0, 5, 0]} castShadow>
                    <torusGeometry args={[6, 0.25, 16, 100]} />
                    <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2.5} />
                </mesh>
                {/* Gate posts */}
                <mesh position={[-6, 2.5, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 10, 8]} />
                    <meshStandardMaterial color="#01579b" />
                </mesh>
                <mesh position={[6, 2.5, 0]}>
                    <cylinderGeometry args={[0.3, 0.3, 10, 8]} />
                    <meshStandardMaterial color="#01579b" />
                </mesh>
            </group>

            <Text position={[0, -10, -310]} fontSize={1} color="#880e4f" anchorX="center">
                AVALANCHE FINALE
            </Text>

            {/* ── Avalanche Wave (server-triggered at Z < -220) ── */}
            <AvalancheWave
                playerRef={playerRef}
                onEliminate={() => { setEliminated(true); emitFell?.(); }}
                onAvalancheEnd={() => console.log('❄️ Avalanche passed')}
            />

            {/* ── Local Player ── */}
            <Player
                ref={playerRef}
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={() => { }}
                world={3}
                startPosition={[0, 2, 0]}
            />
        </>
    );
}
