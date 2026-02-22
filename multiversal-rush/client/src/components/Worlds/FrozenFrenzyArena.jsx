// ============================================================
//  FrozenFrenzyArena.jsx — Frozen Frenzy Map
//  Complete race map with ice physics, snow cannons, wind tunnel, and ice slide
// ============================================================
import React, { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import PlayerCryo from '../Player/PlayerCryo';
import useStore from '../../store/store';

// ============================================================
//  SNOW PARTICLES
// ============================================================
function SnowParticles({ count = 800 }) {
    const points = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 150;
            positions[i * 3 + 1] = Math.random() * 60;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 350;
            velocities[i] = 0.05 + Math.random() * 0.1;
        }
        return { positions, velocities };
    }, [count]);

    const ref = useRef();

    useFrame(() => {
        if (!ref.current) return;
        const positions = ref.current.geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] -= points.velocities[i];
            if (positions[i * 3 + 1] < -5) {
                positions[i * 3 + 1] = 60;
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={points.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial size={0.2} color="#ffffff" transparent opacity={0.7} />
        </points>
    );
}

// ============================================================
//  SNOWBALL PROJECTILE
// ============================================================
function Snowball({ id, startPos, direction, speed, size, playerRef, onComplete }) {
    const meshRef = useRef();
    const [active, setActive] = useState(true);
    const traveled = useRef(0);

    useFrame((_, delta) => {
        if (!active || !meshRef.current) return;

        // Move
        meshRef.current.position.x += direction.x * speed * delta;
        meshRef.current.position.z += direction.z * speed * delta;
        traveled.current += speed * delta;

        // Rotate
        meshRef.current.rotation.x += delta * 4;

        // Check collision with player
        if (playerRef?.current?.position) {
            const pPos = playerRef.current.position;
            const sPos = meshRef.current.position;
            const dist = Math.sqrt(
                (pPos.x - sPos.x) ** 2 +
                (pPos.y - sPos.y) ** 2 +
                (pPos.z - sPos.z) ** 2
            );

            if (dist < size + 0.6) {
                // Hit! Apply strong knockback
                const dx = pPos.x - sPos.x;
                const dz = pPos.z - sPos.z;
                const len = Math.sqrt(dx * dx + dz * dz) || 1;
                
                // Stronger pushback force based on snowball size
                const force = 18 + size * 6;
                const fx = (dx / len) * force;
                const fz = (dz / len) * force;
                const fy = 7; // Upward bump
                
                playerRef.current.applyForce?.(fx, fy, fz);
                
                console.log(`❄️ Snowball HIT! Knockback: (${fx.toFixed(1)}, ${fy}, ${fz.toFixed(1)})`);
                
                setActive(false);
                onComplete?.(id);
            }
        }

        // Despawn after traveling far
        if (traveled.current > 40) {
            setActive(false);
            onComplete?.(id);
        }
    });

    if (!active) return null;

    return (
        <mesh ref={meshRef} position={startPos} castShadow>
            <sphereGeometry args={[size, 12, 12]} />
            <meshStandardMaterial
                color="#ffffff"
                emissive="#b3e5fc"
                emissiveIntensity={0.4}
            />
        </mesh>
    );
}

// ============================================================
//  SNOW CANNON
// ============================================================
function SnowCannon({ position, direction, speed, size, interval, delay, playerRef }) {
    const [projectiles, setProjectiles] = useState([]);
    const timerRef = useRef(0);
    const delayDone = useRef(false);

    useFrame((_, delta) => {
        timerRef.current += delta;

        if (!delayDone.current && timerRef.current >= delay) {
            delayDone.current = true;
            fire();
            timerRef.current = 0;
        }

        if (delayDone.current && timerRef.current >= interval) {
            fire();
            timerRef.current = 0;
        }
    });

    const fire = () => {
        const id = `${position[0]}_${position[2]}_${Date.now()}`;
        setProjectiles(prev => [...prev, { id, startPos: [...position] }]);
    };

    const handleComplete = (id) => {
        setProjectiles(prev => prev.filter(p => p.id !== id));
    };

    return (
        <group>
            {/* Cannon barrel */}
            <mesh position={position} rotation={[0, Math.atan2(direction.x, direction.z), Math.PI / 2]}>
                <cylinderGeometry args={[0.8, 1, 2.5, 12]} />
                <meshStandardMaterial color="#37474f" metalness={0.7} />
            </mesh>

            {/* Projectiles */}
            {projectiles.map(p => (
                <Snowball
                    key={p.id}
                    id={p.id}
                    startPos={p.startPos}
                    direction={direction}
                    speed={speed}
                    size={size}
                    playerRef={playerRef}
                    onComplete={handleComplete}
                />
            ))}
        </group>
    );
}

// ============================================================
//  WIND ZONE
// ============================================================
function WindZone({ minZ, maxZ, force, playerRef }) {
    useFrame((_, delta) => {
        if (!playerRef?.current?.position) return;
        const pz = playerRef.current.position.z;

        if (pz >= minZ && pz <= maxZ) {
            // Apply wind force
            const windForce = force * (1 + Math.sin(Date.now() * 0.002) * 0.5);
            playerRef.current.applyForce?.(windForce * delta, 0, 0);
        }
    });

    return null;
}

// ============================================================
//  ICE SLIDE
// ============================================================
function IceSlide({ position, playerRef }) {
    const slideRef = useRef();

    useFrame((_, delta) => {
        if (!playerRef?.current) return;
        const pPos = playerRef.current.position;

        // Check if player is on slide (Z: -220 to -295, X: -7 to +7)
        const dx = pPos.x - position[0];
        const dz = pPos.z - position[2];

        if (Math.abs(dx) < 7 && dz < 5 && dz > -60 && pPos.y > position[1] - 5 && pPos.y < position[1] + 10) {
            // Force downward movement
            if (playerRef.current.velocityXZ) {
                playerRef.current.velocityXZ.z -= 50 * delta;
                if (playerRef.current.velocityXZ.z > -20) {
                    playerRef.current.velocityXZ.z = -20;
                }
                // Reduce side movement
                playerRef.current.velocityXZ.x *= 0.95;
            }
        }
    });

    return (
        <group ref={slideRef} position={position} rotation={[-Math.PI / 8, 0, 0]}>
            {/* Left lane */}
            <mesh position={[-4, 0, -27]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.5, 54]} />
                <meshStandardMaterial color="#80deea" roughness={0.1} metalness={0.2} />
            </mesh>
            {/* Center lane */}
            <mesh position={[0, 0, -27]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.5, 54]} />
                <meshStandardMaterial color="#4dd0e1" roughness={0.1} metalness={0.2} />
            </mesh>
            {/* Right lane */}
            <mesh position={[4, 0, -27]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.5, 54]} />
                <meshStandardMaterial color="#80deea" roughness={0.1} metalness={0.2} />
            </mesh>

            {/* Rails */}
            <mesh position={[-6.5, 0.8, -27]}>
                <boxGeometry args={[0.5, 1.6, 54]} />
                <meshStandardMaterial color="#01579b" />
            </mesh>
            <mesh position={[6.5, 0.8, -27]}>
                <boxGeometry args={[0.5, 1.6, 54]} />
                <meshStandardMaterial color="#01579b" />
            </mesh>
        </group>
    );
}

// ============================================================
//  MAIN WORLD
// ============================================================
export default function FrozenFrenzyArena({ emitMove, emitFinished, emitFell, emitAchievement, hidePlayer = false }) {
    const playerRef = useRef();
    const finishedRef = useRef(false);
    const checkpointRef = useRef([0, 2, 0]); // Current respawn point

    // Platform configuration
    const platforms = useMemo(() => [
        // Phase 1 - Start
        { pos: [0, -0.5, -5], size: [30, 1, 20], isSlippery: false },
        { pos: [0, -0.25, -40], size: [28, 0.5, 70], isSlippery: true },

        // Phase 2 - Gauntlet
        { pos: [0, -0.25, -110], size: [22, 0.5, 80], isSlippery: true },

        // Phase 3 - Wind Tunnel
        { pos: [0, 1, -160], size: [8, 0.5, 20], isSlippery: true },
        { pos: [-2, 1.2, -175], size: [10, 0.5, 8], isSlippery: true },
        { pos: [3, 1.4, -183], size: [10, 0.5, 8], isSlippery: true },
        { pos: [0, 1.2, -191], size: [10, 0.5, 8], isSlippery: true },
        { pos: [-2, 1, -199], size: [10, 0.5, 8], isSlippery: true },
        { pos: [0, 1, -207], size: [12, 0.5, 8], isSlippery: true },
        { pos: [0, 1, -218], size: [16, 0.5, 14], isSlippery: true },

        // Phase 4 - Slide entry
        { pos: [0, 3, -225], size: [16, 0.5, 8], isSlippery: true },
        // Slide platforms (with rotation)
        { pos: [-4, 2, -252], size: [4, 0.5, 54], isSlippery: true, isSlide: true, rot: [-Math.PI / 8, 0, 0] },
        { pos: [0, 2, -252], size: [4, 0.5, 54], isSlippery: true, isSlide: true, rot: [-Math.PI / 8, 0, 0] },
        { pos: [4, 2, -252], size: [4, 0.5, 54], isSlippery: true, isSlide: true, rot: [-Math.PI / 8, 0, 0] },

        // Phase 5 - Final straight
        { pos: [0, -18.5, -310], size: [30, 1, 80], isSlippery: true },
    ], []);

    // Finish check + Checkpoint system + Fall respawn
    useFrame(() => {
        if (!playerRef.current || finishedRef.current) return;
        const pos = playerRef.current.position;
        const z = pos.z;

        // Checkpoint updates - ONLY update if moving forward (z decreasing)
        // Checkpoint 1: After Phase 1 (ice field)
        if (z < -75 && checkpointRef.current[2] === 0) {
            checkpointRef.current = [0, 1, -75];
            console.log('✅ Checkpoint 1: After Ice Field');
        }
        
        // Checkpoint 2: After Phase 2 (snow cannons)
        if (z < -155 && checkpointRef.current[2] === -75) {
            checkpointRef.current = [0, 2, -155];
            console.log('✅ Checkpoint 2: After Snow Cannons');
        }
        
        // Checkpoint 3: After Phase 3 (wind tunnel)
        if (z < -220 && checkpointRef.current[2] === -155) {
            checkpointRef.current = [0, 2, -220];
            console.log('✅ Checkpoint 3: After Wind Tunnel');
        }
        
        // Checkpoint 4: After Phase 4 (ice slide)
        if (z < -285 && checkpointRef.current[2] === -220) {
            checkpointRef.current = [0, -17, -285];
            console.log('✅ Checkpoint 4: After Ice Slide');
        }

        // Fall detection - respawn at checkpoint
        if (pos.y < -20) {
            console.log('💀 Fell! Respawning at checkpoint:', checkpointRef.current);
            pos.set(...checkpointRef.current);
            if (playerRef.current.velocityXZ) {
                playerRef.current.velocityXZ.set(0, 0, 0);
            }
            if (playerRef.current.velocityY !== undefined) {
                playerRef.current.velocityY = 0;
            }
            emitFell?.();
        }

        // Finish check
        if (z < -340) {
            finishedRef.current = true;
            emitFinished?.();
        }
    });

    return (
        <group>
            {/* Atmosphere */}
            <color attach="background" args={["#d0e8f2"]} />
            <fog attach="fog" args={["#e3f2fd", 40, 250]} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[20, 60, 10]} intensity={1.3} color="#ffffff" castShadow />
            <pointLight position={[0, 15, -60]} color="#80deea" intensity={1.2} />
            <pointLight position={[0, 15, -200]} color="#4fc3f7" intensity={1.0} />

            {/* Snow particles */}
            <SnowParticles count={800} />

            {/* Title */}
            <Text position={[0, 8, -5]} fontSize={2} color="#0288d1" anchorX="center">
                FROZEN FRENZY
            </Text>

            {/* ===== PLATFORMS ===== */}
            {platforms.map((p, i) => (
                <mesh key={`plat-${i}`} position={p.pos} rotation={p.rot || [0, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={p.size} />
                    <meshStandardMaterial
                        color={p.isSlippery ? "#b3e5fc" : "#ffffff"}
                        roughness={p.isSlippery ? 0.2 : 0.8}
                    />
                </mesh>
            ))}

            {/* Ice bumpers */}
            {[
                [-7, 0.4, -22], [5, 0.4, -30], [-3, 0.4, -45],
                [8, 0.4, -55], [-9, 0.4, -62], [2, 0.4, -67]
            ].map(([x, y, z], i) => (
                <mesh key={`bump-${i}`} position={[x, y, z]} castShadow>
                    <boxGeometry args={[2, 0.8, 2]} />
                    <meshStandardMaterial color="#e1f5fe" />
                </mesh>
            ))}

            {/* Checkpoint indicators */}
            <mesh position={[0, 1.1, -75]}>
                <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.6} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, 2.1, -155]}>
                <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.6} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, 2.1, -220]}>
                <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.6} transparent opacity={0.4} />
            </mesh>
            <mesh position={[0, -16.9, -285]}>
                <cylinderGeometry args={[1.5, 1.5, 0.2, 16]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.6} transparent opacity={0.4} />
            </mesh>

            {/* ===== SNOW CANNONS ===== */}
            <SnowCannon
                position={[-12, 1, -88]}
                direction={{ x: 1, z: 0 }}
                speed={8}
                size={1.8}
                interval={3}
                delay={0}
                playerRef={playerRef}
            />
            <SnowCannon
                position={[12, 1, -105]}
                direction={{ x: -1, z: 0 }}
                speed={14}
                size={1.0}
                interval={3}
                delay={1.5}
                playerRef={playerRef}
            />
            <SnowCannon
                position={[-12, 1, -125]}
                direction={{ x: 1, z: 0 }}
                speed={9}
                size={2.0}
                interval={2.5}
                delay={0}
                playerRef={playerRef}
            />
            <SnowCannon
                position={[12, 1, -138]}
                direction={{ x: -1, z: 0 }}
                speed={15}
                size={1.0}
                interval={2.5}
                delay={0.8}
                playerRef={playerRef}
            />
            <SnowCannon
                position={[-12, 1, -150]}
                direction={{ x: 1, z: 0 }}
                speed={11}
                size={1.4}
                interval={2.5}
                delay={1.6}
                playerRef={playerRef}
            />

            {/* ===== WIND TUNNEL ===== */}
            <WindZone minZ={-220} maxZ={-160} force={12} playerRef={playerRef} />

            {/* ===== ICE SLIDE ===== */}
            <IceSlide position={[0, 2, -225]} playerRef={playerRef} />

            {/* ===== FINISH GATE ===== */}
            <group position={[0, -18, -345]}>
                <Text position={[0, 8, 0]} fontSize={2.5} color="#ffffff" anchorX="center">
                    FINISH
                </Text>
                <mesh position={[0, 4, 0]}>
                    <torusGeometry args={[5, 0.3, 16, 100]} />
                    <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
                </mesh>
            </group>

            {/* ===== PLAYER ===== */}
            {!hidePlayer && (
                <PlayerCryo
                    ref={playerRef}
                    emitMove={emitMove}
                    emitFell={emitFell}
                    emitAchievement={emitAchievement}
                    emitWorldTransition={() => {}}
                    world={7}
                    startPosition={[0, 2, 0]}
                    platforms={platforms}
                />
            )}
        </group>
    );
}
