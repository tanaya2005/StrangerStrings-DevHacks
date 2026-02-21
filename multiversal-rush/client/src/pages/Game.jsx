// ============================================================
//  pages/Game.jsx — 3D game shell
//  Varun: socket, emits, remote players, HUD
//  Atharva: HubWorld + Honeycomb worlds added, currentLevel state
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import RemotePlayers from "../components/Multiplayer/RemotePlayers";
import HUD from "../components/UI/HUD";
import MatchResultsOverlay from "../components/UI/MatchResultsOverlay";
import World1 from "../components/Worlds/World1";
import World2 from "../components/Worlds/World2";
import Honeycomb from "../components/Worlds/Honeycomb";
import HubWorld from "../components/Worlds/HubWorld";
import WorldCryoVoid from "../components/Worlds/WorldCryoVoid";

export default function Game() {
    const navigate = useNavigate();
    const [currentLevel, setCurrentLevel] = useState("hub");
    const [eliminated, setEliminated] = useState(false);   // honeycomb lava death

    const setCurrentWorld = useStore((s) => s.setCurrentWorld);
    const setGameState = useStore((s) => s.setGameState);
    const updatePlayer = useStore((s) => s.updatePlayer);
    const setFinishedOrder = useStore((s) => s.setFinishedOrder);
    const setMyFinishResult = useStore((s) => s.setMyFinishResult);
    const setStartTime = useStore((s) => s.setStartTime);
    const setPlayers = useStore((s) => s.setPlayers);
    const setMatchResults = useStore((s) => s.setMatchResults);
    const showMatchResults = useStore((s) => s.showMatchResults);

    // Initialize currentWorld to 0 (hub) when game starts
    useEffect(() => {
        setCurrentWorld(0);
        console.log('[Game] Initialized currentWorld to 0 (hub)');
    }, [setCurrentWorld]);

    const lastEmitTime = useRef(0);

    // ---- Socket listeners ----
    useEffect(() => {
        socket.on("playerMoved", ({ playerId, position, rotation, world }) => {
            console.log(`[Game] playerMoved: ${playerId}, world: ${world}`);
            updatePlayer(playerId, { position, rotation, world });
        });

        socket.on("playerWorldChanged", ({ playerId, newWorld }) => {
            console.log(`[Game] playerWorldChanged: ${playerId}, newWorld: ${newWorld}`);
            updatePlayer(playerId, { world: newWorld });
        });

        socket.on("playerFinishedRace", ({ playerId, finishTime, finishedOrder }) => {
            console.log(`[Game] playerFinishedRace: ${playerId}`);
            updatePlayer(playerId, { finished: true, finishTime });
            setFinishedOrder(finishedOrder);
        });

        socket.on("yourFinishResult", ({ position, finishTime }) => {
            console.log(`[Game] yourFinishResult: position ${position}`);
            setMyFinishResult({ position, finishTime });
        });

        socket.on("playerEliminated", ({ eliminatedId }) => {
            console.log(`[Game] playerEliminated: ${eliminatedId}`);
            updatePlayer(eliminatedId, { eliminated: true });
        });

        socket.on("matchResults", ({ results }) => {
            console.log("[Game] matchResults received:", results);
            setMatchResults(results);
        });

        socket.on("returnToLobby", () => {
            console.log("[Game] returnToLobby signal received");
        });

        socket.on("gameFinished", ({ finishedOrder }) => {
            console.log("[Game] gameFinished");
            setGameState("finished");
            setFinishedOrder(finishedOrder);
        });

        socket.on("playerLeft", ({ players }) => {
            console.log("[Game] playerLeft");
            if (players) setPlayers(players);
        });

        socket.on("playerRespawned", ({ playerId }) => {
            console.log(`[Game] playerRespawned: ${playerId}`);
            updatePlayer(playerId, { position: { x: 0, y: 1, z: 0 } });
        });

        return () => {
            socket.off("playerMoved");
            socket.off("playerWorldChanged");
            socket.off("playerFinishedRace");
            socket.off("yourFinishResult");
            socket.off("playerEliminated");
            socket.off("matchResults");
            socket.off("returnToLobby");
            socket.off("gameFinished");
            socket.off("playerLeft");
            socket.off("playerRespawned");
        };
    }, []);

    const emitMove = useCallback(({ position, rotation, world }) => {
        const now = Date.now();
        if (now - lastEmitTime.current < 50) return;
        lastEmitTime.current = now;
        socket.emit("move", { position, rotation, world });
    }, []);

    const emitWorldTransition = useCallback((newWorld) => {
        setCurrentWorld(newWorld);
        socket.emit("worldTransition", { newWorld });
    }, []);

    const emitFinished = useCallback(() => socket.emit("playerFinished"), []);
    const emitFell = useCallback(() => socket.emit("playerFell"), []);
    const emitEliminated = useCallback(() => {
        socket.emit("playerEliminated");
        setEliminated(true);
    }, []);

    // Handle portal entry from HubWorld
    const handleEnterPortal = useCallback((portalId) => {
        setCurrentLevel(portalId);
        // Update world tracking based on portal
        if (portalId === 'cyberverse') setCurrentWorld(1);
        else if (portalId === 'honeycomb') setCurrentWorld(3);
        // CryoVoid: Must match world={3} in PlayerCryo.jsx
        // Both Honeycomb and CryoVoid use world=3 — that's fine,
        // they never render simultaneously so no conflict
        else if (portalId === 'cryovoid') setCurrentWorld(3);
        else if (portalId === 'hub') setCurrentWorld(0);
    }, [setCurrentWorld]);

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
            {/* Match Results Overlay - Shows above everything */}
            {showMatchResults && <MatchResultsOverlay />}

            <HUD
                emitMethods={{ emitMove, emitWorldTransition, emitFinished, emitFell }}
                currentLevel={currentLevel}
            />

            {/* 🔥 Lava elimination overlay - Only show if NOT showing match results */}
            {eliminated && !showMatchResults && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 200,
                    background: "rgba(180,0,0,0.7)", backdropFilter: "blur(10px)",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    color: "#fff", fontFamily: "'Exo 2',sans-serif",
                    pointerEvents: "auto",
                }}>
                    <div style={{ fontSize: 80 }}>🔥</div>
                    <h1 style={{ fontSize: 56, margin: "12px 0", textShadow: "0 0 40px #ff4400" }}>ELIMINATED</h1>
                    <p style={{ fontSize: 22, opacity: 0.85 }}>Waiting for match to end...</p>
                </div>
            )}

            <Canvas camera={{ position: [0, 5, 10], fov: 70 }} style={{ position: "absolute", inset: 0 }}>
                <RemotePlayers />

                {currentLevel === "hub" && (
                    <HubWorld onEnterPortal={handleEnterPortal} emitMove={emitMove} emitFell={emitFell} />
                )}

                {currentLevel === "cyberverse" && (
                    <World1 emitMove={emitMove} emitWorldTransition={emitWorldTransition} emitFell={emitFell} />
                )}

                {currentLevel === "world2" && (
                    <World2 emitMove={emitMove} emitWorldTransition={() => { }} emitFinished={emitFinished} emitFell={emitFell} />
                )}

                {/* World 3 — Honeycomb Fall */}
                {currentLevel === "honeycomb" && (
                    <Honeycomb
                        emitMove={emitMove}
                        emitWorldTransition={emitWorldTransition}
                        emitFell={emitFell}
                        emitEliminated={emitEliminated}
                    />
                )}

                {/* World 4 — Cryo Void */}
                {currentLevel === "cryovoid" && (
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
