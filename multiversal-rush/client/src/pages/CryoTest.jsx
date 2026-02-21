import React from "react";
import { Canvas } from "@react-three/fiber";
import WorldCryoVoid from "../components/Worlds/WorldCryoVoid";
import HUD from "../components/UI/HUD";
import useStore from "../store/store";

/**
 * A dedicated test page for Cryo Void world.
 * Allows viewing the world directly without playing through World 1 & 2.
 */
export default function CryoTestPage() {
    // Mock emitters for the world component
    const emitMove = (data) => console.log("Emit Move:", data);
    const emitFinished = () => alert("Finished Cryo Void!");
    const emitFell = () => console.log("Player fell!");
    const emitWorldTransition = (n) => console.log("Transition to:", n);

    const playerName = useStore((s) => s.playerName) || "CryoExplorer";
    const roomId = useStore((s) => s.roomId) || "TEST";

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#050810" }}>
            {/* Header info */}
            <div style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                zIndex: 10,
                color: "#aaddff",
                fontFamily: "monospace",
                pointerEvents: "none"
            }}>
                <h2 style={{ margin: 0 }}>CRYO VOID - TEST ROUTE</h2>
                <p>WASD to Move | Space to Jump | Shift to Slide</p>
            </div>

            <Canvas
                camera={{ position: [0, 5, 10], fov: 70 }}
                style={{ position: "absolute", inset: 0, zIndex: 1 }}
            >
                <WorldCryoVoid
                    emitMove={emitMove}
                    emitFinished={emitFinished}
                    emitFell={emitFell}
                    emitWorldTransition={emitWorldTransition}
                />
            </Canvas>
        </div>
    );
}
