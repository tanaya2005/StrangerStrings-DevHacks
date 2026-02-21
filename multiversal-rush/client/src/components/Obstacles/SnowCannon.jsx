import React, { useRef, useState, useEffect } from 'react';
import socket from '../../socket/socket';
import Snowball from './Snowball';

/**
 * SnowCannon
 * Fires Snowball projectiles inward across the track.
 * Timing is server-synced via 'cannonFire' events.
 * 
 * Props:
 *   id            – unique cannon identifier (matched by server)
 *   position      – [x, y, z] world position
 *   rotation      – [rx, ry, rz] — orient the barrel
 *   speed         – projectile travel speed (units/sec)
 *   size          – projectile radius
 *   interval      – fire interval in ms (used for local fallback)
 *   initialDelay  – ms delay before first fire (for staggering lanes)
 *   playerRef     – ref to local player mesh for collision
 */
export function SnowCannon({
    id,
    position,
    rotation = [0, 0, 0],
    speed = 10,
    size = 1,
    interval = 3000,
    initialDelay = 0,
    playerRef
}) {
    const [projectiles, setProjectiles] = useState([]);

    useEffect(() => {
        // MULTIPLAYER SYNC: server emits cannonFire with cannonId
        const handleServerFire = (data) => {
            if (data.cannonId === id) {
                fire(data.speed || speed, data.size || size);
            }
        };
        socket.on('cannonFire', handleServerFire);

        // LOCAL FALLBACK: used in WorldTest / disconnected mode
        // Respects initialDelay for lane staggering
        let fireInterval = null;
        const startDelay = setTimeout(() => {
            if (!socket.connected) fire(speed, size);
            fireInterval = setInterval(() => {
                if (!socket.connected) fire(speed, size);
            }, interval);
        }, initialDelay);

        return () => {
            socket.off('cannonFire', handleServerFire);
            clearTimeout(startDelay);
            if (fireInterval) clearInterval(fireInterval);
        };
    }, [id, speed, size, interval, initialDelay]);

    const fire = (fSpeed, fSize) => {
        const pId = `${id}_${Date.now()}_${Math.random()}`;
        setProjectiles(prev => [...prev, { id: pId, speed: fSpeed, size: fSize }]);
    };

    const handleComplete = (pId) => {
        setProjectiles(prev => prev.filter(p => p.id !== pId));
    };

    return (
        <group position={position} rotation={rotation}>
            {/* Cannon barrel — aligned to local Y axis */}
            <mesh castShadow>
                <cylinderGeometry args={[0.9, 1.2, 3, 16]} />
                <meshStandardMaterial color="#37474f" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Glowing port — flashes just before firing (visual cue) */}
            <mesh position={[0, 1.5, 0]}>
                <torusGeometry args={[0.8, 0.18, 8, 32]} />
                <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.8} />
            </mesh>

            {/* Fired Snowballs */}
            {projectiles.map(p => (
                <Snowball
                    key={p.id}
                    id={p.id}
                    speed={p.speed}
                    size={p.size}
                    playerRef={playerRef}
                    onComplete={handleComplete}
                />
            ))}
        </group>
    );
}
