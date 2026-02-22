// ============================================================
//  components/Worlds/WorldLavaHell.jsx — World 5: Lava Hell 🔥
//  Temple Run-style course with LEFT/RIGHT turns.
//  ~1:30 runtime at normal speed.
//  7 unique obstacles, max 2 jump-tile sections.
//
//  Layout (bird's eye):
//    START ─── Z- ── [Fire Pillars] ── [Jump Gap 1] ──┐
//                                           RIGHT TURN │
//    ┌── [Lava Geysers] ── [Swinging Axes] ───────────┘
//    │ LEFT TURN
//    └── [Crumble Floor] ── [Jump Gap 2] ── [Fire Walls] ── [Rolling Boulder] ── PORTAL
// ============================================================
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PlayerCryo from '../Player/PlayerCryo';

// ============================================================
//  OBSTACLE 1: FIRE PILLARS — Columns that rise/sink periodically.
//  Player must time their run to pass between them.
// ============================================================
function FirePillar({ position, phase = 0, speed = 1.5 }) {
    const meshRef = useRef();
    useFrame((state) => {
        if (!meshRef.current) return;
        const y = position[1] + Math.sin(state.clock.elapsedTime * speed + phase) * 4;
        meshRef.current.position.y = y;
    });
    return (
        <mesh ref={meshRef} position={position}>
            <cylinderGeometry args={[0.6, 0.6, 5, 8]} />
            <meshStandardMaterial color="#ff3300" emissive="#ff1100" emissiveIntensity={0.6} />
        </mesh>
    );
}

// ============================================================
//  OBSTACLE 3: LAVA GEYSERS — Erupting columns of lava that
//  shoot up periodically. Visual warning + collision.
// ============================================================
function LavaGeyser({ position, interval = 3, platformsRef, id }) {
    const meshRef = useRef();
    const active = useRef(false);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.elapsedTime;
        // Active for 1s every <interval> seconds
        const cyclePos = t % interval;
        active.current = cyclePos < 1.0;
        const targetY = active.current ? position[1] + 3 : position[1] - 3;
        meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.15);

        // Update collision platform when active
        if (platformsRef?.current?.[id]) {
            if (active.current) {
                platformsRef.current[id].pos = [position[0], meshRef.current.position.y, position[2]];
                platformsRef.current[id].size = [1.5, 6, 1.5];
            } else {
                platformsRef.current[id].pos = [position[0], -20, position[2]];
                platformsRef.current[id].size = [0.1, 0.1, 0.1];
            }
        }
    });
    return (
        <group>
            {/* Base ring (always visible) */}
            <mesh position={position}>
                <torusGeometry args={[0.8, 0.15, 8, 16]} />
                <meshStandardMaterial color="#ff6600" emissive="#ff4400" emissiveIntensity={0.5} />
            </mesh>
            {/* Erupting column */}
            <mesh ref={meshRef} position={position}>
                <cylinderGeometry args={[0.5, 0.7, 5, 8]} />
                <meshStandardMaterial
                    color="#ff4400"
                    emissive="#ff2200"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.7}
                />
            </mesh>
        </group>
    );
}

// ============================================================
//  OBSTACLE 4: SWINGING AXES — Pendulum blades that sweep across
//  the path. Player must time their pass.
// ============================================================
function SwingingAxe({ position, speed = 2, maxAngle = Math.PI / 2.5 }) {
    const groupRef = useRef();
    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * speed) * maxAngle;
    });
    return (
        <group position={position}>
            <mesh>
                <sphereGeometry args={[0.25, 6, 6]} />
                <meshStandardMaterial color="#555" />
            </mesh>
            <group ref={groupRef}>
                {/* Shaft */}
                <mesh position={[0, -2.5, 0]}>
                    <boxGeometry args={[0.2, 5, 0.2]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
                {/* Blade */}
                <mesh position={[0, -5.5, 0]}>
                    <boxGeometry args={[3, 0.3, 1]} />
                    <meshStandardMaterial color="#aaa" emissive="#ff2200" emissiveIntensity={0.3} />
                </mesh>
            </group>
        </group>
    );
}

// ============================================================
//  OBSTACLE 5: CRUMBLE FLOOR — Tiles that shake then fall
//  when the player steps near them.
// ============================================================
function CrumbleTile({ position, size, playerRef }) {
    const meshRef = useRef();
    const phase = useRef('idle'); // idle → shaking → falling → gone
    const timer = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current || !playerRef?.current) return;
        const pos = playerRef.current.position;
        if (!pos) return;

        const dist = Math.sqrt(
            (pos.x - position[0]) ** 2 + (pos.z - position[2]) ** 2
        );

        if (phase.current === 'idle' && dist < 2.5 && Math.abs(pos.y - position[1]) < 2) {
            phase.current = 'shaking';
            timer.current = 0;
        }

        if (phase.current === 'shaking') {
            timer.current += delta;
            meshRef.current.position.x = position[0] + (Math.random() - 0.5) * 0.15;
            meshRef.current.position.z = position[2] + (Math.random() - 0.5) * 0.15;
            if (timer.current > 0.6) {
                phase.current = 'falling';
                timer.current = 0;
            }
        }

        if (phase.current === 'falling') {
            timer.current += delta;
            meshRef.current.position.y -= 12 * delta;
            if (timer.current > 2) phase.current = 'gone';
        }
    });

    if (phase.current === 'gone') return null;

    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#5a2800" emissive="#ff2200" emissiveIntensity={0.1} />
        </mesh>
    );
}

// ============================================================
//  OBSTACLE 6: FIRE WALLS — Horizontal walls of fire that move
//  up and down. Player must jump or crouch to pass.
// ============================================================
function FireWall({ position, height = 1.5, speed = 1.5 }) {
    const meshRef = useRef();
    useFrame((state) => {
        if (!meshRef.current) return;
        const offset = Math.sin(state.clock.elapsedTime * speed) * 2;
        meshRef.current.position.y = position[1] + offset;
    });
    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={[8, height, 0.3]} />
            <meshStandardMaterial
                color="#ff4400"
                emissive="#ff2200"
                emissiveIntensity={1.2}
                transparent
                opacity={0.8}
            />
        </mesh>
    );
}

// ============================================================
//  OBSTACLE 7: ROLLING BOULDER — A sphere that rolls toward
//  the player along the final corridor.
// ============================================================
function RollingBoulder({ startPos, endPos, speed = 6 }) {
    const meshRef = useRef();
    const dir = useRef(1);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        meshRef.current.position.z += speed * delta * dir.current;
        meshRef.current.rotation.x += speed * delta * 0.5 * dir.current;

        if (meshRef.current.position.z > endPos[2]) dir.current = -1;
        if (meshRef.current.position.z < startPos[2]) dir.current = 1;
    });

    return (
        <mesh ref={meshRef} position={startPos}>
            <sphereGeometry args={[1.2, 12, 12]} />
            <meshStandardMaterial
                color="#4a2200"
                emissive="#331100"
                emissiveIntensity={0.3}
                roughness={0.9}
            />
        </mesh>
    );
}

// ============================================================
//  MAIN WORLD
// ============================================================
export default function WorldLavaHell({ emitMove, emitFinished, emitFell, emitAchievement, emitWorldTransition, hidePlayer = false }) {
    const playerRef = useRef();
    const portalRef = useRef();
    const geyserPlatsRef = useRef({});
    const finishedRef = useRef(false);

    // ================================================================
    //  COURSE LAYOUT — Temple Run style with 2 turns
    //
    //  Leg 1: Z = 0 → Z = -40  (straight forward)
    //  RIGHT TURN at Z = -40
    //  Leg 2: X = 0 → X = 40   (run right)
    //  LEFT TURN at X = 40
    //  Leg 3: Z = -40 → Z = -100  (forward again)
    // ================================================================

    const staticPlatforms = useMemo(() => [
        // ======== LEG 1: FORWARD (Z-) ========
        // Spawn safe zone
        { pos: [0, 0, 0], size: [8, 1, 8] },
        // Run path
        { pos: [0, 0, -6], size: [6, 1, 4] },
        // Fire pillar dodge zone
        { pos: [0, 0, -12], size: [8, 1, 6] },
        { pos: [0, 0, -18], size: [8, 1, 6] },
        // Jump gap 1 — two stepping tiles
        { pos: [-2, 0, -24], size: [3, 1, 3] },
        { pos: [2, 0.5, -28], size: [3, 1, 3] },
        // Landing + approach to turn
        { pos: [0, 0, -33], size: [6, 1, 6] },
        // CORNER TURN PLATFORM (right turn)
        { pos: [0, 0, -40], size: [10, 1, 10] },

        // ======== LEG 2: RIGHT (X+) ========
        // Geyser corridor
        { pos: [6, 0, -40], size: [4, 1, 6] },
        { pos: [12, 0, -40], size: [4, 1, 6] },
        { pos: [18, 0, -40], size: [4, 1, 6] },
        { pos: [24, 0, -40], size: [4, 1, 6] },
        // Axe gauntlet
        { pos: [30, 0, -40], size: [6, 1, 8] },
        { pos: [36, 0, -40], size: [6, 1, 8] },
        // CORNER TURN PLATFORM (left turn)
        { pos: [40, 0, -40], size: [10, 1, 10] },

        // ======== LEG 3: FORWARD AGAIN (Z-) ========
        // Crumble floor zone (tiles handled separately — these are side walls)
        { pos: [40, 0, -48], size: [6, 1, 6] },
        // Jump gap 2 — two tiles
        { pos: [38, 0.5, -55], size: [3, 1, 3] },
        { pos: [42, 1, -59], size: [3, 1, 3] },
        // Fire wall dodge corridor
        { pos: [40, 0, -65], size: [8, 1, 6] },
        { pos: [40, 0, -72], size: [8, 1, 6] },
        { pos: [40, 0, -78], size: [8, 1, 6] },
        // Boulder corridor
        { pos: [40, 0, -85], size: [6, 1, 10] },
        { pos: [40, 0, -92], size: [6, 1, 6] },
        // FINAL PLATFORM
        { pos: [40, 0, -100], size: [12, 1, 12] },
    ], []);

    // Crumble tiles (Obstacle 5)
    const crumbleTiles = useMemo(() => [
        { pos: [38, 0, -48], size: [2.5, 0.8, 2.5] },
        { pos: [40, 0, -48], size: [2.5, 0.8, 2.5] },
        { pos: [42, 0, -48], size: [2.5, 0.8, 2.5] },
        { pos: [39, 0, -51], size: [2.5, 0.8, 2.5] },
        { pos: [41, 0, -51], size: [2.5, 0.8, 2.5] },
    ], []);

    // Lava Y for death check
    const LAVA_Y = -6;

    // Geyser init
    useMemo(() => {
        ['g1', 'g2', 'g3', 'g4'].forEach(id => {
            geyserPlatsRef.current[id] = { pos: [0, -20, 0], size: [0.1, 0.1, 0.1] };
        });
    }, []);

    // Turn arrow visual
    function TurnArrow({ position, rotation, color = "#ff6600" }) {
        return (
            <group position={position} rotation={rotation}>
                <mesh>
                    <coneGeometry args={[1, 2, 4]} />
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
                </mesh>
            </group>
        );
    }

    // Side walls along corridors to guide the player
    function SideWall({ position, size }) {
        return (
            <mesh position={position}>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#2a0800" emissive="#ff1100" emissiveIntensity={0.05} />
            </mesh>
        );
    }

    useFrame((_, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 1.5;

        if (playerRef.current) {
            const pos = playerRef.current.position;
            if (!pos) return;

            // Lava death
            if (pos.y < LAVA_Y) {
                pos.set(0, 2, 0);
                emitFell?.();
            }

            // Finish portal check
            if (!finishedRef.current && pos.z < -96 && pos.z > -104 && Math.abs(pos.x - 40) < 4) {
                finishedRef.current = true;
                emitFinished?.();
            }
        }
    });

    return (
        <>
            {/* ---- Environment ---- */}
            <color attach="background" args={["#1a0000"]} />
            <fog attach="fog" args={["#220000", 20, 100]} />

            <ambientLight intensity={0.35} color="#ff6644" />
            <directionalLight position={[20, 30, 10]} intensity={0.9} color="#ffaa44" />
            <pointLight position={[0, 5, -20]} color="#ff3300" intensity={1} distance={40} />
            <pointLight position={[20, 5, -40]} color="#ff6600" intensity={1} distance={40} />
            <pointLight position={[40, 5, -80]} color="#ff4400" intensity={1} distance={40} />

            {/* ---- Lava Floor (static, below everything) ---- */}
            <mesh position={[20, LAVA_Y, -50]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial
                    color="#ff2200"
                    emissive="#ff4400"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.75}
                />
            </mesh>

            {/* ---- Volcanic backdrop ---- */}
            {[0, 1, 2, 3].map(i => (
                <mesh key={`volcano-${i}`} position={[(i - 1.5) * 40, -15, -110]}>
                    <coneGeometry args={[15 + i * 4, 50, 5]} />
                    <meshStandardMaterial color="#2a0500" emissive="#ff1100" emissiveIntensity={0.1} />
                </mesh>
            ))}

            {/* ---- Static Platforms ---- */}
            {staticPlatforms.map((p, i) => (
                <mesh key={`plat-${i}`} position={p.pos}>
                    <boxGeometry args={p.size} />
                    <meshStandardMaterial
                        color="#3a1500"
                        emissive="#ff2200"
                        emissiveIntensity={0.06}
                        roughness={0.9}
                    />
                </mesh>
            ))}

            {/* ---- SIDE WALLS (guide player through turns) ---- */}
            {/* Leg 1 walls */}
            <SideWall position={[-4, 1.5, -20]} size={[0.5, 3, 40]} />
            <SideWall position={[4, 1.5, -20]} size={[0.5, 3, 40]} />
            {/* Leg 2 walls */}
            <SideWall position={[20, 1.5, -37]} size={[40, 3, 0.5]} />
            <SideWall position={[20, 1.5, -43]} size={[40, 3, 0.5]} />
            {/* Leg 3 walls */}
            <SideWall position={[37, 1.5, -75]} size={[0.5, 3, 60]} />
            <SideWall position={[43, 1.5, -75]} size={[0.5, 3, 60]} />

            {/* ---- TURN ARROWS ---- */}
            <TurnArrow position={[3, 3, -40]} rotation={[0, -Math.PI / 2, 0]} />
            <TurnArrow position={[40, 3, -37]} rotation={[0, Math.PI, 0]} />

            {/* ============ OBSTACLE 1: FIRE PILLARS (Leg 1, z=-12 to -18) ============ */}
            <FirePillar position={[-2, 0, -12]} phase={0} speed={1.8} />
            <FirePillar position={[2, 0, -14]} phase={1.5} speed={1.5} />
            <FirePillar position={[-1, 0, -17]} phase={3} speed={2} />
            <FirePillar position={[1.5, 0, -19]} phase={0.8} speed={1.3} />

            {/* ============ OBSTACLE 2: JUMP GAP 1 (z=-24, -28) ============ */}
            {/* (Handled by the 2 small static platforms above) */}

            {/* ============ OBSTACLE 3: LAVA GEYSERS (Leg 2, along X) ============ */}
            <LavaGeyser position={[8, 0.5, -40]} interval={2.5} platformsRef={geyserPlatsRef} id="g1" />
            <LavaGeyser position={[14, 0.5, -40]} interval={3.5} platformsRef={geyserPlatsRef} id="g2" />
            <LavaGeyser position={[20, 0.5, -40]} interval={2.0} platformsRef={geyserPlatsRef} id="g3" />
            <LavaGeyser position={[26, 0.5, -40]} interval={4.0} platformsRef={geyserPlatsRef} id="g4" />

            {/* ============ OBSTACLE 4: SWINGING AXES (Leg 2, x=30-36) ============ */}
            <SwingingAxe position={[30, 8, -40]} speed={2} maxAngle={Math.PI / 2.5} />
            <SwingingAxe position={[34, 8, -40]} speed={2.5} maxAngle={Math.PI / 3} />
            <SwingingAxe position={[37, 8, -40]} speed={1.8} maxAngle={Math.PI / 2} />

            {/* ============ OBSTACLE 5: CRUMBLE FLOOR (Leg 3, z=-48 to -51) ============ */}
            {crumbleTiles.map((tile, i) => (
                <CrumbleTile
                    key={`crumble-${i}`}
                    position={tile.pos}
                    size={tile.size}
                    playerRef={playerRef}
                />
            ))}

            {/* ============ OBSTACLE 6: FIRE WALLS (Leg 3, z=-65 to -78) ============ */}
            <FireWall position={[40, 2, -65]} height={1.2} speed={1.5} />
            <FireWall position={[40, 3.5, -70]} height={1.2} speed={1.8} />
            <FireWall position={[40, 1.5, -76]} height={1.5} speed={1.2} />

            {/* ============ OBSTACLE 7: ROLLING BOULDER (Leg 3, z=-82 to -95) ============ */}
            <RollingBoulder startPos={[40, 1.5, -85]} endPos={[40, 1.5, -92]} speed={8} />

            {/* ============ JUMP GAP 2 (z=-55, -59) ============ */}
            {/* (Handled by the 2 small static platforms above) */}

            {/* ---- FINAL PORTAL ---- */}
            <group position={[40, 3.5, -100]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[2, 0.15, 16, 60]} />
                    <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={2} />
                </mesh>
                <mesh>
                    <circleGeometry args={[1.85, 32]} />
                    <meshStandardMaterial
                        color="#ff6600"
                        emissive="#ff4400"
                        emissiveIntensity={0.8}
                        transparent
                        opacity={0.4}
                    />
                </mesh>
            </group>

            {/* ---- PLAYER ---- */}
            {!hidePlayer && (
                <PlayerCryo
                    ref={playerRef}
                    emitMove={emitMove}
                    emitFell={emitFell}
                    emitAchievement={emitAchievement}
                    emitWorldTransition={() => { }}
                    world={5}
                    startPosition={[0, 2, 0]}
                    platforms={staticPlatforms}
                />
            )}
        </>
    );
}
