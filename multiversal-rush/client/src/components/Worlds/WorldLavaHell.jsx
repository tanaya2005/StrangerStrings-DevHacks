// ============================================================
//  components/Worlds/WorldLavaHell.jsx — World 5: Lava Hell ?
//  Complete Redesign: Non-linear path, dynamic obstacles, slopes.
// ============================================================
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import PlayerCryo from '../Player/PlayerCryo';
import useStore from '../../store/store';

const DIE_DISTANCE = 1.3;

function checkDeath(pos, hazardPos, emitFell, playerRef) {
    if (!pos || !hazardPos) return;
    const dist = Math.sqrt((pos.x - hazardPos.x) ** 2 + (pos.y - hazardPos.y) ** 2 + (pos.z - hazardPos.z) ** 2);
    if (dist < DIE_DISTANCE) {
        pos.set(0, 2, 0); // Reset to start
        const vel = playerRef.current?.velocityXZ;
        if (vel) vel.set(0, 0, 0);
        emitFell?.();
    }
}

// ============================================================
//  OBSTACLE 1: Rotating Flame Pillar
// ============================================================
function RotatingFlamePillar({ position, speed = 2, emitFell, playerRef }) {
    const groupRef = useRef();
    const hazard1 = useRef(new THREE.Vector3());
    const hazard2 = useRef(new THREE.Vector3());

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y += speed * delta;

        if (playerRef?.current?.position) {
            const pos = playerRef.current.position;
            // Calculate world positions of the fire hazards
            groupRef.current.children[1].getWorldPosition(hazard1.current);
            groupRef.current.children[2].getWorldPosition(hazard2.current);

            checkDeath(pos, hazard1.current, emitFell, playerRef);
            checkDeath(pos, hazard2.current, emitFell, playerRef);
        }
    });

    return (
        <group ref={groupRef} position={position}>
            {/* Center column */}
            <mesh position={[0, 2.5, 0]}>
                <boxGeometry args={[1, 5, 1]} />
                <meshStandardMaterial color="#882200" />
            </mesh>
            {/* Spikes / Flames sticking out */}
            <mesh position={[1.5, 0.5, 0]}>
                <boxGeometry args={[3, 0.5, 0.5]} />
                <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={1} />
            </mesh>
            <mesh position={[-1.5, 4.5, 0]}>
                <boxGeometry args={[3, 0.5, 0.5]} />
                <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={1} />
            </mesh>
        </group>
    );
}

// ============================================================
//  OBSTACLE 3: Moving Platform
// ============================================================
function MovingPlatform({ startPos, endPos, speed = 1, platData }) {
    const meshRef = useRef();
    const t = useRef(0);
    useFrame((_, delta) => {
        if (!meshRef.current || !platData) return;
        t.current += speed * delta;
        const pingPong = (Math.sin(t.current) + 1) / 2; // 0 to 1

        const x = THREE.MathUtils.lerp(startPos[0], endPos[0], pingPong);
        const y = THREE.MathUtils.lerp(startPos[1], endPos[1], pingPong);
        const z = THREE.MathUtils.lerp(startPos[2], endPos[2], pingPong);

        meshRef.current.position.set(x, y, z);
        platData.pos = [x, y, z]; // Dynamic AABB recalculation via reference update
    });
    return (
        <mesh ref={meshRef} position={startPos}>
            <boxGeometry args={platData.size} />
            <meshStandardMaterial color="#442200" emissive="#ff1100" emissiveIntensity={0.2} roughness={0.9} />
        </mesh>
    );
}

// ============================================================
//  OBSTACLE 4: Crumbling Rock Tile
// ============================================================
function CrumblingTile({ position, size, platData }) {
    const meshRef = useRef();
    const phase = useRef('idle'); // idle → shaking → falling → gone
    const timer = useRef(0);
    const myPos = useStore(s => s.myPosition);

    useFrame((_, delta) => {
        if (!meshRef.current || !platData) return;

        // Distance check
        const dist = Math.sqrt((myPos.x - position[0]) ** 2 + (myPos.z - position[2]) ** 2);

        if (phase.current === 'idle' && dist < 2.0 && Math.abs(myPos.y - position[1]) < 2) {
            phase.current = 'shaking';
            timer.current = 0;
        }

        if (phase.current === 'shaking') {
            timer.current += delta;
            meshRef.current.position.x = position[0] + (Math.random() - 0.5) * 0.15;
            meshRef.current.position.z = position[2] + (Math.random() - 0.5) * 0.15;
            if (timer.current > 0.5) { // 0.5 seconds fall request
                phase.current = 'falling';
                timer.current = 0;
            }
        }

        if (phase.current === 'falling') {
            timer.current += delta;
            meshRef.current.position.y -= 12 * delta;
            platData.pos = [position[0], meshRef.current.position.y, position[2]]; // Update collision
            if (timer.current > 2) phase.current = 'gone';
        }
    });

    if (phase.current === 'gone') {
        if (platData) platData.pos = [0, -999, 0]; // Remove collision
        return null;
    }

    return (
        <mesh ref={meshRef} position={position}>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#5a2800" emissive="#ff2200" emissiveIntensity={0.1} />
        </mesh>
    );
}

// ============================================================
//  OBSTACLE 5: Swinging Fire Hammer
// ============================================================
function SwingingHammer({ position, maxAngle = Math.PI / 2, speed = 2, emitFell, playerRef }) {
    const groupRef = useRef();
    const hazardPos = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * speed) * maxAngle;

            if (playerRef?.current?.position && groupRef.current.children[1]?.children[1]) {
                const pos = playerRef.current.position;
                // Get world pos of the blade
                groupRef.current.children[1].children[1].getWorldPosition(hazardPos.current);
                checkDeath(pos, hazardPos.current, emitFell, playerRef);
            }
        }
    });
    return (
        <group position={position}>
            <mesh>
                <boxGeometry args={[0.5, 1, 0.5]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            <group ref={groupRef}>
                <mesh position={[0, -3, 0]}>
                    <boxGeometry args={[0.2, 6, 0.2]} />
                    <meshStandardMaterial color="#888" />
                </mesh>
                <mesh position={[0, -6, 0]}>
                    <boxGeometry args={[3, 1.5, 1.5]} />
                    <meshStandardMaterial color="#ff3300" emissive="#ff1100" emissiveIntensity={0.8} />
                </mesh>
            </group>
        </group>
    );
}

// ============================================================
//  OBSTACLE 7: Moving Fire Walls
// ============================================================
function MovingFireWall({ position, ht = 2, speed = 1.5, offset = 0, emitFell, playerRef }) {
    const meshRef = useRef();
    const hazardPos = useRef(new THREE.Vector3());

    useFrame((state) => {
        if (!meshRef.current) return;
        const offsetVal = Math.sin(state.clock.elapsedTime * speed + offset) * 2;
        meshRef.current.position.x = position[0] + offsetVal;

        if (playerRef?.current) {
            meshRef.current.getWorldPosition(hazardPos.current);
            checkDeath(playerRef.current.position, hazardPos.current, emitFell, playerRef);
        }
    });

    return (
        <mesh ref={meshRef} position={[position[0], position[1], position[2]]}>
            <boxGeometry args={[1, ht, 1]} />
            <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={1.5} opacity={0.8} transparent />
        </mesh>
    );
}

// ============================================================
//  MAIN WORLD
// ============================================================
export default function WorldLavaHell({ emitMove, emitFinished, emitFell, emitAchievement, emitWorldTransition, emitEliminated }) {
    const playerRef = useRef();
    const portalRef = useRef();
    const finishedRef = useRef(false);

    // Dynamic platforms objects that we will mutate for AABB recalculation
    const dynPlats = useMemo(() => ({
        moving1: { pos: [-30, 4.5, -61], size: [4, 1, 4] },
        crumble1: { pos: [-30, 4.5, -52], size: [3, 1, 3] },
        crumble2: { pos: [-30, 4.5, -56], size: [3, 1, 3] },
        // Extended Map Dynamic Platforms
        moving2: { pos: [-15, 0, -104], size: [4, 1, 4] },
        crumble3: { pos: [-5, 0, -104], size: [3, 1, 3] },
    }), []);

    // Course Layout generated once
    const platformsConfig = useMemo(() => {
        const arr = [
            // Safe start
            { pos: [0, 0, 0], size: [8, 1, 8] },
            // Straight Road
            { pos: [0, 0, -11], size: [6, 1, 14] },
            // Gap before wall
            { pos: [0, 0, -22], size: [6, 1, 4] },
            // Left Turn (90 deg) Corner
            { pos: [0, 0, -32], size: [10, 1, 10] },
            // Narrow lava bridge
            { pos: [-15, 0, -32], size: [20, 1, 3] },
            // Right Turn Corner
            { pos: [-30, 0, -32], size: [10, 1, 10] },
            // Slope Up
            { pos: [-30, 2.5, -42], size: [6, 1, 14], isSlide: true, rot: [0.18, 0, 0] },
            // Gap jump landing
            { pos: [-30, 4.5, -67], size: [6, 1, 6] },
            // Slope Down
            { pos: [-30, 2.5, -78], size: [6, 1, 16], isSlide: true, rot: [-0.18, 0, 0] },
            // Final elevated bridge 1
            { pos: [-30, 0, -92], size: [8, 1, 12] },
            // Turn Left Corner
            { pos: [-30, 0, -104], size: [10, 1, 10] },
            // Bridge over X back to 0
            { pos: [-24, 0, -104], size: [2, 1, 6] }, // start jumper
            // moving2 & crumble3 take over middle gap
            // Turn Right Corner
            { pos: [0, 0, -104], size: [10, 1, 10] },
            // Final Gauntlet
            { pos: [0, 0, -116], size: [6, 1, 14] },
            { pos: [0, 0, -132], size: [6, 1, 18] },
            // Final Portal Platform
            { pos: [0, 0, -148], size: [12, 1, 12] },
        ];
        Object.values(dynPlats).forEach(p => arr.push(p));
        return arr;
    }, [dynPlats]);

    const LAVA_Y = -6;

    // Side decors (rocky road / lava visible)
    function SideDecor({ position, size, isLava }) {
        return (
            <mesh position={position}>
                <boxGeometry args={size} />
                <meshStandardMaterial
                    color={isLava ? "#ff2200" : "#2a1100"}
                    emissive={isLava ? "#ff4400" : "#000000"}
                    emissiveIntensity={isLava ? 0.8 : 0}
                    roughness={0.9}
                />
            </mesh>
        );
    }

    const { players, setMyPosition } = useStore(s => ({
        players: s.players,
        setMyPosition: s.setMyPosition
    }));

    const checkpointRef = useRef([0, 2, 0]);

    useFrame((_, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 1.5;

        if (playerRef.current) {
            const pos = playerRef.current.position;
            if (!pos) return;

            // Manual lava check + respawn without reloading
            if (pos.y < LAVA_Y) {
                pos.set(...checkpointRef.current); // Reset to checkpoint
                const vel = playerRef.current?.velocityXZ;
                if (vel) vel.set(0, 0, 0);
                emitFell?.();
            }

            // Checkpoints updates
            if (pos.z < -25 && pos.z > -35 && pos.x > -5 && pos.x < 5) checkpointRef.current = [0, 2, -32]; // After Wall/Before bridge
            if (pos.z < -60 && pos.z > -72 && pos.x > -35 && pos.x < -25) checkpointRef.current = [-30, 6, -67]; // After Slope jump
            if (pos.z < -85 && pos.z > -95 && pos.x > -35 && pos.x < -25) checkpointRef.current = [-30, 2, -92]; // Before final bridge 1
            if (pos.z < -99 && pos.z > -109 && pos.x > -5 && pos.x < 5) checkpointRef.current = [0, 2, -104]; // After X axis cross

            // Win logical verification
            if (!finishedRef.current && pos.z < -144 && pos.z > -152 && Math.abs(pos.x - 0) < 4) {
                finishedRef.current = true;
                emitFinished?.();
            }
        }

        // Dynamic win logic from store
        const activePlayers = Object.values(useStore.getState().players);
        const total = activePlayers.length || 1;
        const reqFinishers = total <= 3 ? (total === 1 ? 1 : 2) : 3;
        const finishers = activePlayers.filter(p => p.finished).length;

        if (finishers >= reqFinishers && !finishedRef.current) {
            // End match reached, freeze remaining by eliminating
            finishedRef.current = true;
            if (emitEliminated) emitEliminated();
        }
    });

    return (
        <group>
            {/* ---- Aesthetic & Atmosphere ---- */}
            <color attach="background" args={["#110000"]} />
            <fog attach="fog" args={["#330500", 15, 80]} />
            <ambientLight intensity={0.4} color="#ff3300" />
            <directionalLight position={[10, 20, 10]} intensity={0.8} color="#ff8800" />
            <pointLight position={[0, 5, -30]} color="#ff4400" intensity={2} distance={30} />
            <pointLight position={[-30, 5, -60]} color="#ff2200" intensity={2} distance={40} />
            <pointLight position={[0, 5, -120]} color="#ff3300" intensity={2} distance={40} />

            {/* ---- Lava Floor ---- */}
            <mesh position={[-15, LAVA_Y + 0.5, -70]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[200, 250]} />
                <meshStandardMaterial color="#ff2200" emissive="#ff4400" emissiveIntensity={0.8} transparent opacity={0.85} />
            </mesh>

            {/* ---- Static Path Visualization ---- */}
            {platformsConfig.map((p, i) => {
                if (Object.values(dynPlats).includes(p)) return null; // Rendered via dynamic components
                return (
                    <mesh key={`plat-${i}`} position={p.pos} rotation={p.rot || [0, 0, 0]}>
                        <boxGeometry args={p.size} />
                        <meshStandardMaterial color="#331100" />
                    </mesh>
                );
            })}

            {/* Visual Road Borders - Rocky vs Lava (Example placement) */}
            <SideDecor position={[4, 0, -10]} size={[2, 1, 20]} isLava={false} />
            <SideDecor position={[-4, -0.5, -10]} size={[2, 0.5, 20]} isLava={true} />
            <SideDecor position={[4, 0, -125]} size={[2, 1, 20]} isLava={false} />

            {/* Checkpoint Indicators (Visual only) */}
            <mesh position={[0, 0.6, -32]}><cylinderGeometry args={[1, 1, 0.2, 16]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} transparent opacity={0.3} /></mesh>
            <mesh position={[-30, 5.1, -67]}><cylinderGeometry args={[1, 1, 0.2, 16]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} transparent opacity={0.3} /></mesh>
            <mesh position={[-30, 0.6, -92]}><cylinderGeometry args={[1, 1, 0.2, 16]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} transparent opacity={0.3} /></mesh>
            <mesh position={[0, 0.6, -104]}><cylinderGeometry args={[1, 1, 0.2, 16]} /><meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} transparent opacity={0.3} /></mesh>

            {/* =====================================
                DYNAMIC OBSTACLES 
               ===================================== */}

            {/* Moving Fire Walls (Horizontal dodge) on the straight path (formerly RisingLavaWall) */}
            <MovingFireWall position={[0, 1.5, -20]} ht={2} speed={3} offset={0} emitFell={emitFell} playerRef={playerRef} />
            <MovingFireWall position={[0, 1.5, -24]} ht={2} speed={3} offset={Math.PI} emitFell={emitFell} playerRef={playerRef} />

            {/* 1. Rotating Flame Pillar inside Left Turn Corner */}
            <RotatingFlamePillar position={[0, 0.5, -32]} speed={2.5} playerRef={playerRef} emitFell={emitFell} />

            {/* 2. Narrow Lava Bridge (X from -5 to -25, already covered by platform array size 20) 
                   adding small fire hazard chunks for detail */}
            <SideDecor position={[-15, 0.5, -31]} size={[8, 0.2, 0.2]} isLava={true} />

            {/* 6. Lava Gap Jump starts around -49 to -65 */}
            {/* 4. Crumbling rock tiles before the moving platform */}
            <CrumblingTile position={[-30, 4.5, -52]} size={dynPlats.crumble1.size} platData={dynPlats.crumble1} />
            <CrumblingTile position={[-30, 4.5, -56]} size={dynPlats.crumble2.size} platData={dynPlats.crumble2} />

            {/* 3. Moving Platform over Lava */}
            <MovingPlatform startPos={[-25, 4.5, -61]} endPos={[-35, 4.5, -61]} speed={1.5} platData={dynPlats.moving1} />

            {/* 5. Swinging Fire Hammer on Elevated Final Bridge */}
            {/* Lowered to Y=7 so the 6-unit long hammer hits Y=1 (player height) */}
            <SwingingHammer position={[-30, 7, -90]} speed={2} playerRef={playerRef} emitFell={emitFell} />
            <SwingingHammer position={[-30, 7, -94]} speed={2.5} playerRef={playerRef} emitFell={emitFell} />

            {/* --- NEW EXTENSION OBSTACLES --- */}

            {/* Moving Platform crossing X axis after Left Turn Corner */}
            <MovingPlatform startPos={[-22, 0, -104]} endPos={[-10, 0, -104]} speed={2} platData={dynPlats.moving2} />
            <CrumblingTile position={[-5, 0, -104]} size={dynPlats.crumble3.size} platData={dynPlats.crumble3} />

            <RotatingFlamePillar position={[0, 0.5, -104]} speed={-3.5} playerRef={playerRef} emitFell={emitFell} />

            <MovingFireWall position={[0, 1.5, -114]} ht={2} speed={2} offset={0} emitFell={emitFell} playerRef={playerRef} />
            <MovingFireWall position={[0, 1.5, -118]} ht={2} speed={2} offset={Math.PI} emitFell={emitFell} playerRef={playerRef} />

            <SwingingHammer position={[0, 7, -128]} speed={2.5} playerRef={playerRef} emitFell={emitFell} />
            <SwingingHammer position={[0, 7, -132]} speed={3} playerRef={playerRef} emitFell={emitFell} />
            <SwingingHammer position={[0, 7, -136]} speed={2.5} maxAngle={Math.PI / 1.5} playerRef={playerRef} emitFell={emitFell} />

            {/* ---- FINAL PORTAL ---- */}
            <group position={[0, 2.5, -148]}>
                <mesh ref={portalRef}>
                    <boxGeometry args={[4, 0.5, 4]} />
                    <meshStandardMaterial color="#ff4400" emissive="#ff2200" emissiveIntensity={2} />
                </mesh>
                <mesh position={[0, 3, 0]}>
                    <boxGeometry args={[3, 5, 0.2]} />
                    <meshStandardMaterial color="#ff8800" emissive="#ff6600" emissiveIntensity={1} opacity={0.6} transparent />
                </mesh>
            </group>

            {/* ---- PLAYER ---- */}
            <PlayerCryo
                ref={playerRef}
                emitMove={emitMove}
                emitFell={emitFell}
                emitAchievement={emitAchievement}
                emitWorldTransition={emitWorldTransition}
                world={5}
                startPosition={[0, 2, 0]}
                platforms={platformsConfig}
            />
        </group>
    );
}
