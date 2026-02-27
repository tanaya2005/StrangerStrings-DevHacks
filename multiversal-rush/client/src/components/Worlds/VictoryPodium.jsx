// ============================================================
//  components/Worlds/VictoryPodium.jsx — 3D Victory Podium Scene
//  Displays 3 winners on pedestals with cinematic lighting,
//  particle effects, and animated text. Fully R3F.
// ============================================================
import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { OrthographicCamera, Text, Float, Stars } from "@react-three/drei";
import * as THREE from "three";

// ---- Podium Pedestal ----
function Pedestal({ position, height, color, emissiveColor, delay = 0 }) {
    const meshRef = useRef();
    const startTime = useRef(null);

    useFrame(({ clock }) => {
        if (!meshRef.current) return;
        if (startTime.current === null) startTime.current = clock.elapsedTime;
        const elapsed = clock.elapsedTime - startTime.current;

        // Rise animation
        const progress = Math.min(Math.max((elapsed - delay) / 1.2, 0), 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
        meshRef.current.scale.y = eased;
        meshRef.current.position.y = (height / 2) * eased;

        // Subtle pulse glow
        if (meshRef.current.material) {
            meshRef.current.material.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.1;
        }
    });

    return (
        <mesh ref={meshRef} position={[position[0], 0, position[2]]}>
            <boxGeometry args={[2.8, height, 2.8]} />
            <meshStandardMaterial
                color={color}
                emissive={emissiveColor}
                emissiveIntensity={0.3}
                metalness={0.7}
                roughness={0.2}
            />
        </mesh>
    );
}

// ---- Winner Avatar (simplified cylinder puck + floating name) ----
function WinnerAvatar({ position, name, color, index, height }) {
    const groupRef = useRef();
    const startTime = useRef(null);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        if (startTime.current === null) startTime.current = clock.elapsedTime;
        const elapsed = clock.elapsedTime - startTime.current;

        // Drop in from above after pedestal rises
        const delay = 0.3 + index * 0.3 + 1.2;
        const progress = Math.min(Math.max((elapsed - delay) / 0.8, 0), 1);
        const eased = progress < 1 ? 1 - Math.pow(1 - progress, 4) : 1;

        const targetY = height + 1.2;
        groupRef.current.position.y = targetY + (1 - eased) * 8;
        groupRef.current.scale.setScalar(eased);

        // Idle bobbing
        if (progress >= 1) {
            groupRef.current.position.y = targetY + Math.sin(clock.elapsedTime * 1.5 + index) * 0.15;
            groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.5 + index * 2) * 0.3;
        }
    });

    return (
        <group ref={groupRef} position={[position[0], height + 1.2, position[2]]}>
            {/* Body cylinder */}
            <mesh>
                <cylinderGeometry args={[0.8, 0.9, 2, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.2}
                    metalness={0.4}
                    roughness={0.3}
                />
            </mesh>
            {/* Head sphere */}
            <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshStandardMaterial
                    color="#ffcc88"
                    emissive="#ffaa44"
                    emissiveIntensity={0.15}
                    metalness={0.2}
                    roughness={0.6}
                />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.2, 1.6, 0.5]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#222" />
            </mesh>
            <mesh position={[0.2, 1.6, 0.5]}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color="#222" />
            </mesh>
            {/* Name label */}
            <Text
                position={[0, 2.8, 0]}
                fontSize={0.55}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                font="https://fonts.gstatic.com/s/orbitron/v31/yMJRMIlzdpvBhQQL_Qq7dy0.woff2"
                outlineWidth={0.06}
                outlineColor="#000000"
            >
                {name}
            </Text>
            {/* Trophy badge */}
            <Text
                position={[0, 3.5, 0]}
                fontSize={0.85}
                anchorX="center"
                anchorY="middle"
            >
                🏆
            </Text>
        </group>
    );
}

// ---- Confetti Particles ----
function Confetti({ teamColor }) {
    const particlesRef = useRef();
    const count = 200;

    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (Math.random() - 0.5) * 20;
            arr[i * 3 + 1] = Math.random() * 15 + 5;
            arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
        }
        return arr;
    }, []);

    const colors = useMemo(() => {
        const arr = new Float32Array(count * 3);
        const teamCol = teamColor === "red"
            ? [new THREE.Color("#ff4444"), new THREE.Color("#ff8844"), new THREE.Color("#ffdd44")]
            : [new THREE.Color("#4488ff"), new THREE.Color("#44ddff"), new THREE.Color("#88aaff")];

        for (let i = 0; i < count; i++) {
            const c = teamCol[Math.floor(Math.random() * teamCol.length)];
            arr[i * 3] = c.r;
            arr[i * 3 + 1] = c.g;
            arr[i * 3 + 2] = c.b;
        }
        return arr;
    }, [teamColor]);

    useFrame(({ clock }) => {
        if (!particlesRef.current) return;
        const pos = particlesRef.current.geometry.attributes.position;
        for (let i = 0; i < count; i++) {
            pos.array[i * 3 + 1] -= 0.03 + Math.sin(i + clock.elapsedTime) * 0.01;
            pos.array[i * 3] += Math.sin(clock.elapsedTime * 0.5 + i * 0.1) * 0.01;
            if (pos.array[i * 3 + 1] < -2) {
                pos.array[i * 3 + 1] = 15 + Math.random() * 5;
            }
        }
        pos.needsUpdate = true;
    });

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={count}
                    array={colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.2}
                vertexColors
                transparent
                opacity={0.8}
                sizeAttenuation
            />
        </points>
    );
}

// ---- Floor / Stage ----
function Stage({ teamColor }) {
    const color = teamColor === "red" ? "#1a0808" : "#08081a";
    const edgeColor = teamColor === "red" ? "#ff2222" : "#2266ff";

    return (
        <group>
            {/* Floor */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[12, 64]} />
                <meshStandardMaterial
                    color={color}
                    metalness={0.9}
                    roughness={0.1}
                />
            </mesh>
            {/* Glowing ring */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[11.5, 12, 64]} />
                <meshBasicMaterial
                    color={edgeColor}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        </group>
    );
}


// ============================================================
//  Main VictoryPodium Component
// ============================================================
export default function VictoryPodium({ data }) {
    const { winningTeamColor, winnersData = [], trophyReward = 50 } = data || {};
    const teamColor = winningTeamColor || "red";
    const primaryColor = teamColor === "red" ? "#ff3344" : "#3366ff";
    const secondaryColor = teamColor === "red" ? "#ff8844" : "#44aaff";

    // Podium layout: [center (1st), left (2nd), right (3rd)]
    const podiumConfigs = [
        { pos: [0, 0, 0], height: 4.5, delay: 0.1 },     // Center — tallest
        { pos: [-4, 0, 1], height: 3.2, delay: 0.3 },      // Left
        { pos: [4, 0, 1], height: 2.5, delay: 0.5 },       // Right
    ];

    return (
        <group>
            {/* Background */}
            <color attach="background" args={["#0a0a0f"]} />

            {/* Camera — perspective for depth */}
            <perspectiveCamera
                makeDefault
                position={[0, 6, 14]}
                fov={55}
                near={0.1}
                far={200}
            />

            {/* Cinematic Lighting */}
            <ambientLight intensity={0.15} />
            <spotLight
                position={[0, 20, 5]}
                angle={0.4}
                penumbra={0.6}
                intensity={2}
                color={primaryColor}
                castShadow
            />
            <spotLight
                position={[-8, 15, -5]}
                angle={0.5}
                penumbra={0.8}
                intensity={1}
                color={secondaryColor}
            />
            <spotLight
                position={[8, 15, -5]}
                angle={0.5}
                penumbra={0.8}
                intensity={1}
                color="#ffffff"
            />
            <pointLight position={[0, 8, 0]} intensity={0.5} color={primaryColor} />

            {/* Stars background */}
            <Stars
                radius={80}
                depth={50}
                count={3000}
                factor={5}
                saturation={0.8}
                fade
            />

            {/* Stage floor */}
            <Stage teamColor={teamColor} />

            {/* Pedestals */}
            {podiumConfigs.map((config, i) => (
                <Pedestal
                    key={i}
                    position={config.pos}
                    height={config.height}
                    color={primaryColor}
                    emissiveColor={secondaryColor}
                    delay={config.delay}
                />
            ))}

            {/* Winner Avatars */}
            {winnersData.slice(0, 3).map((winner, i) => {
                const config = podiumConfigs[i] || podiumConfigs[0];
                return (
                    <WinnerAvatar
                        key={winner.socketId || i}
                        position={config.pos}
                        name={winner.username}
                        color={primaryColor}
                        index={i}
                        height={config.height}
                    />
                );
            })}

            {/* Confetti */}
            <Confetti teamColor={teamColor} />

            {/* "+50 🏆" floating text */}
            <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.5}>
                <Text
                    position={[0, 10, 0]}
                    fontSize={1.2}
                    color="#ffd700"
                    anchorX="center"
                    anchorY="middle"
                    font="https://fonts.gstatic.com/s/orbitron/v31/yMJRMIlzdpvBhQQL_Qq7dy0.woff2"
                    outlineWidth={0.08}
                    outlineColor="#000"
                >
                    +{trophyReward} 🏆 TROPHIES
                </Text>
            </Float>
        </group>
    );
}
