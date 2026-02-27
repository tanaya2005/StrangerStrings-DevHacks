import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import useStore from '../../store/store';
import * as THREE from 'three';

let gIdCounter = 0;

/**
 * GlitchPlatform Component
 * Periodically flickers and disappears.
 * Synced via time, but effects occur locally for performance.
 */
export default function GlitchPlatform({ position = [0, 0, 0], scale = [5, 0.5, 5], interval = 3000, duration = 1500, color = '#ff00ff', offset = 0 }) {
    const meshRef = useRef();
    const pid = useRef(`glitch_plat_${gIdCounter++}`);
    const setPlatform = useStore((s) => s.setPlatform);
    const removePlatform = useStore((s) => s.removePlatform);

    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        setPlatform(pid.current, {
            id: pid.current,
            position: { x: position[0], y: position[1], z: position[2] },
            size: scale,
            velocity: { x: 0, y: 0, z: 0 },
            type: 'glitch'
        });
        return () => removePlatform(pid.current);
    }, []);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = (state.clock.elapsedTime * 1000) + offset; // time in ms + offset
        const cycle = time % (interval + duration);

        const shouldBeActive = cycle < interval;

        // Flicker effect when about to disappear
        if (cycle > interval - 500 && cycle < interval) {
            meshRef.current.visible = Math.random() > 0.5;
        } else {
            meshRef.current.visible = shouldBeActive;
        }

        if (shouldBeActive !== isActive) {
            setIsActive(shouldBeActive);
            // Update store so player falls through
            if (shouldBeActive) {
                setPlatform(pid.current, {
                    id: pid.current,
                    position: { x: position[0], y: position[1], z: position[2] },
                    size: scale,
                    velocity: { x: 0, y: 0, z: 0 },
                    type: 'glitch'
                });
            } else {
                removePlatform(pid.current);
            }
        }

        // Color glitch shift
        if (shouldBeActive && Math.random() > 0.99) {
            meshRef.current.material.emissiveIntensity = 5;
        } else if (shouldBeActive) {
            meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(meshRef.current.material.emissiveIntensity, 1, 0.1);
        }
    });

    return (
        <mesh ref={meshRef} position={position} castShadow receiveShadow>
            <boxGeometry args={scale} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={1}
                transparent
                opacity={0.9}
            />
        </mesh>
    );
}
