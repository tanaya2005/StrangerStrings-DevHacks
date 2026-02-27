import React from "react";
import { useParams } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import World1 from "../components/Worlds/World1";
import World2 from "../components/Worlds/World2";
import FrozenFrenzyArena from "../components/Worlds/FrozenFrenzyArena";
import WorldNeonParadox from "../components/Worlds/WorldNeonParadox";
import useStore from "../store/store";

/**
 * A unified test page for all worlds.
 * Usage: /test/1, /test/2, /test/3
 */
export default function WorldTest() {
    const { worldId } = useParams();
    const id = parseInt(worldId) || 1;

    // Mock emitters for the world component
    const emitMove = (data) => console.log("Emit Move:", data);
    const emitFinished = () => alert(`Finished World ${id}!`);
    const emitFell = () => console.log("Player fell!");
    const emitWorldTransition = (n) => console.log("Transition to:", n);

    const worldNames = {
        1: "Cyberverse",
        2: "Lava Hell",
        3: "Frozen Frenzy Arena",
        4: "Neon Paradox"
    };

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
                <h2 style={{ margin: 0 }}>WORLD {id}: {worldNames[id]} - TEST ROUTE</h2>
                <p>WASD to Move | Space to Jump | Shift to Slide</p>
                <p>Currently Testing in Isolated Mode (No Multiplayer Sync)</p>
            </div>

            <Canvas
                camera={{ position: [0, 5, 10], fov: 70 }}
                style={{ position: "absolute", inset: 0, zIndex: 1 }}
            >
                <React.Suspense fallback={null}>
                    {id === 1 && (
                        <World1
                            emitMove={emitMove}
                            emitWorldTransition={emitWorldTransition}
                            emitFell={emitFell}
                        />
                    )}
                    {id === 2 && (
                        <World2
                            emitMove={emitMove}
                            emitWorldTransition={emitWorldTransition}
                            emitFinished={emitFinished}
                            emitFell={emitFell}
                        />
                    )}
                    {id === 3 && (
                        <FrozenFrenzyArena
                            emitMove={emitMove}
                            emitFinished={emitFinished}
                            emitFell={emitFell}
                        />
                    )}
                    {id === 4 && (
                        <WorldNeonParadox
                            emitMove={emitMove}
                            emitFinished={emitFinished}
                            emitFell={emitFell}
                        />
                    )}
                </React.Suspense>
            </Canvas>
        </div>
    );
}
