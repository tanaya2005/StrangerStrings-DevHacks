import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { aabbCollision } from '../../utils/collision';

/**
 * Snowball Projectile
 * Fires from a Cannon and moves in its LOCAL forward direction.
 */
export default function Snowball({
    id,
    speed,
    size,
    playerRef,
    onComplete
}) {
    const meshRef = useRef();
    const [active, setActive] = useState(true);

    // Initial local direction is always UP (+Y) because our cannon barrel is a cylinder
    // By being a child of the rotated Cannon group, +Y is the "target" direction.
    useFrame((state, delta) => {
        if (!active || !meshRef.current || !playerRef?.current) return;

        // Move along local Y axis (forward from cannon mouth)
        meshRef.current.position.y += speed * delta;

        // Rotation effect
        meshRef.current.rotation.x += delta * 4;
        meshRef.current.rotation.z += delta * 3;

        // Collision Check: We need WORLD position for global AABB collision
        const worldPos = new THREE.Vector3();
        meshRef.current.getWorldPosition(worldPos);

        const playerPos = playerRef.current.position;
        const collided = aabbCollision(
            { x: playerPos.x, y: playerPos.y, z: playerPos.z },
            { w: 0.6, h: 0.6, d: 0.6 },
            { x: worldPos.x, y: worldPos.y, z: worldPos.z },
            { w: size / 2, h: size / 2, d: size / 2 }
        );

        if (collided) {
            // Calculate impact vector: direction from snowball to player
            const impactX = playerPos.x - worldPos.x;
            const impactZ = playerPos.z - worldPos.z;
            const len = Math.sqrt(impactX * impactX + impactZ * impactZ) || 1;
            // Normalize then scale by snowball size — bigger snowballs hit harder
            const force = 6 + size * 2;
            const fx = (impactX / len) * force;
            const fz = (impactZ / len) * force;
            const fy = 3.5; // always bumps the player upward a little

            // Use the new applyForce API (safe — no-op if not available)
            playerRef.current.applyForce?.(fx, fy, fz);

            setActive(false);
            onComplete?.(id);
            console.log(`❄️ Snowball hit! force=(${fx.toFixed(1)}, ${fy}, ${fz.toFixed(1)})`);
        }

        // Off-map reset (local distance)
        if (meshRef.current.position.y > 60) {
            setActive(false);
            onComplete?.(id);
        }
    });

    if (!active) return null;

    return (
        <mesh ref={meshRef} position={[0, 1.5, 0]} castShadow>
            <sphereGeometry args={[size, 16, 16]} />
            <meshStandardMaterial
                color="#ffffff"
                emissive="#90caf9"
                emissiveIntensity={0.6}
                roughness={0}
            />
        </mesh>
    );
}
