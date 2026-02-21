import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import useStore from '../../store/store';

let pIdCounter = 0;

export default function Platform({ position = [0, 0, 0], scale = [5, 0.5, 5], type = 'static', speed = 2, range = 5, axis = 'x', color = '#00ffe0' }) {
    const meshRef = useRef();
    const pid = useRef(`platform_${pIdCounter++}`);
    const setPlatform = useStore((s) => s.setPlatform);
    const removePlatform = useStore((s) => s.removePlatform);

    // Initial config so the Player knows about it right away
    useEffect(() => {
        setPlatform(pid.current, {
            id: pid.current,
            position: { x: position[0], y: position[1], z: position[2] },
            size: scale,
            velocity: { x: 0, y: 0, z: 0 },
            type
        });
        return () => removePlatform(pid.current);
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;

        let curPos = meshRef.current.position;
        let pVelocity = { x: 0, y: 0, z: 0 };

        if (type === 'moving') {
            const cycle = Math.sin(time * speed);
            const derivative = Math.cos(time * speed) * speed;

            const prevPos = curPos.clone();

            if (axis === 'x') {
                curPos.x = position[0] + cycle * range;
                pVelocity.x = (curPos.x - prevPos.x) / delta;
            } else if (axis === 'z') {
                curPos.z = position[2] + cycle * range;
                pVelocity.z = (curPos.z - prevPos.z) / delta;
            } else if (axis === 'y') {
                curPos.y = position[1] + cycle * range;
                pVelocity.y = (curPos.y - prevPos.y) / delta;
            }
        }
        else if (type === 'rotating') {
            meshRef.current.rotation.y = time * speed;
            // Unscaled AABB changes its corner radius, but for basic implementation we can keep it as is
            // since character collision is basic AABB.
        }

        // Update the central collision handler every frame to support deterministic movement logic
        setPlatform(pid.current, {
            id: pid.current,
            position: { x: curPos.x, y: curPos.y, z: curPos.z },
            size: scale,
            velocity: pVelocity,
            type,
        });
    });

    return (
        <mesh ref={meshRef} position={position} castShadow receiveShadow>
            <boxGeometry args={scale} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
    );
}
