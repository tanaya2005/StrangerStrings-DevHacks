import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Float, Center, Environment, PerspectiveCamera } from "@react-three/drei";

/**
 * Custom settings for each 3D model to ensure visual consistency.
 * Adjust these values based on the specific proportions of each model.
 */
const AVATAR_CONFIG = {
    "/models/penguin/scene.gltf": {
        scale: 3,
        position: [0, 0, 0],
        rotationSpeed: 0.5,
        floatIntensity: 0.5
    },
    "/models/red-panda/scene.gltf": {
        scale: 3,
        position: [0, 0, 0],
        rotationSpeed: 0.5,
        floatIntensity: 0.6
    },
    "/models/shark/scene.gltf": {
        scale: 0.8, // Aggressively reduced to fit frame
        position: [0, 0, 0],
        rotationSpeed: 0.5,
        floatIntensity: 0.7
    },
    "/models/zoro/scene.gltf": {
        scale: 2,
        position: [0, 0, 0],
        rotationSpeed: 0.5,
        floatIntensity: 0.3
    }
};

const DEFAULT_CONFIG = {
    scale: 0.5,
    position: [0, 0, 0],
    rotationSpeed: 0.5,
    floatIntensity: 0.5
};

/**
 * Normalizes and animates any GLTF model for the Home screen.
 * Forces all characters to have a consistent visual height and centered pivot.
 */
function AvatarWrapper({ modelPath }) {
    const { scene } = useGLTF(modelPath);
    const pivotRef = useRef();

    // Get specific settings for this avatar or use defaults
    const config = AVATAR_CONFIG[modelPath] || DEFAULT_CONFIG;

    // Clone and compute normalization
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    useFrame((state) => {
        if (pivotRef.current) {
            // Precise uniform rotation speed
            pivotRef.current.rotation.y = state.clock.getElapsedTime() * config.rotationSpeed;
        }
    });

    return (
        <group ref={pivotRef}>
            <Center>
                <primitive
                    object={clonedScene}
                    scale={config.scale}
                />
            </Center>
        </group>
    );
}

export default function HomeAvatar3D({ modelPath }) {
    const config = AVATAR_CONFIG[modelPath] || DEFAULT_CONFIG;

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={35} />

            <Environment preset="city" />
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} intensity={1.5} penumbra={1} />

            <Float speed={1.5} rotationIntensity={0.1} floatIntensity={config.floatIntensity}>
                <AvatarWrapper modelPath={modelPath} />
            </Float>
        </>
    );
}
