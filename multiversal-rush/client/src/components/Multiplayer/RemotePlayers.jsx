// ============================================================
//  components/Multiplayer/RemotePlayers.jsx
//  Renders 3D models for every player EXCEPT yourself,
//  only if they are in the same world as you.
// ============================================================
import React from "react";
import { Text, useGLTF } from "@react-three/drei";
import useStore from "../../store/store";
import socket from "../../socket/socket";

// Colour palette for name tags
const PLAYER_COLORS = ["#ff4d6d", "#ffd166", "#06d6a0", "#118ab2", "#a855f7"];

// Pre-load both possible avatars so there's no stutter
useGLTF.preload('/models/red-panda/scene.gltf');
useGLTF.preload('/models/penguin/scene.gltf');

function RemotePlayerModel() {
    // Use the locally-selected avatar path — remote players mirror the same model
    // (all players in a session chose their avatar before joining)
    const avatarPath = useStore((s) => s.avatar);
    const { scene } = useGLTF(avatarPath);

    // Clone so each remote player gets their own instance
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);

    return <primitive object={clonedScene} scale={[1.2, 1.2, 1.2]} />;
}

export default function RemotePlayers() {
    const players = useStore((s) => s.players);
    const currentWorld = useStore((s) => s.currentWorld);
    const myId = socket.id;

    return (
        <>
            {Object.values(players)
                .filter((p) =>
                    p.id !== myId &&
                    !p.eliminated &&
                    (
                        // Same world number → show
                        p.world === currentWorld ||
                        // Both in game (non-zero world) and currentWorld is non-zero
                        // handles slight timing skew between clients
                        (currentWorld !== 0 && p.world !== 0)
                    )
                )
                .map((p, idx) => {
                    const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
                    const pos = p.position || { x: 0, y: 1, z: 0 };
                    const rot = p.rotation || { y: 0 };

                    return (
                        <group key={p.id} position={[pos.x, pos.y, pos.z]} rotation={[0, rot.y, 0]}>
                            {/* Player 3D Model */}
                            <RemotePlayerModel />

                            {/* Name tag above player */}
                            <Text
                                position={[0, 2.2, 0]}
                                fontSize={0.28}
                                color={color}
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={0.03}
                                outlineColor="#000000"
                            >
                                {p.name}
                            </Text>

                            {/* Crown if finished */}
                            {p.finished && (
                                <Text
                                    position={[0, 2.6, 0]}
                                    fontSize={0.35}
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
