// ============================================================
//  components/Worlds/HubWorld.jsx — Central Hub
//  Atharva: spawn platform + portals to Cyberverse & Honeycomb
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';

export default function HubWorld({ onEnterPortal, emitMove, emitFell }) {
    const cyberPortalRef = useRef(null);
    const honeyPortalRef = useRef(null);
    const cryoPortalRef = useRef(null);

    useFrame((_, delta) => {
        if (cyberPortalRef.current) cyberPortalRef.current.rotation.y += delta;
        if (honeyPortalRef.current) honeyPortalRef.current.rotation.y += delta;
        if (cryoPortalRef.current) cryoPortalRef.current.rotation.y += delta;
    });

    const portals = [
        {
            id: 'cyberverse',
            min: { x: -14, y: 0, z: -14 },
            max: { x: -6, y: 7, z: -6 }
        },
        {
            id: 'honeycomb',
            min: { x: 6, y: 0, z: -14 },
            max: { x: 14, y: 7, z: -6 }
        },
        {
            id: 'cryovoid',
            min: { x: -4, y: 0, z: 6 },
            max: { x: 4, y: 7, z: 14 }
        }
    ];

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} intensity={0.5} />

            {/* Central spawn */}
            <Platform position={[0, -0.5, 0]} scale={[10, 1, 10]} type="static" color="#555555" />

            {/* Left bridge → Cyberverse */}
            <Platform position={[-5, -0.5, -5]} scale={[5, 1, 5]} type="static" color="#333333" />
            <Platform position={[-10, -0.5, -10]} scale={[8, 1, 8]} type="static" color="#111111" />

            {/* Right bridge → Honeycomb */}
            <Platform position={[5, -0.5, -5]} scale={[5, 1, 5]} type="static" color="#333333" />
            <Platform position={[10, -0.5, -10]} scale={[8, 1, 8]} type="static" color="#111111" />

            {/* Back bridge → Cryo Void */}
            <Platform position={[0, -0.5, 5]} scale={[5, 1, 5]} type="static" color="#333333" />
            <Platform position={[0, -0.5, 10]} scale={[8, 1, 8]} type="static" color="#111111" />

            {/* Cyberverse Portal (blue) */}
            <group position={[-10, 2, -10]}>
                <mesh ref={cyberPortalRef}>
                    <torusGeometry args={[1.5, 0.2, 16, 60]} />
                    <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={1.5} />
                </mesh>
            </group>

            {/* Honeycomb Portal (gold) */}
            <group position={[10, 2, -10]}>
                <mesh ref={honeyPortalRef}>
                    <torusGeometry args={[1.5, 0.2, 16, 60]} />
                    <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={1.5} />
                </mesh>
            </group>

            {/* Cryo Void Portal (white-blue) */}
            <group position={[0, 2, 10]}>
                <mesh ref={cryoPortalRef}>
                    <torusGeometry args={[1.5, 0.2, 16, 60]} />
                    <meshStandardMaterial color="#aaddff" emissive="#ffffff" emissiveIntensity={1.5} />
                </mesh>
            </group>

            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                world={0}
                startPosition={[0, 2, 0]}
                portals={portals}
                onPortalTouch={onEnterPortal}
            />
        </>
    );
}
