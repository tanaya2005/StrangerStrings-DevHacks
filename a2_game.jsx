// ============================================================
//  pages/Game.jsx ÔÇö 3D Game page shell
//  Member 2 (Multiplayer) provides:
//   ÔÇó Socket listener hooks for other players' positions
//   ÔÇó Remote player meshes rendered in the scene
//   ÔÇó Position emitter (called by Member 1's movement code)
//   ÔÇó World gating (hide players from other worlds)
//
//  Member 1 slots their <World1 />, <World2 />, <Player /> here.
// ============================================================
import React, { useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import RemotePlayers from "../components/Multiplayer/RemotePlayers";
import HUD from "../components/UI/HUD";
import World1 from "../components/Worlds/World1";
import World2 from "../components/Worlds/World2";
import WorldCryoVoid from "../components/Worlds/WorldCryoVoid";
import Voice from "../voice/Voice";

export default function Game() {
    const navigate = useNavigate();

    const currentWorld = useStore((s) => s.currentWorld);
    const setCurrentWorld = useStore((s) => s.setCurrentWorld);
    const gameState = useStore((s) => s.gameState);
    const setGameState = useStore((s) => s.setGameState);
    const updatePlayer = useStore((s) => s.updatePlayer);
    const removePlayer = useStore((s) => s.removePlayer);
    const setFinishedOrder = useStore((s) => s.setFinishedOrder);
    const setMyFinishResult = useStore((s) => s.setMyFinishResult);
    const setStartTime = useStore((s) => s.setStartTime);
    const setPlayers = useStore((s) => s.setPlayers);
    const playerName = useStore((s) => s.playerName);
    const roomId = useStore((s) => s.roomId);

    // Track when we last emitted a move (client-side throttle)
    const lastEmitTime = useRef(0);

    // ---- Socket listeners ----
    useEffect(() => {
        // Another player moved
        socket.on("playerMoved", ({ playerId, position, rotation, world }) => {
            updatePlayer(playerId, { position, rotation, world });
        });

        // Another player changed world
        socket.on("playerWorldChanged", ({ playerId, newWorld }) => {
            updatePlayer(playerId, { world: newWorld });
        });

        // Another player finished
        socket.on("playerFinishedRace", ({ playerId, finishTime, finishedOrder }) => {
            updatePlayer(playerId, { finished: true, finishTime });
            setFinishedOrder(finishedOrder);
        });

        // Our own finish result
        socket.on("yourFinishResult", ({ position, finishTime }) => {
            setMyFinishResult({ position, finishTime });
        });

        // A player was eliminated
        socket.on("playerEliminated", ({ eliminatedId }) => {
            updatePlayer(eliminatedId, { eliminated: true });
        });

        // Game finished ÔåÆ navigate to leaderboard after brief delay
        socket.on("gameFinished", ({ finishedOrder }) => {
            setGameState("finished");
            setFinishedOrder(finishedOrder);
            setTimeout(() => navigate("/leaderboard"), 3000);
        });

        // Someone disconnected mid-game
        socket.on("playerLeft", ({ players }) => {
            if (players) setPlayers(players);
        });

        // Another player respawned (fell)
        socket.on("playerRespawned", ({ playerId }) => {
            updatePlayer(playerId, { position: { x: 0, y: 1, z: 0 } });
        });

        return () => {
            socket.off("playerMoved");
            socket.off("playerWorldChanged");
            socket.off("playerFinishedRace");
            socket.off("yourFinishResult");
            socket.off("playerEliminated");
            socket.off("gameFinished");
            socket.off("playerLeft");
            socket.off("playerRespawned");
        };
    }, []);

    // ---- PUBLIC API for Member 1 ----
    /**
     * emitMove({ position, rotation, world })
     * Call this from Player.jsx every frame AFTER updating position.
     * Throttled to 50ms (Ôëê 20 updates/sec) to save bandwidth.
     */
    const emitMove = useCallback(({ position, rotation, world }) => {
        const now = Date.now();
        if (now - lastEmitTime.current < 50) return; // throttle
        lastEmitTime.current = now;
        socket.emit("move", { position, rotation, world });
    }, []);

    /**
     * emitWorldTransition(newWorld)
     * Call this when the player crosses the portal.
     */
    const emitWorldTransition = useCallback((newWorld) => {
        setCurrentWorld(newWorld);
        socket.emit("worldTransition", { newWorld });
    }, []);

    /**
     * emitFinished()
     * Call this when the player crosses the final finish portal.
     */
    const emitFinished = useCallback(() => {
        socket.emit("playerFinished");
    }, []);

    /**
     * emitFell()
     * Call this when the player falls off and needs to respawn.
     */
    const emitFell = useCallback(() => {
        socket.emit("playerFell");
    }, []);

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
            {/* HUD overlay */}
            <HUD emitMethods={{ emitMove, emitWorldTransition, emitFinished, emitFell }} />

            {/* Voice chat widget (bottom-right) */}
            {playerName && roomId && (
                <div style={{ position: "absolute", bottom: "20px", right: "20px", zIndex: 100 }}>
                    <Voice name={playerName} room={roomId} />
                </div>
            )}

            {/* 3D Canvas */}
            <Canvas
                camera={{ position: [0, 5, 10], fov: 70 }}
                style={{ position: "absolute", inset: 0, zIndex: 1 }}
            >
                {/* Ambient + directional light */}
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 20, 10]} intensity={1} />

                {/* Remote players (Member 2) */}
                <RemotePlayers />

                {/* World 1 (Member 1 implements) */}
                {currentWorld === 1 && (
                    <World1
                        emitMove={emitMove}
                        emitWorldTransition={emitWorldTransition}
                        emitFell={emitFell}
                    />
                )}

                {/* World 2 (Member 1 implements) */}
                {currentWorld === 2 && (
                    <World2
                        emitMove={emitMove}
                        emitWorldTransition={emitWorldTransition}
                        emitFinished={emitFinished}
                        emitFell={emitFell}
                    />
                )}

                {/* World 3 (Cryo Void ÔÇö Member 1 implements) */}
                {currentWorld === 3 && (
                    <WorldCryoVoid
                        emitMove={emitMove}
                        emitFinished={emitFinished}
                        emitFell={emitFell}
                    />
                )}
            </Canvas>
        </div>
    );
}
