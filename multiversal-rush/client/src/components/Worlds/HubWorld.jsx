// ============================================================
//  components/Worlds/HubWorld.jsx — 15-sec Pre-Game Lobby Room
//  Players hang out here while countdown runs before random map.
//  No portals — just an interactive space with:
//    • Staircase to a rooftop deck
//    • Floating decorative rings
//    • Bouncy glowing orbs
//    • Dark space atmosphere + star skybox
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Float, Text } from '@react-three/drei';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';

// ── Small glowing orb that bobs up and down ─────────────────
function GlowOrb({ position, color, speed = 1.2, size = 0.45 }) {
    const ref = useRef();
    useFrame((state) => {
        if (!ref.current) return;
        ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + position[0]) * 0.5;
    });
    return (
        <mesh ref={ref} position={position}>
            <sphereGeometry args={[size, 14, 14]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
        </mesh>
    );
}

// ── Slow-spinning torus ring (purely decorative) ─────────────
function SpinRing({ position, color, speed = 0.6, radius = 1.6 }) {
    const ref = useRef();
    useFrame((_, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * speed;
            ref.current.rotation.x += delta * speed * 0.4;
        }
    });
    return (
        <mesh ref={ref} position={position}>
            <torusGeometry args={[radius, 0.13, 12, 56]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
        </mesh>
    );
}

export default function HubWorld({ emitMove, emitFell, emitAchievement, countdownText }) {

    return (
        <>
            {/* ── Sky & Atmosphere ── */}
            <color attach="background" args={['#07071a']} />
            <fog attach="fog" args={['#0a0a22', 35, 100]} />
            <Stars radius={90} depth={40} count={5000} factor={4} saturation={0} fade speed={0.6} />

            <ambientLight intensity={0.3} color="#7777ff" />
            <directionalLight position={[10, 30, 10]} intensity={0.7} color="#ffffff" castShadow />
            <pointLight position={[0, 8, 0]} color="#00ffe0" intensity={2} distance={35} />
            <pointLight position={[-18, 6, -8]} color="#ff00cc" intensity={1.2} distance={28} />
            <pointLight position={[18, 6, -8]} color="#00aaff" intensity={1.2} distance={28} />
            <pointLight position={[0, 12, -20]} color="#ffcc00" intensity={0.8} distance={30} />

            {/* ── COUNTDOWN floating text ── */}
            <Float speed={2} rotationIntensity={0} floatIntensity={0.4}>
                <Text
                    position={[0, 9, 0]}
                    fontSize={1.2}
                    color="#00ffe0"
                    anchorX="center"
                    outlineWidth={0.06}
                    outlineColor="#003344"
                >
                    {countdownText || '⏳ Waiting...'}
                </Text>
            </Float>

            {/* ══════════════════════════════════════════
                MAIN FLOOR — large dark hex-tinted slab
            ══════════════════════════════════════════ */}
            <Platform position={[0, -0.5, 0]} scale={[44, 1, 44]} type="static" color="#111122" />

            {/* Grid-line overlay on floor (purely visual meshes) */}
            {Array.from({ length: 11 }).map((_, i) => (
                <mesh key={`gx${i}`} position={[-20 + i * 4, -0.47, 0]}>
                    <boxGeometry args={[0.05, 0.02, 44]} />
                    <meshBasicMaterial color="#00ffe0" transparent opacity={0.12} />
                </mesh>
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
                <mesh key={`gz${i}`} position={[0, -0.47, -20 + i * 4]}>
                    <boxGeometry args={[44, 0.02, 0.05]} />
                    <meshBasicMaterial color="#00ffe0" transparent opacity={0.12} />
                </mesh>
            ))}

            {/* ══════════════════════════════════════════
                CENTER RAISED STAGE — where players spawn
            ══════════════════════════════════════════ */}
            <Platform position={[0, 0.25, 0]} scale={[12, 0.5, 12]} type="static" color="#1a1a3a" />
            {/* Stage edge glow strip */}
            {[
                [0, 0.52, 6], [0, 0.52, -6],
                [6, 0.52, 0], [-6, 0.52, 0],
            ].map(([x, y, z], i) => (
                <mesh key={i} position={[x, y, z]}>
                    <boxGeometry args={[i < 2 ? 12 : 0.1, 0.05, i < 2 ? 0.1 : 12]} />
                    <meshBasicMaterial color="#00ffe0" transparent opacity={0.7} />
                </mesh>
            ))}

            {/* ══════════════════════════════════════════
                STAIRCASE — leads up to a rooftop deck.
                Left side of the room, Z-axis direction.
            ══════════════════════════════════════════ */}
            {/* 12 steps going up and back */}
            {Array.from({ length: 12 }).map((_, i) => (
                <Platform
                    key={`stair${i}`}
                    position={[-14, -0.15 + i * 0.45, 5 - i * 1.1]}
                    scale={[5, 0.4, 1.05]}
                    type="static"
                    color="#1e2d40"
                />
            ))}

            {/* Rooftop deck at the top of the stairs */}
            <Platform position={[-14, 5.15, -8.2]} scale={[5, 0.4, 6]} type="static" color="#1a2236" />

            {/* Railing posts on rooftop */}
            {[-16, -12].map((x, i) => (
                <mesh key={`rail${i}`} position={[x, 6.2, -8.2]}>
                    <boxGeometry args={[0.15, 2, 6]} />
                    <meshStandardMaterial color="#334" emissive="#00aaff" emissiveIntensity={0.3} />
                </mesh>
            ))}
            {/* Handrail bar */}
            <mesh position={[-14, 7.3, -8.2]}>
                <boxGeometry args={[5, 0.12, 0.12]} />
                <meshBasicMaterial color="#00aaff" transparent opacity={0.7} />
            </mesh>

            {/* Staircase half-wall / banister */}
            <mesh position={[-16.6, 2.5, 0]}>
                <boxGeometry args={[0.15, 5.8, 13.5]} />
                <meshStandardMaterial color="#223" emissive="#8800ff" emissiveIntensity={0.15} />
            </mesh>

            {/* ══════════════════════════════════════════
                RIGHT SIDE — elevated walkway with ramp
            ══════════════════════════════════════════ */}
            {/* Ramp */}
            <mesh position={[15, 1.4, 3]} rotation={[-0.38, 0, 0]}>
                <boxGeometry args={[5, 0.4, 9]} />
                <meshStandardMaterial color="#0d1b2a" emissive="#00aaff" emissiveIntensity={0.06} />
            </mesh>
            {/* Walkway at the top */}
            <Platform position={[15, 3.0, -4]} scale={[5, 0.4, 8]} type="static" color="#1a2236" />
            {/* Walkway railing */}
            <mesh position={[17.6, 4.2, -4]}>
                <boxGeometry args={[0.15, 2.5, 8]} />
                <meshStandardMaterial color="#334" emissive="#ff00aa" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[15, 5.4, -4]}>
                <boxGeometry args={[5, 0.12, 0.12]} />
                <meshBasicMaterial color="#ff00aa" transparent opacity={0.7} />
            </mesh>

            {/* ══════════════════════════════════════════
                BACK WALL — large decorative backdrop
            ══════════════════════════════════════════ */}
            <mesh position={[0, 6, -22]}>
                <boxGeometry args={[44, 16, 0.5]} />
                <meshStandardMaterial color="#050512" emissive="#0000aa" emissiveIntensity={0.04} />
            </mesh>
            {/* Glowing horizontal strip on wall */}
            <mesh position={[0, 5.5, -21.7]}>
                <boxGeometry args={[40, 0.08, 0.1]} />
                <meshBasicMaterial color="#00ffe0" transparent opacity={0.5} />
            </mesh>
            {/* Wall vertical accent lines */}
            {[-18, -9, 0, 9, 18].map((x, i) => (
                <mesh key={`wv${i}`} position={[x, 6, -21.7]}>
                    <boxGeometry args={[0.06, 14, 0.1]} />
                    <meshBasicMaterial color="#8800ff" transparent opacity={0.4} />
                </mesh>
            ))}

            {/* Side walls */}
            <mesh position={[-22, 6, 0]}>
                <boxGeometry args={[0.5, 16, 44]} />
                <meshStandardMaterial color="#050510" />
            </mesh>
            <mesh position={[22, 6, 0]}>
                <boxGeometry args={[0.5, 16, 44]} />
                <meshStandardMaterial color="#050510" />
            </mesh>

            {/* ══════════════════════════════════════════
                DECORATIVE ELEMENTS
            ══════════════════════════════════════════ */}
            {/* Glowing orbs scattered around */}
            <GlowOrb position={[4, 1.2, 4]} color="#ff3366" speed={1.4} size={0.45} />
            <GlowOrb position={[-4, 1.2, 4]} color="#00ffaa" speed={0.85} size={0.38} />
            <GlowOrb position={[6, 1.2, -3]} color="#ffcc00" speed={1.1} size={0.5} />
            <GlowOrb position={[-6, 1.2, -3]} color="#aa00ff" speed={1.6} size={0.4} />
            <GlowOrb position={[0, 5.8, -8.2]} color="#00ccff" speed={0.9} size={0.5} />  {/* on rooftop */}
            <GlowOrb position={[-14, 6.2, -6]} color="#ff6600" speed={1.2} size={0.38} /> {/* rooftop */}
            <GlowOrb position={[15, 4, -4]} color="#33ff99" speed={1.0} size={0.4} />  {/* right walkway */}

            {/* Spinning rings high up (purely decorative) */}
            <SpinRing position={[0, 12, -5]} color="#00ffe0" speed={0.5} radius={2.0} />
            <SpinRing position={[-14, 10, -8]} color="#ff00cc" speed={0.7} radius={1.4} />
            <SpinRing position={[15, 8, -4]} color="#ffaa00" speed={0.9} radius={1.2} />

            {/* Pillar columns framing the stage */}
            {[[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]].map(([px, pz], i) => (
                <mesh key={`pillar${i}`} position={[px, 3, pz]} castShadow>
                    <cylinderGeometry args={[0.22, 0.28, 7, 8]} />
                    <meshStandardMaterial color="#1a1a3a" emissive="#00aaff" emissiveIntensity={0.35} />
                </mesh>
            ))}
            {/* Pillar top caps */}
            {[[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]].map(([px, pz], i) => (
                <mesh key={`cap${i}`} position={[px, 6.6, pz]}>
                    <sphereGeometry args={[0.3, 8, 8]} />
                    <meshStandardMaterial color="#00ffe0" emissive="#00ffe0" emissiveIntensity={1} />
                </mesh>
            ))}

            {/* ── LOCAL PLAYER ── */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                emitAchievement={emitAchievement}
                world={0}
                startPosition={[0, 2, 3]}
            />
        </>
    );
}
