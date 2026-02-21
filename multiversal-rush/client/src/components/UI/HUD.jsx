// ============================================================
//  components/UI/HUD.jsx — In-game overlay
//  Member 2 provides: player count, timer, finish position
//  Member 4 polishes: voice/mute, chat icon
// ============================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/store";
import socket from "../../socket/socket";

export default function HUD({ emitMethods }) {
    const navigate = useNavigate();
    const players = useStore((s) => s.players);
    const currentWorld = useStore((s) => s.currentWorld);
    const gameState = useStore((s) => s.gameState);
    const startTime = useStore((s) => s.startTime);
    const myFinishResult = useStore((s) => s.myFinishResult);
    const finishedOrder = useStore((s) => s.finishedOrder);

    const [elapsed, setElapsed] = useState(0);

    // Timer tick
    useEffect(() => {
        if (gameState !== "playing" || !startTime) return;
        const id = setInterval(() => {
            setElapsed(Date.now() - startTime);
        }, 100);
        return () => clearInterval(id);
    }, [gameState, startTime]);

    const formatTime = (ms) => {
        const s = Math.floor(ms / 1000);
        const m = (ms % 1000).toString().padStart(3, "0");
        return `${s}.${m}s`;
    };

    const handleExit = () => {
        if (window.confirm("Are you sure you want to exit the game?")) {
            socket.disconnect();
            navigate("/lobby");
        }
    };

    const playerList = Object.values(players);
    const activePlayers = playerList.filter((p) => !p.eliminated);
    const myPlace = myFinishResult?.position;

    return (
        <div style={styles.hud}>
            {/* ---- Exit Button ---- */}
            <button onClick={handleExit} style={styles.exitButton}>
                ✕ Exit
            </button>

            {/* ---- World indicator ---- */}
            <div style={styles.worldBadge}>
                {currentWorld === 1 ? "🌐 Cyberverse" : "🌋 Lava Hell"}
            </div>

            {/* ---- Timer ---- */}
            <div style={styles.timer}>
                ⏱ {formatTime(elapsed)}
            </div>

            {/* ---- Player count ---- */}
            <div style={styles.playerCount}>
                👥 {activePlayers.length} / {playerList.length} active
            </div>

            {/* ---- Finish / Eliminated banner ---- */}
            {myFinishResult && (
                <div style={styles.finishBanner}>
                    🏁 You finished #{myPlace}!<br />
                    Time: {formatTime(myFinishResult.finishTime)}
                </div>
            )}

            {/* ---- Leaderboard sidebar (finish positions) ---- */}
            {finishedOrder.length > 0 && (
                <div style={styles.finishedList}>
                    {finishedOrder.map((id, i) => {
                        const p = players[id];
                        return (
                            <div key={id} style={styles.finishedItem}>
                                #{i + 1} {p?.name || id}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ---- Controls hint ---- */}
            {gameState === "playing" && (
                <div style={styles.controlsHint}>
                    WASD · Move &nbsp;|&nbsp; Space · Jump &nbsp;|&nbsp; R · Respawn
                </div>
            )}
        </div>
    );
}

const styles = {
    hud: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
        fontFamily: "'Exo 2', sans-serif",
        color: "#fff",
    },
    exitButton: {
        position: "absolute",
        top: 16, left: 20,
        background: "rgba(255,77,109,0.3)",
        border: "1px solid rgba(255,77,109,0.6)",
        backdropFilter: "blur(8px)",
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: "0.9rem",
        fontWeight: 600,
        color: "#ff4d6d",
        cursor: "pointer",
        pointerEvents: "auto",
        transition: "all 0.2s",
        zIndex: 100,
    },
    worldBadge: {
        position: "absolute",
        top: 16, left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(0,255,200,0.35)",
        backdropFilter: "blur(8px)",
        padding: "6px 20px",
        borderRadius: 999,
        fontSize: "0.85rem",
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "#00ffe0",
    },
    timer: {
        position: "absolute",
        top: 16, right: 20,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(0,255,200,0.25)",
        backdropFilter: "blur(8px)",
        padding: "6px 14px",
        borderRadius: 8,
        fontFamily: "'Orbitron', monospace",
        fontSize: "1.1rem",
        color: "#ffe066",
    },
    playerCount: {
        position: "absolute",
        top: 70, left: 20,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(0,255,200,0.2)",
        backdropFilter: "blur(8px)",
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: "0.85rem",
        color: "#a0cfff",
    },
    finishBanner: {
        position: "absolute",
        top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "rgba(0,200,140,0.18)",
        border: "2px solid rgba(0,255,200,0.5)",
        backdropFilter: "blur(12px)",
        borderRadius: 16,
        padding: "20px 40px",
        fontSize: "1.4rem",
        fontWeight: 700,
        textAlign: "center",
        color: "#00ffe0",
        textShadow: "0 0 20px rgba(0,255,200,0.5)",
    },
    finishedList: {
        position: "absolute",
        bottom: 60, right: 20,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(0,255,200,0.2)",
        backdropFilter: "blur(8px)",
        borderRadius: 10,
        padding: "10px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: "0.82rem",
        color: "#c0e8ff",
        minWidth: 140,
    },
    finishedItem: {
        padding: "3px 0",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
    },
    controlsHint: {
        position: "absolute",
        bottom: 16, left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(0,0,0,0.45)",
        border: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(6px)",
        padding: "5px 18px",
        borderRadius: 999,
        fontSize: "0.75rem",
        color: "rgba(200,220,255,0.6)",
        letterSpacing: "0.05em",
    },
};
