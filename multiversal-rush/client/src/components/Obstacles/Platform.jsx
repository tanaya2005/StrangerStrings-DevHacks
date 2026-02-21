import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store/store';

let pIdCounter = 0;

export default function Platform({ position = [0, 0, 0], scale = [5, 0.5, 5], type = 'static', speed = 2, range = 5, axis = 'x', color = '#00ffe0', isSlippery = false }) {
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
            type,
            isSlippery
        });
        return () => removePlatform(pid.current);
    }, []);

    const worldPos = useRef(new THREE.Vector3());
    const worldQuat = useRef(new THREE.Quaternion());

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        const time = state.clock.elapsedTime;

        let pVelocity = { x: 0, y: 0, z: 0 };

        if (type === 'moving') {
            const cycle = Math.sin(time * speed);
            const prevPos = meshRef.current.position.clone();

            if (axis === 'x') {
                meshRef.current.position.x = position[0] + cycle * range;
            } else if (axis === 'z') {
                meshRef.current.position.z = position[2] + cycle * range;
            } else if (axis === 'y') {
                meshRef.current.position.y = position[1] + cycle * range;
            }
            pVelocity.x = (meshRef.current.position.x - prevPos.x) / delta;
            pVelocity.y = (meshRef.current.position.y - prevPos.y) / delta;
            pVelocity.z = (meshRef.current.position.z - prevPos.z) / delta;
        }
        else if (type === 'rotating') {
            meshRef.current.rotation.y = time * speed;
        }

        // --- AUTHORITATIVE WORLD UPDATE ---
        // Get absolute world position for the collision store
        meshRef.current.getWorldPosition(worldPos.current);
        meshRef.current.getWorldQuaternion(worldQuat.current);

        setPlatform(pid.current, {
            id: pid.current,
            position: { x: worldPos.current.x, y: worldPos.current.y, z: worldPos.current.z },
            size: scale,
            velocity: pVelocity,
            type,
            isSlippery
        });
    });

    return (
        <mesh ref={meshRef} position={position} castShadow receiveShadow>
            <boxGeometry args={scale} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
        </mesh>
    );
}
