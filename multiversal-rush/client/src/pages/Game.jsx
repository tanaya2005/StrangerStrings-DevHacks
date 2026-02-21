// ============================================================
//  pages/Game.jsx — 3D game shell
//  Varun: socket, emits, remote players, HUD
//  Atharva: HubWorld + Honeycomb worlds added, currentLevel state
// ============================================================
import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { Canvas } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import RemotePlayers from "../components/Multiplayer/RemotePlayers";
import HUD from "../components/UI/HUD";
import World1 from "../components/Worlds/World1";
import World2 from "../components/Worlds/World2";
import Honeycomb from "../components/Worlds/Honeycomb";
import HubWorld from "../components/Worlds/HubWorld";

export default function Game() {
    const navigate = useNavigate();
    const [currentLevel, setCurrentLevel] = useState('hub');

    const setCurrentWorld = useStore((s) => s.setCurrentWorld);
    const setGameState = useStore((s) => s.setGameState);
    const updatePlayer = useStore((s) => s.updatePlayer);
    const setFinishedOrder = useStore((s) => s.setFinishedOrder);
    const setMyFinishResult = useStore((s) => s.setMyFinishResult);
    const setStartTime = useStore((s) => s.setStartTime);
    const setPlayers = useStore((s) => s.setPlayers);

    const lastEmitTime = useRef(0);

    // ---- Socket listeners ----
    useEffect(() => {
        socket.on("playerMoved", ({ playerId, position, rotation, world }) =>
            updatePlayer(playerId, { position, rotation, world }));

        socket.on("playerWorldChanged", ({ playerId, newWorld }) =>
            updatePlayer(playerId, { world: newWorld }));

        socket.on("playerFinishedRace", ({ playerId, finishTime, finishedOrder }) => {
            updatePlayer(playerId, { finished: true, finishTime });
            setFinishedOrder(finishedOrder);
        });

        socket.on("yourFinishResult", ({ position, finishTime }) =>
            setMyFinishResult({ position, finishTime }));

        socket.on("playerEliminated", ({ eliminatedId }) =>
            updatePlayer(eliminatedId, { eliminated: true }));

        socket.on("gameFinished", ({ finishedOrder }) => {
            setGameState("finished");
            setFinishedOrder(finishedOrder);
            setTimeout(() => navigate("/leaderboard"), 3000);
        });

        socket.on("playerLeft", ({ players }) => { if (players) setPlayers(players); });

        socket.on("playerRespawned", ({ playerId }) =>
            updatePlayer(playerId, { position: { x: 0, y: 1, z: 0 } }));

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

    // Handle portal entry from HubWorld
    const handleEnterPortal = useCallback((portalId) => {
        setCurrentLevel(portalId); // 'cyberverse' | 'honeycomb'
    }, []);

    return (
        <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
            <HUD emitMethods={{ emitMove, emitWorldTransition, emitFinished, emitFell }} />

            <Canvas camera={{ position: [0, 5, 10], fov: 70 }} style={{ position: "absolute", inset: 0 }}>
                <RemotePlayers />

                {/* Hub World */}
                {currentLevel === 'hub' && (
                    <HubWorld
                        onEnterPortal={setCurrentLevel}
                        emitMove={emitMove}
                        emitFell={emitFell}
                    />
                )}

                {/* World 1 (Cyberverse) */}
                {currentLevel === 'cyberverse' && (
                    <World1
                        emitMove={emitMove}
                        emitWorldTransition={emitWorldTransition}
                        emitFell={emitFell}
                    />
                )}

                {/* World 3 - Honeycomb */}
                {currentLevel === 'honeycomb' && (
                    <Honeycomb
                        emitMove={emitMove}
                        emitWorldTransition={emitWorldTransition}
                        emitFell={emitFell}
                    />
                )}

                {/* World 3 — Honeycomb Fall */}
                {currentLevel === "honeycomb" && (
                    <Honeycomb
                        emitMove={emitMove}
                        emitWorldTransition={emitWorldTransition}
                        emitFell={emitFell}
                    />
                )}
            </Canvas>
        </div>
    );
}
