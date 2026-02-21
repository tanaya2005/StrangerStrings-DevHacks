// ============================================================
//  components/Worlds/World1.jsx — Cyberverse
//  Base scene: Tanaya (Task 1) — platform + player
//  Multiplayer: Varun (Task 2) — emitMove, emitWorldTransition, emitFell
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Player from '../Player/Player';

/**
 * Props from Game.jsx:
 *   emitMove(data)              — broadcast player position
 *   emitWorldTransition(world)  — called on portal trigger
 *   emitFell()                  — called when player falls
 */
export default function World1({ emitMove, emitWorldTransition, emitFell }) {
    const portalRef = useRef();

    // Slowly rotate the portal for visual effect
    useFrame((_, delta) => {
        if (portalRef.current) {
            portalRef.current.rotation.y += delta * 0.8;
        }
    });

    return (
        <>
            {/* ---- Lighting ---- */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} color="#00ffe0" intensity={0.6} />

            {/* ---- Ground platform (Tanaya's anti-gravity vibe) ---- */}
            <mesh position={[0, -0.5, 0]} receiveShadow>
                <boxGeometry args={[30, 1, 60]} />
                <meshStandardMaterial color="#0a1a2f" />
            </mesh>

            {/* ---- Grid lines on ground for cyberpunk feel ---- */}
            <gridHelper args={[30, 30, '#00ffe0', '#003355']} position={[0, 0.01, 0]} />

            {/* ---- Some platforms to jump on ---- */}
            <mesh position={[4, 1, -6]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.5, 4]} />
                <meshStandardMaterial color="#1a2a4a" emissive="#004466" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[-4, 2, -14]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.5, 4]} />
                <meshStandardMaterial color="#1a2a4a" emissive="#004466" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[5, 3, -22]} castShadow receiveShadow>
                <boxGeometry args={[4, 0.5, 4]} />
                <meshStandardMaterial color="#1a2a4a" emissive="#004466" emissiveIntensity={0.3} />
            </mesh>

            {/* ---- Portal to World 2 (at z = -26) ---- */}
            <group position={[0, 2.5, -26]}>
                {/* Portal ring */}
                <mesh ref={portalRef}>
                    <torusGeometry args={[1.6, 0.15, 16, 60]} />
                    <meshStandardMaterial color="#a862ff" emissive="#a862ff" emissiveIntensity={1.5} />
                </mesh>
                {/* Portal inner glow */}
                <mesh>
                    <circleGeometry args={[1.45, 32]} />
                    <meshStandardMaterial
                        color="#6030dd"
                        emissive="#8050ff"
                        emissiveIntensity={0.8}
                        transparent
                        opacity={0.6}
                    />
                </mesh>
                {/* Portal label */}
            </group>

            {/* ---- Player (Tanaya's movement + Varun's emit) ---- */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={emitWorldTransition}
                world={1}
                startPosition={[0, 1, 0]}
            />
        </>
    );
}
