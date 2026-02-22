// ============================================================
//  pages/RelayGame.jsx — Multiversal Relay Game Page
//  Route: /relay-game/:roomId
//  Stage 1: Lava Hell  |  Stage 2: Neon Paradox  |  Stage 3: Frozen Frenzy
//  Teams run independently — no waiting for other team.
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import * as THREE from "three";
import { useGLTF, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

// ── Race Maps ──
import FrozenFrenzyArena from "../components/Worlds/FrozenFrenzyArena";
import WorldLavaHell from "../components/Worlds/WorldLavaHell";
import WorldNeonParadox from "../components/Worlds/WorldNeonParadox";

// ── Victory Screen ──
import VictoryPodium from "../components/Worlds/VictoryPodium";

import "./RelayGame.css";

// Map ID → display label
const MAP_LABELS = {
    lavahell: "🔥 Lava Hell",
    neonparadox: "🔮 Neon Paradox",
    frozenfrenzy: "🌨️ Frozen Frenzy",
};

// Map ID → R3F world number (sent in relay:move)
const MAP_WORLD_NUM = {
    lavahell: 5,
    neonparadox: 1,
    frozenfrenzy: 7,
};

const CHEER_EMOJIS = ["🎉", "🔥", "💪", "👏", "⚡", "🎊", "😤", "🏆", "🫡", "🚀"];

// ── Teammate Avatar Component ──
function TeammateAvatar({ position, rotation, name, avatar, cheerText }) {
    const { scene } = useGLTF(avatar || "/models/penguin/scene.gltf");
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    return (
        <group
            position={[position?.x ?? 0, position?.y ?? 0, position?.z ?? 0]}
            rotation={[0, rotation?.y ?? 0, 0]}
        >
            <primitive object={clonedScene} scale={[1.2, 1.2, 1.2]} />
            <Text
                position={[0, 2.4, 0]}
                fontSize={0.3}
                color="#00ffe0"
                anchorX="center"
                outlineWidth={0.04}
                outlineColor="#000000"
            >
                {name}
            </Text>
            {/* Floating cheer above avatar */}
            {cheerText && (
                <Text
                    position={[0, 3.2, 0]}
                    fontSize={0.5}
                    anchorX="center"
                >
                    {cheerText}
                </Text>
            )}
        </group>
    );
}

// ── FREE FLY SPECTATOR CAMERA (FPP Ghost Mode) ──
// Pointer Lock for mouse look, WASD+QE to fly, Shift = faster
function FreeFlyCam({ canvasRef }) {
    const keysRef = useRef({});
    const yawRef = useRef(0);   // horizontal look (Y axis)
    const pitchRef = useRef(0); // vertical look (X axis)
    const lockedRef = useRef(false);

    useEffect(() => {
        const canvas = canvasRef?.current;
        if (!canvas) return;

        function onClick() {
            if (!lockedRef.current) canvas.requestPointerLock();
        }
        function onLockChange() {
            lockedRef.current = document.pointerLockElement === canvas;
        }
        function onMouseMove(e) {
            if (!lockedRef.current) return;
            const sens = 0.0018;
            yawRef.current -= e.movementX * sens;
            pitchRef.current = Math.max(-Math.PI / 2 + 0.05,
                Math.min(Math.PI / 2 - 0.05, pitchRef.current - e.movementY * sens));
        }
        function onKeyDown(e) { keysRef.current[e.code] = true; }
        function onKeyUp(e) { keysRef.current[e.code] = false; }

        canvas.addEventListener("click", onClick);
        document.addEventListener("pointerlockchange", onLockChange);
        document.addEventListener("mousemove", onMouseMove);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);

        return () => {
            canvas.removeEventListener("click", onClick);
            document.removeEventListener("pointerlockchange", onLockChange);
            document.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            if (document.exitPointerLock) document.exitPointerLock();
        };
    }, [canvasRef]);

    const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
    const forward = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const up = new THREE.Vector3(0, 1, 0);

    useFrame((state, delta) => {
        const k = keysRef.current;
        const speed = (k["ShiftLeft"] || k["ShiftRight"]) ? 28 : 10;
        const dt = Math.min(delta, 0.05);

        // Apply yaw + pitch to camera
        euler.current.set(pitchRef.current, yawRef.current, 0, "YXZ");
        state.camera.quaternion.setFromEuler(euler.current);

        // Movement directions
        state.camera.getWorldDirection(forward.current);
        right.current.crossVectors(forward.current, up).normalize();

        if (k["KeyW"] || k["ArrowUp"]) state.camera.position.addScaledVector(forward.current, speed * dt);
        if (k["KeyS"] || k["ArrowDown"]) state.camera.position.addScaledVector(forward.current, -speed * dt);
        if (k["KeyA"] || k["ArrowLeft"]) state.camera.position.addScaledVector(right.current, -speed * dt);
        if (k["KeyD"] || k["ArrowRight"]) state.camera.position.addScaledVector(right.current, speed * dt);
        if (k["KeyQ"] || k["Space"]) state.camera.position.addScaledVector(up, speed * dt);
        if (k["KeyE"] || k["ControlLeft"]) state.camera.position.addScaledVector(up, -speed * dt);
    });
    return null;
}

// ── Spectator Camera — smoothly follows target runner ──
function SpectatorCamera({ targetId, teammates }) {
    useFrame((state) => {
        if (!targetId) return;
        const target = teammates[targetId];
        if (!target?.position) return;
        // Follow smoothly slightly behind and above target
        const tp = new THREE.Vector3(target.position.x, target.position.y, target.position.z);
        state.camera.position.lerp(tp.clone().add(new THREE.Vector3(0, 5, 10)), 0.1);
        state.camera.lookAt(tp.clone().add(new THREE.Vector3(0, 2, 0))); // look slightly above them
    });
    return null;
}

// ── Floating cheer emoji ──
function FloatingCheer({ cheer, onDone }) {
    const style = {
        position: "fixed",
        left: `${cheer.x}%`,
        bottom: "15%",
        fontSize: cheer.big ? "3rem" : "2rem",
        animation: "floatUp 2.2s ease-out forwards",
        pointerEvents: "none",
        zIndex: 9999,
        userSelect: "none",
        filter: "drop-shadow(0 0 8px rgba(255,255,200,0.8))",
    };
    useEffect(() => {
        const t = setTimeout(onDone, 2200);
        return () => clearTimeout(t);
    }, [onDone]);
    return <div style={style}>{cheer.emoji}</div>;
}

export default function RelayGame() {
    const navigate = useNavigate();
    const { roomId } = useParams();
    const location = useLocation();
    const playerName = useStore((s) => s.playerName);
    const setCurrentWorld = useStore((s) => s.setCurrentWorld);

    // Refs for stale-closure-safe callbacks
    const myTeamRef = useRef(null);
    const stageMapRef = useRef({});
    const currentMapIdRef = useRef(null);

    // ── Relay state ──
    const [phase, setPhase] = useState("waiting");
    const [stageMap, setStageMap] = useState({});
    const [redStage, setRedStage] = useState(1);
    const [blueStage, setBlueStage] = useState(1);
    const [myTeam, setMyTeam] = useState(null);
    const [isActiveRunner, setIsActiveRunner] = useState(false);
    const [activeRedRunnerId, setActiveRedRunnerId] = useState(null);
    const [activeBlueRunnerId, setActiveBlueRunnerId] = useState(null);
    const [currentMapId, setCurrentMapId] = useState(null);

    // Teammate positions — keyed by socketId
    // Each entry: { position, rotation, world, avatar }
    const [teammates, setTeammates] = useState({});

    // ── Victory / notification ──
    const [victoryData, setVictoryData] = useState(null);
    const [stageNotification, setStageNotification] = useState(null);

    // ── Cheer feature & Toasts ──
    const [cheers, setCheers] = useState([]); // { id, emoji, x, big }
    const [cheerToasts, setCheerToasts] = useState([]); // { id, text, team }
    const cheerIdRef = useRef(0);
    const canvasRef = useRef(null);

    // ── Spectator modes ──
    const [spectatorMode, setSpectatorMode] = useState("follow"); // "follow" | "freefly"

    // ── Helper: apply game-starting data ──
    const applyGameStarting = useCallback((data) => {
        const {
            stageMap: sm, redActiveRunner, blueActiveRunner,
            redTeam: rt, blueTeam: bt, redStage: rs = 1, blueStage: bs = 1
        } = data;
        if (!sm) return;

        stageMapRef.current = sm;
        setStageMap(sm);
        setRedStage(rs);
        setBlueStage(bs);
        setPhase("playing");
        setVictoryData(null);

        const mine = socket.id;
        let myTeamColor = null;
        if (rt?.includes(mine)) myTeamColor = "red";
        else if (bt?.includes(mine)) myTeamColor = "blue";

        setMyTeam(myTeamColor);
        myTeamRef.current = myTeamColor;

        const map = sm[1];
        currentMapIdRef.current = map;
        setCurrentMapId(map);
        if (map && MAP_WORLD_NUM[map]) setCurrentWorld(MAP_WORLD_NUM[map]);

        const amRunner = redActiveRunner === mine || blueActiveRunner === mine;
        setIsActiveRunner(amRunner);
        setActiveRedRunnerId(redActiveRunner);
        setActiveBlueRunnerId(blueActiveRunner);

        console.log("[RelayGame] Applied game data. team:", myTeamColor, "isRunner:", amRunner, "map:", map);
    }, [setCurrentWorld]);

    // ── On mount: router state OR request from server ──
    useEffect(() => {
        const routerGameData = location.state?.gameData;
        if (routerGameData) {
            applyGameStarting(routerGameData);
        } else {
            const name = playerName || (() => {
                try { return JSON.parse(localStorage.getItem("mr_user"))?.username; } catch { return null; }
            })();
            if (name) {
                const myAvatar = useStore.getState().avatar;
                socket.emit("relay:joinRoom", { roomId, playerName: name, avatar: myAvatar });
                setTimeout(() => socket.emit("relay:requestGameState"), 600);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Socket listeners ──
    useEffect(() => {
        function onGameStarting(data) {
            applyGameStarting(data);
        }

        function onRelayUpdate({ team, completedBy, newStage, newActiveRunner, redStage: rs, blueStage: bs, stageMap: sm }) {
            const latestMap = sm || stageMapRef.current;
            if (sm) { stageMapRef.current = sm; setStageMap(sm); }
            setRedStage(rs);
            setBlueStage(bs);

            setStageNotification({ team, text: `${completedBy} finished Stage ${newStage - 1} for ${team.toUpperCase()}!` });
            setTimeout(() => setStageNotification(null), 3500);

            if (team === "red") setActiveRedRunnerId(newActiveRunner);
            else setActiveBlueRunnerId(newActiveRunner);

            const iAmNewRunner = newActiveRunner === socket.id;
            if (iAmNewRunner) {
                setIsActiveRunner(true);
                const myStage = team === "red" ? rs : bs;
                const map = latestMap[myStage];
                if (map) {
                    currentMapIdRef.current = map;
                    setCurrentMapId(map);
                    if (MAP_WORLD_NUM[map]) setCurrentWorld(MAP_WORLD_NUM[map]);
                }
            } else if (team === myTeamRef.current) {
                // My team advanced but I'm not the runner → spectate new stage
                setIsActiveRunner(false);
                const myStage = team === "red" ? rs : bs;
                const map = latestMap[myStage];
                if (map) {
                    currentMapIdRef.current = map;
                    setCurrentMapId(map);
                }
            }
        }

        function onVictoryScreen(data) {
            setPhase("victory");
            setVictoryData(data);
        }

        function onGameCancelled() {
            setPhase("cancelled");
            setTimeout(() => navigate(`/team-lobby/${roomId}`), 3000);
        }

        // KEY FIX: store world number with each teammate move
        function onPlayerMoved({ playerId, position, rotation, world, avatar }) {
            if (playerId === socket.id) return;
            setTeammates(prev => ({
                ...prev,
                [playerId]: { position, rotation, world, avatar }
            }));
        }

        // Cheer from another player
        function onCheer({ emoji, senderName, senderTeam }) {
            const isMyTeam = senderTeam === myTeamRef.current;
            spawnCheer(emoji, isMyTeam);

            // Add a toast for the 2D HUD (and 3D avatar display text could also read from it)
            const id = ++cheerIdRef.current;
            setCheerToasts(prev => [...prev, { id, text: `${senderName}: ${emoji}`, team: senderTeam }]);
            setTimeout(() => {
                setCheerToasts(prev => prev.filter(c => c.id !== id));
            }, 3000);
        }

        socket.on("relay:gameStarting", onGameStarting);
        socket.on("relay:relayUpdate", onRelayUpdate);
        socket.on("showVictoryScreen", onVictoryScreen);
        socket.on("relay:gameCancelled", onGameCancelled);
        socket.on("relay:playerMoved", onPlayerMoved);
        socket.on("relay:cheer", onCheer);

        return () => {
            socket.off("relay:gameStarting", onGameStarting);
            socket.off("relay:relayUpdate", onRelayUpdate);
            socket.off("showVictoryScreen", onVictoryScreen);
            socket.off("relay:gameCancelled", onGameCancelled);
            socket.off("relay:playerMoved", onPlayerMoved);
            socket.off("relay:cheer", onCheer);
        };
    }, [navigate, roomId, setCurrentWorld, applyGameStarting]);

    // ── Emit helpers ──
    const emitMove = useCallback(({ position, rotation, world }) => {
        socket.emit("relay:move", { position, rotation, world });
    }, []);

    const emitFinished = useCallback(() => {
        socket.emit("relay:relayStageComplete");
        setIsActiveRunner(false);
    }, []);

    const emitFell = useCallback(() => { }, []);
    const emitAchievement = useCallback((type, value = 1) => { socket.emit("achievementEvent", { type, value }); }, []);
    const emitWorldTransition = useCallback(() => { }, []);

    // ── Cheer helper ──
    function spawnCheer(emoji, big = false) {
        const id = ++cheerIdRef.current;
        const x = 10 + Math.random() * 80;
        setCheers(prev => [...prev, { id, emoji, x, big }]);
    }

    function handleCheer(emoji) {
        socket.emit("relay:sendCheer", { emoji, team: myTeam });
        // Also spawn locally immediately
        spawnCheer(emoji, true);
    }

    function removeCheer(id) {
        setCheers(prev => prev.filter(c => c.id !== id));
    }

    function handleReturnToLobby() {
        socket.emit("relay:returnToLobby");
        setVictoryData(null);
        setPhase("waiting");
        navigate(`/team-lobby/${roomId}`);
    }

    // ── Render map scene inside Canvas ──
    // KEY FIX: only render teammate avatars who are on the SAME world as the current map view
    function renderMapScene() {
        if (!currentMapId) return null;

        const commonProps = { emitMove, emitFinished, emitFell, emitAchievement, emitWorldTransition };
        const hidePlayer = !isActiveRunner;
        const myWorldNum = MAP_WORLD_NUM[currentMapId];

        let MapComp = null;
        if (currentMapId === "lavahell") MapComp = <WorldLavaHell {...commonProps} hidePlayer={hidePlayer} />;
        else if (currentMapId === "neonparadox") MapComp = <WorldNeonParadox {...commonProps} hidePlayer={hidePlayer} />;
        else if (currentMapId === "frozenfrenzy") MapComp = <FrozenFrenzyArena {...commonProps} hidePlayer={hidePlayer} />;

        if (!MapComp) return null;

        // Only show runners who are IN THE SAME WORLD as me right now
        const visibleRunners = Object.entries(teammates).filter(([id, t]) => {
            if (t.world !== myWorldNum) return false; // DIFFERENT MAP → don't show
            const isRunner = (id === activeRedRunnerId || id === activeBlueRunnerId);
            return isRunner;
        });

        // For spectator: only followers if they exist
        const followId = myTeam === "red" ? activeRedRunnerId : activeBlueRunnerId;
        const followTarget = followId && teammates[followId];
        const canFollow = followTarget && followTarget.world === myWorldNum;

        return (
            <>
                {MapComp}

                {/* Spectator Camera modes */}
                {hidePlayer && spectatorMode === "freefly" && (
                    <FreeFlyCam canvasRef={canvasRef} />
                )}
                {hidePlayer && spectatorMode === "follow" && canFollow && (
                    <SpectatorCamera targetId={followId} teammates={teammates} />
                )}

                {/* Teammate avatars — filtered to same world only */}
                {visibleRunners.map(([id, t]) => {
                    const isRed = id === activeRedRunnerId;
                    const avatarTeam = isRed ? "red" : "blue";

                    // Show latest cheer assigned to this team
                    const activeToast = cheerToasts.filter(c => c.team === avatarTeam).pop();

                    return (
                        <TeammateAvatar
                            key={id}
                            position={t.position}
                            rotation={t.rotation}
                            avatar={t.avatar}
                            name={isRed ? "🔴 Red Runner" : "🔵 Blue Runner"}
                            cheerText={activeToast ? activeToast.text : null}
                        />
                    );
                })}
            </>
        );
    }

    // ── VICTORY ──
    if (victoryData) {
        return (
            <div className="relay-game-page">
                <div className="victory-overlay">
                    <div className={`victory-banner ${victoryData.winningTeamColor}`}>
                        <div className="victory-trophy">🏆</div>
                        <h1 className="victory-title">
                            {victoryData.winningTeamColor?.toUpperCase()} TEAM WINS!
                        </h1>
                        <div className="victory-reward">+{victoryData.trophyReward || 50} Trophies</div>
                        <div className="victory-winners">
                            {(victoryData.winnersData || []).map((w, i) => (
                                <div key={w.socketId || i} className="victory-winner-card">
                                    <span className="vw-avatar">{w.username?.charAt(0)?.toUpperCase() || "?"}</span>
                                    <span className="vw-name">{w.username}</span>
                                    <span className="vw-trophies">🏆 {w.totalTrophies}</span>
                                </div>
                            ))}
                        </div>
                        <button className="victory-return-btn" onClick={handleReturnToLobby} id="btn-return-lobby">
                            ← Return to Lobby
                        </button>
                    </div>
                </div>
                <Canvas camera={{ position: [0, 6, 14], fov: 55 }} style={{ position: "absolute", inset: 0 }} gl={{ antialias: true }}>
                    <VictoryPodium data={victoryData} />
                </Canvas>
            </div>
        );
    }

    // ── CANCELLED ──
    if (phase === "cancelled") {
        return (
            <div className="relay-game-page">
                <div className="gameover-overlay cancelled">
                    <h1 className="gameover-title">Race Cancelled</h1>
                    <p className="gameover-sub">Not enough players. Returning…</p>
                </div>
            </div>
        );
    }

    // ── WAITING ──
    if (phase === "waiting") {
        return (
            <div className="relay-game-page">
                <div className="relay-hud">
                    <div className="relay-scoreboard">
                        <div className="score-side score-red"><span className="score-label">RED</span><span className="score-value">1/3</span></div>
                        <div className="score-divider"><span className="score-turn">RELAY RACE</span><span className="score-vs">—</span></div>
                        <div className="score-side score-blue"><span className="score-value">1/3</span><span className="score-label">BLUE</span></div>
                    </div>
                    <div className="relay-phase-bar">
                        <div className="phase-label">⏳ Starting relay race…</div>
                    </div>
                </div>
            </div>
        );
    }

    // ── MAIN GAME ──
    return (
        <div className="relay-game-page">
            {/* ── Relay HUD ── */}
            <div className="relay-hud">
                <div className="relay-scoreboard">
                    <div className="score-side score-red">
                        <span className="score-label">RED</span>
                        <span className="score-value">{redStage > 3 ? "✓" : `${Math.min(redStage, 3)}/3`}</span>
                    </div>
                    <div className="score-divider">
                        <span className="score-turn">RELAY RACE</span>
                        <span className="score-vs">—</span>
                    </div>
                    <div className="score-side score-blue">
                        <span className="score-value">{blueStage > 3 ? "✓" : `${Math.min(blueStage, 3)}/3`}</span>
                        <span className="score-label">BLUE</span>
                    </div>
                </div>

                {/* Current map + status */}
                <div className="relay-phase-bar">
                    <div className="phase-aiming">
                        <div className="aim-info">
                            <span className="phase-label">{MAP_LABELS[currentMapId] || "Racing..."}</span>
                            {isActiveRunner ? (
                                <span className="aim-instruction">🏃 You are the active runner — reach the finish!</span>
                            ) : (
                                <span className="aim-locked">👀 Spectating — cheering on {myTeam === "red" ? "🔴 Red" : "🔵 Blue"}!</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stage progress chips */}
                <div className="relay-stages-bar">
                    {[1, 2, 3].map((stage) => {
                        const mapId = stageMap[stage];
                        const redDone = redStage > stage;
                        const blueDone = blueStage > stage;
                        const isCurrent = (redStage === stage || blueStage === stage);
                        return (
                            <div key={stage} className={`relay-stage-chip ${isCurrent ? "active" : ""} ${redDone && blueDone ? "done" : ""}`}>
                                <span className="rsc-num">Stage {stage}</span>
                                <span className="rsc-map">{MAP_LABELS[mapId] || mapId}</span>
                                <div className="rsc-status">
                                    <span className={`rsc-dot red ${redDone ? "done" : ""}`} />
                                    <span className={`rsc-dot blue ${blueDone ? "done" : ""}`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Team badge */}
                {myTeam && (
                    <div className={`my-team-badge ${myTeam}`}>
                        {myTeam === "red" ? "🔴" : "🔵"} {myTeam.toUpperCase()} TEAM
                        {isActiveRunner ? " — 🏃 RUNNING" : " — 👀 SPECTATING"}
                    </div>
                )}
            </div>

            {/* Stage complete notification */}
            {stageNotification && (
                <div className={`goal-overlay ${stageNotification.team}`}>
                    <div className="goal-icon">🏁</div>
                    <div className="goal-text">{stageNotification.text}</div>
                </div>
            )}

            {/* 3D Canvas */}
            <Canvas
                ref={canvasRef}
                key={currentMapId}
                camera={{ position: [0, 6, 12], fov: 70 }}
                style={{ position: "absolute", inset: 0 }}
            >
                {renderMapScene()}
            </Canvas>

            {/* Cheer HUD overlays */}
            <div className="cheer-hud-toasts">
                {cheerToasts.map(toast => (
                    <div key={toast.id} className={`cheer-toast ${toast.team}`}>
                        {toast.text}
                    </div>
                ))}
            </div>

            {/* ── SPECTATOR PANEL (when not running) ── */}
            {!isActiveRunner && (
                <div className="spectator-panel">
                    <div className="spectator-header" style={{ justifyContent: "space-between" }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="spectator-icon-small">👀</span>
                            <span className="spectator-title-small">SPECTATING</span>
                        </div>
                        {/* Mode toggles */}
                        <div className="spec-mode-toggles">
                            <button
                                className={`spec-tab ${spectatorMode === "follow" ? "active" : ""}`}
                                onClick={() => setSpectatorMode("follow")}
                            >POV</button>
                            <button
                                className={`spec-tab ${spectatorMode === "freefly" ? "active" : ""}`}
                                onClick={() => setSpectatorMode("freefly")}
                            >FLY</button>
                        </div>
                    </div>

                    {spectatorMode === "freefly" ? (
                        <div className="spectator-help">Click to lock mouse. WASD/QE to fly. Shift for speed.</div>
                    ) : (
                        <div className="spectator-help">Following your team's current runner automatically.</div>
                    )}

                    {/* Progress bars */}
                    <div className="sp-progress">
                        <div className="sp-team-row">
                            <span className="sp-team-label">🔴 Red</span>
                            <div className="sp-bar-wrap">
                                <div className="sp-bar-fill red" style={{ width: `${((Math.min(redStage, 3)) / 3) * 100}%` }} />
                            </div>
                            <span className="sp-stage-num">{Math.min(redStage, 3)}/3</span>
                        </div>
                        <div className="sp-team-row">
                            <span className="sp-team-label">🔵 Blue</span>
                            <div className="sp-bar-wrap">
                                <div className="sp-bar-fill blue" style={{ width: `${((Math.min(blueStage, 3)) / 3) * 100}%` }} />
                            </div>
                            <span className="sp-stage-num">{Math.min(blueStage, 3)}/3</span>
                        </div>
                    </div>

                    {/* Cheer buttons */}
                    <div className="cheer-section">
                        <p className="cheer-label">Cheer your team!</p>
                        <div className="cheer-buttons">
                            {CHEER_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    className="cheer-btn"
                                    onClick={() => handleCheer(emoji)}
                                    title="Send cheer!"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating cheer emojis */}
            {cheers.map((c) => (
                <FloatingCheer key={c.id} cheer={c} onDone={() => removeCheer(c.id)} />
            ))}
        </div>
    );
}
