import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, Float, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";

/**
 * A dedicated 3D model component for the Home page.
 * Features a floating animation and slow rotation.
 */
function AvatarModel({ path }) {
    const { scene } = useGLTF(path);
    const groupRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (groupRef.current) {
            // Slow rotation for showcase effect
            groupRef.current.rotation.y = t * 0.5;
        }
    });

    // Optimize and clean up model for the UI
    React.useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    return <primitive ref={groupRef} object={scene} scale={1.5} position={[0, -1.5, 0]} />;
}

export default function HomeAvatar3D({ modelPath }) {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />

            {/* Lighting for a high-end feel */}
            <ambientLight intensity={0.8} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />

            {/* Environment for reflections on the model */}
            <Environment preset="city" />

            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                <AvatarModel path={modelPath} />
            </Float>

            {/* Subtle shadow beneath the model */}
            <ContactShadows
                position={[0, -2, 0]}
                opacity={0.4}
                scale={10}
                blur={2}
                far={4.5}
            />
        </>
    );
}
