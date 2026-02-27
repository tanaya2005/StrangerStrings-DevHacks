// ============================================================
//  components/Worlds/LobbyRoom.jsx
//  Interactive 3D waiting room — shown while players wait for game.
//  Features: stairs, bouncy balls, ramps, pillars, physics-like fun.
//  Players walk around freely while the lobby UI waits.
// ============================================================
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Player from '../Player/Player';

// ── Bouncy decorative ball (spins + floats) ──────────────────
function DecorBall({ position, color, speed = 1, radius = 0.5 }) {
    const ref = useRef();
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + position[0]) * 0.4;
        ref.current.rotation.x += 0.02;
        ref.current.rotation.z += 0.01;
    });
    return (
        <mesh ref={ref} position={position} castShadow>
            <sphereGeometry args={[radius, 16, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} metalness={0.1} />
        </mesh>
    );
}

// ── Rotating portal ring (purely decorative) ──────────────────
function SpinRing({ position, color, speed = 1 }) {
    const ref = useRef();
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * speed;
    });
    return (
        <mesh ref={ref} position={position}>
            <torusGeometry args={[1.2, 0.12, 12, 48]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
        </mesh>
    );
}

// ── Staircase helper ─────────────────────────────────────────
function Staircase({ origin = [0, 0, 0], steps = 8, stepW = 4, stepH = 0.3, stepD = 0.8, color = '#37474f', dir = 'z' }) {
    return (
        <group>
            {Array.from({ length: steps }).map((_, i) => {
                const x = origin[0] + (dir === 'x' ? i * stepD : 0);
                const y = origin[1] + i * stepH;
                const z = origin[2] + (dir === 'z' ? i * stepD : 0);
                return (
                    <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
                        <boxGeometry args={[
                            dir === 'z' ? stepW : stepD,
                            stepH,
                            dir === 'z' ? stepD : stepW,
                        ]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.07} />
                    </mesh>
                );
            })}
        </group>
    );
}

// ── Ramp ─────────────────────────────────────────────────────
function Ramp({ position, rotation = [0, 0, 0], size = [6, 0.4, 10], color = '#455a64' }) {
    return (
        <mesh position={position} rotation={rotation} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.05} />
        </mesh>
    );
}

export default function LobbyRoom({ emitMove, emitFell, countdownText }) {
    // Platform layout — center room 30×30, walls, decorations
    const platforms = useMemo(() => {
        const arr = [
            // Main floor
            { pos: [0, -0.5, 0], size: [40, 1, 40] },

            // Raised stage in the center
            { pos: [0, 0.3, 0], size: [10, 0.6, 10] },

            // Upper walkway behind
            { pos: [0, 2.7, -15], size: [24, 0.6, 4] },

            // Ramp to walkway (left)
            { pos: [-9, 1.4, -7], size: [4, 0.4, 9], isSlide: true, rot: [-0.34, 0, 0] },

            // Ramp to walkway (right)
            { pos: [9, 1.4, -7], size: [4, 0.4, 9], isSlide: true, rot: [-0.34, 0, 0] },
        ];

        // Left Staircase Real Collisions
        for (let i = 0; i < 8; i++) {
            arr.push({
                pos: [-14, 0 + i * 0.35, -3 + i * 0.85],
                size: [3.5, 0.35, 0.85]
            });
        }

        // Right Staircase Real Collisions
        for (let i = 0; i < 8; i++) {
            arr.push({
                pos: [10.75, 0 + i * 0.35, -3 + i * 0.85],
                size: [3.5, 0.35, 0.85]
            });
        }

        return arr;
    }, []);

    return (
        <>
            {/* ── Atmosphere ── */}
            <color attach="background" args={['#0a0a1a']} />
            <fog attach="fog" args={['#0a0a1a', 30, 90]} />
            <Stars radius={80} depth={30} count={4000} factor={3} saturation={0} fade speed={0.5} />
            <ambientLight intensity={0.35} color="#8888ff" />
            <directionalLight position={[10, 20, 10]} intensity={0.6} color="#ffffff" castShadow />
            <pointLight position={[0, 8, 0]} color="#00ffe0" intensity={1.5} distance={30} />
            <pointLight position={[-15, 6, -10]} color="#ff00aa" intensity={1} distance={25} />
            <pointLight position={[15, 6, -10]} color="#00aaff" intensity={1} distance={25} />

            {/* ── Main Floor ── */}
            <mesh position={[0, -0.5, 0]} receiveShadow>
                <boxGeometry args={[40, 1, 40]} />
                <meshStandardMaterial color="#111122" emissive="#0a0a22" emissiveIntensity={0.3} />
            </mesh>

            {/* ── Grid lines on floor (decorative) ── */}
            {Array.from({ length: 9 }).map((_, i) => (
                <mesh key={`gx${i}`} position={[-16 + i * 4, -0.49, 0]} receiveShadow>
                    <boxGeometry args={[0.04, 0.02, 40]} />
                    <meshBasicMaterial color="#00ffe0" transparent opacity={0.15} />
                </mesh>
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
                <mesh key={`gz${i}`} position={[0, -0.49, -16 + i * 4]} receiveShadow>
                    <boxGeometry args={[40, 0.02, 0.04]} />
                    <meshBasicMaterial color="#00ffe0" transparent opacity={0.15} />
                </mesh>
            ))}

            {/* ── Center Stage ── */}
            <mesh position={[0, 0.3, 0]} receiveShadow>
                <boxGeometry args={[10, 0.6, 10]} />
                <meshStandardMaterial color="#1a1a3a" emissive="#2222aa" emissiveIntensity={0.2} />
            </mesh>

            {/* ── COUNTDOWN TEXT hovering above stage ── */}
            <Float speed={2} rotationIntensity={0} floatIntensity={0.3}>
                <Text
                    position={[0, 5, 0]}
                    fontSize={1.4}
                    color="#00ffe0"
                    anchorX="center"
                    outlineWidth={0.05}
                    outlineColor="#003344"
                >
                    {countdownText || '⏳ Waiting for players...'}
                </Text>
            </Float>

            {/* ── LEFT Staircase ── */}
            <Staircase origin={[-14, 0, -3]} steps={8} stepW={3.5} stepH={0.35} stepD={0.85} dir="z" color="#1e2a38" />

            {/* ── RIGHT Staircase ── */}
            <Staircase origin={[10.75, 0, -3]} steps={8} stepW={3.5} stepH={0.35} stepD={0.85} dir="z" color="#1e2a38" />

            {/* ── Upper walkway ── */}
            <mesh position={[0, 2.7, -15]} receiveShadow>
                <boxGeometry args={[24, 0.6, 4]} />
                <meshStandardMaterial color="#1a1a3a" emissive="#2a22aa" emissiveIntensity={0.15} />
            </mesh>

            {/* ── Ramp left ── */}
            <Ramp position={[-9, 1.4, -7]} rotation={[-0.34, 0, 0]} size={[4, 0.4, 9]} color="#0d1b2a" />

            {/* ── Ramp right ── */}
            <Ramp position={[9, 1.4, -7]} rotation={[-0.34, 0, 0]} size={[4, 0.4, 9]} color="#0d1b2a" />

            {/* ── Pillars (4 corners of center stage) ── */}
            {[[-4, -4], [4, -4], [-4, 4], [4, 4]].map(([px, pz], i) => (
                <mesh key={i} position={[px, 1.5, pz]} castShadow>
                    <cylinderGeometry args={[0.25, 0.25, 4, 8]} />
                    <meshStandardMaterial color="#223344" emissive="#00aaff" emissiveIntensity={0.3} />
                </mesh>
            ))}

            {/* ── Decorative bouncy balls scattered around ── */}
            <DecorBall position={[5, 1, 5]} color="#ff3366" speed={1.4} radius={0.55} />
            <DecorBall position={[-5, 1, 5]} color="#00ffaa" speed={0.9} radius={0.4} />
            <DecorBall position={[7, 1, -3]} color="#ffcc00" speed={1.1} radius={0.6} />
            <DecorBall position={[-7, 1, -3]} color="#aa00ff" speed={1.6} radius={0.45} />
            <DecorBall position={[0, 3.5, -15]} color="#00ccff" speed={0.8} radius={0.5} />
            <DecorBall position={[10, 3.5, -15]} color="#ff6600" speed={1.2} radius={0.4} />
            <DecorBall position={[-10, 3.5, -15]} color="#33ff33" speed={1.0} radius={0.4} />

            {/* ── Spinning decorative rings ── */}
            <SpinRing position={[0, 4.5, 0]} color="#00ffe0" speed={1.2} />
            <SpinRing position={[-14, 5, -14]} color="#ff00aa" speed={0.8} />
            <SpinRing position={[14, 5, -14]} color="#ffaa00" speed={1} />

            {/* ── Walls ── */}
            {/* Back wall */}
            <mesh position={[0, 4, -20]}>
                <boxGeometry args={[40, 10, 0.5]} />
                <meshStandardMaterial color="#0a0a1a" emissive="#0000aa" emissiveIntensity={0.05} />
            </mesh>
            {/* Left wall */}
            <mesh position={[-20, 4, 0]}>
                <boxGeometry args={[0.5, 10, 40]} />
                <meshStandardMaterial color="#0a0a1a" emissive="#0000aa" emissiveIntensity={0.05} />
            </mesh>
            {/* Right wall */}
            <mesh position={[20, 4, 0]}>
                <boxGeometry args={[0.5, 10, 40]} />
                <meshStandardMaterial color="#0a0a1a" emissive="#0000aa" emissiveIntensity={0.05} />
            </mesh>

            {/* ── Player ── */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                world={0}
                startPosition={[0, 2, 6]}
                platforms={platforms}
            />
        </>
    );
}
