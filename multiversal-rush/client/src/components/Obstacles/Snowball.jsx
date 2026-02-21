import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { aabbCollision } from "../../utils/collision";

/**
 * Snowball Obstacle Component
 * Oscillates horizontally and applies knockback to the player on collision.
 */
export default function Snowball({ position, range = 4, speed = 1.5, playerRef }) {
    const meshRef = useRef();
    const startX = position[0];

    useFrame((state) => {
        if (!meshRef.current || !playerRef?.current) return;
        const time = state.clock.getElapsedTime();

        // Horizontal ping-pong movement
        meshRef.current.position.x = startX + Math.sin(time * speed) * range;

        // Spin effect
        meshRef.current.rotation.z -= 0.05;

        // Collision Check (AABB)
        const playerPos = playerRef.current.position;
        const collided = aabbCollision(
            { x: playerPos.x, y: playerPos.y, z: playerPos.z },
            { w: 0.5, h: 0.5, d: 0.5 }, // player size
            { x: meshRef.current.position.x, y: meshRef.current.position.y, z: meshRef.current.position.z },
            { w: 1.0, h: 1.0, d: 1.0 }  // snowball size
        );

        if (collided) {
            // Apply physical impulse (knockback)
            playerPos.z += 0.5;
            playerPos.y += 0.2;
            console.log("❄️ Snowball hit!");
        }
    });

    return (
        <mesh ref={meshRef} position={position} castShadow>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial
                color="#ffffff"
                emissive="#b0e0ff"
                emissiveIntensity={0.3}
                roughness={0.2}
            />
        </mesh>
    );
}
