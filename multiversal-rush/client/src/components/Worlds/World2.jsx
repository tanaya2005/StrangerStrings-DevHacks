// ============================================================
//  components/Worlds/World2.jsx — Lava Hell
//  Base scene: Tanaya (Task 1) — platform + player
//  Multiplayer: Varun (Task 2) — emitMove, emitFinished, emitFell
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Player from '../Player/Player';

export default function World2({ emitMove, emitFinished, emitFell }) {
    const portalRef = useRef();

    useFrame((_, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 1.2;
    });

    return (
        <>
            {/* ---- Lighting — hot lava theme ---- */}
            <ambientLight intensity={0.3} color="#ff4400" />
            <directionalLight position={[10, 20, 10]} intensity={0.8} />
            <pointLight position={[0, 4, -10]} color="#ff6600" intensity={2} />
            <pointLight position={[0, 4, -40]} color="#ff3300" intensity={2} />

            {/* ---- Lava ground (dark base) ---- */}
            <mesh position={[0, -0.5, -15]} receiveShadow>
                <boxGeometry args={[30, 1, 60]} />
                <meshStandardMaterial color="#1a0500" />
            </mesh>

            {/* ---- Floating lava platforms ---- */}
            {[
                [0, 0.5, -5],
                [-5, 1.5, -12],
                [5, 2.5, -19],
                [-3, 3.5, -27],
                [0, 4, -34],
            ].map(([x, y, z], i) => (
                <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
                    <boxGeometry args={[5, 0.5, 5]} />
                    <meshStandardMaterial
                        color="#3a0800"
                        emissive="#ff3300"
                        emissiveIntensity={0.4}
                    />
                </mesh>
            ))}

            {/* ---- "Lava" gap filler glow ---- */}
            <mesh position={[0, -0.3, -15]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[30, 60]} />
                <meshStandardMaterial
                    color="#ff2200"
                    emissive="#ff4400"
                    emissiveIntensity={0.6}
                    transparent
                    opacity={0.35}
                />
            </mesh>

            {/* ---- Finish portal ---- */}
            <group position={[0, 5.5, -34]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[1.6, 0.15, 16, 60]} />
                    <meshStandardMaterial color="#00ffe0" emissive="#00ffe0" emissiveIntensity={2} />
                </mesh>
                <mesh>
                    <circleGeometry args={[1.45, 32]} />
                    <meshStandardMaterial
                        color="#00c9a7"
                        emissive="#00ffe0"
                        emissiveIntensity={1}
                        transparent
                        opacity={0.55}
                    />
                </mesh>
            </group>

            {/* ---- Player ---- */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={() => { }}
                world={2}
                startPosition={[0, 1.5, -5]}
            />
        </>
    );
}
