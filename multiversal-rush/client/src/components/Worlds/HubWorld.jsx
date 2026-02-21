// ============================================================
//  components/Worlds/HubWorld.jsx
// ============================================================
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import Player from '../Player/Player';
import Platform from '../Obstacles/Platform';

export default function HubWorld({ onEnterPortal, emitMove, emitFell }) {
    const cyberPortalRef = useRef(null);
    const honeyPortalRef = useRef(null);

    // Slowly rotate portals for visual effect
    useFrame((_, delta) => {
        if (cyberPortalRef.current) cyberPortalRef.current.rotation.y += delta;
        if (honeyPortalRef.current) honeyPortalRef.current.rotation.y += delta;
    });

    /**
     * Bounding box data for portals based on their position and toros dimensions.
     * We pass these down to the Player component to trigger collision logic.
     */
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
        }
    ];

    const handlePortalTouch = (portalId) => {
        onEnterPortal(portalId);
    };

    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
            <pointLight position={[0, 5, 0]} intensity={0.5} />

            {/* Central Spawn Platform */}
            <Platform position={[0, -0.5, 0]} scale={[10, 1, 10]} type="static" color="#555555" />

            {/* Left Bridge toward Cyberverse (straight out towards x=-5, z=-5 but unrotated for simple AABB collision support) */}
            <Platform position={[-5, -0.5, -5]} scale={[5, 1, 5]} type="static" color="#333333" />
            <Platform position={[-10, -0.5, -10]} scale={[8, 1, 8]} type="static" color="#111111" />

            {/* Right Bridge toward Honeycomb (straight out towards x=5, z=-5) */}
            <Platform position={[5, -0.5, -5]} scale={[5, 1, 5]} type="static" color="#333333" />
            <Platform position={[10, -0.5, -10]} scale={[8, 1, 8]} type="static" color="#111111" />

            {/* Cyberverse Portal */}
            <group position={[-10, 2, -10]}>
                <mesh ref={cyberPortalRef}>
                    <torusGeometry args={[1.5, 0.2, 16, 60]} />
                    <meshStandardMaterial color="#00aaff" emissive="#00aaff" emissiveIntensity={1.5} />
                </mesh>
            </group>

            {/* Honeycomb Portal */}
            <group position={[10, 2, -10]}>
                <mesh ref={honeyPortalRef}>
                    <torusGeometry args={[1.5, 0.2, 16, 60]} />
                    <meshStandardMaterial color="#ffaa00" emissive="#ffaa00" emissiveIntensity={1.5} />
                </mesh>
            </group>

            {/* Player instantiated to check portals locally */}
            <Player
                emitMove={emitMove}
                emitFell={emitFell}
                world={0} // Hub World identifier
                startPosition={[0, 5, 0]}
                portals={portals}
                onPortalTouch={handlePortalTouch}
            />
        </>
    );
}
