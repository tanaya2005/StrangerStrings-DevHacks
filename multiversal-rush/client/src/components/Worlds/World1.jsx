// ============================================================
//  components/Worlds/World1.jsx — Cyberverse
//  Atharva: added Platform component with static/moving/rotating types
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';

import Platform from '../Obstacles/Platform';

/**
 * Props from Game.jsx:
 *   emitMove(data)              — broadcast player position
 *   emitWorldTransition(world)  — called on portal trigger
 *   emitFell()                  — called when player falls
 */
export default function World1({ emitMove, emitWorldTransition, emitFell }) {
    const portalRef = useRef();

    useFrame((_, delta) => {
        if (portalRef.current) portalRef.current.rotation.y += delta * 0.8;
    });

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} color="#00ffe0" intensity={0.6} />

            {/* ---- Ground platform (Tanaya's anti-gravity vibe) ---- */}
            <Platform position={[0, -0.5, 0]} scale={[30, 1, 60]} type="static" color="#0a1a2f" />

            {/* Grid */}
            <gridHelper args={[30, 30, '#00ffe0', '#003355']} position={[0, 0.01, 0]} />

            {/* ---- Platforms (Using new Custom Collision Engine) ---- */}
            {/* 1. Static Platform */}
            <Platform position={[4, 1, -6]} scale={[4, 0.5, 4]} type="static" color="#1a2a4a" />

            {/* 2. Moving Platform */}
            <Platform position={[-4, 2, -14]} scale={[4, 0.5, 4]} type="moving" axis="x" range={6} speed={2} color="#ff00cc" />

            {/* 3. Rotating Platform */}
            <Platform position={[5, 3, -22]} scale={[4, 0.5, 4]} type="rotating" speed={1.5} color="#00ffcc" />

            {/* Moving platform */}
            <Platform position={[-4, 2, -14]} scale={[4, 0.5, 4]} type="moving" axis="x" range={6} speed={2} color="#ff00cc" />

            {/* Rotating platform */}
            <Platform position={[5, 3, -22]} scale={[4, 0.5, 4]} type="rotating" speed={1.5} color="#00ffcc" />

            {/* Portal to World 2 */}
            <group position={[0, 2.5, -26]}>
                <mesh ref={portalRef}>
                    <torusGeometry args={[1.6, 0.15, 16, 60]} />
                    <meshStandardMaterial color="#a862ff" emissive="#a862ff" emissiveIntensity={1.5} />
                </mesh>
                <mesh>
                    <circleGeometry args={[1.45, 32]} />
                    <meshStandardMaterial color="#6030dd" emissive="#8050ff" emissiveIntensity={0.8} transparent opacity={0.6} />
                </mesh>
            </group>

            {/* Player */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                emitWorldTransition={emitWorldTransition}
                world={1}
                startPosition={[0, 5, 0]}
            />
        </>
    );
}
