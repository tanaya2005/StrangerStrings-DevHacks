// ============================================================
//  components/Multiplayer/RemotePlayers.jsx
//  Renders colored cubes for every player EXCEPT yourself,
//  only if they are in the same world as you.
// ============================================================
import React from "react";
import { Text } from "@react-three/drei";
import useStore from "../../store/store";
import socket from "../../socket/socket";

// Colour palette — each player gets a unique colour
const PLAYER_COLORS = ["#ff4d6d", "#ffd166", "#06d6a0", "#118ab2", "#a855f7"];

export default function RemotePlayers() {
    const players = useStore((s) => s.players);
    const currentWorld = useStore((s) => s.currentWorld);
    const myId = socket.id;

    return (
        <>
            {Object.values(players)
                .filter((p) => p.id !== myId && p.world === currentWorld && !p.eliminated)
                .map((p, idx) => {
                    const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                    const pos = p.position || { x: 0, y: 1, z: 0 };

                    return (
                        <group key={p.id} position={[pos.x, pos.y, pos.z]}>
                            {/* Player cube body */}
                            <mesh castShadow>
                                <boxGeometry args={[1, 1, 1]} />
                                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} />
                            </mesh>

                            {/* Name tag above player */}
                            <Text
                                position={[0, 1.1, 0]}
                                fontSize={0.28}
                                color="#ffffff"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.02}
                                outlineColor="#000000"
                            >
                                {p.name}
                            </Text>

                            {/* Small "finished" crown if they finished */}
                            {p.finished && (
                                <Text
                                    position={[0, 1.5, 0]}
                                    fontSize={0.3}
                                    anchorX="center"
                                    anchorY="middle"
                                >
                                    👑
                                </Text>
                            )}
                        </group>
                    );
                })}
        </>
    );
}
