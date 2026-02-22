// ============================================================
//  components/UI/HUD.jsx — In-game overlay
//  Varun: player count, timer, finish position, exit
//  archit2: Voice widget (LiveKit, default muted+deafened)
// ============================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/store";
import socket from "../../socket/socket";
import Voice from "../../voice/Voice";

export default function HUD({ emitMethods, currentLevel }) {
    const navigate = useNavigate();
    const players = useStore((s) => s.players);
    const currentWorld = useStore((s) => s.currentWorld);
    const gameState = useStore((s) => s.gameState);
    const startTime = useStore((s) => s.startTime);
    const myFinishResult = useStore((s) => s.myFinishResult);
    const finishedOrder = useStore((s) => s.finishedOrder);
    const playerName = useStore((s) => s.playerName);
    const roomId = useStore((s) => s.roomId);

    const [elapsed, setElapsed] = useState(0);

    // ---- Timer ----
    useEffect(() => {
        if (gameState !== "playing" || !startTime) return;
        const id = setInterval(() => setElapsed(Date.now() - startTime), 100);
        return () => clearInterval(id);
    }, [gameState, startTime]);

    const formatTime = (ms) => {
        const s = Math.floor(ms / 1000);
        const m = (ms % 1000).toString().padStart(3, "0");
        return `${s}.${m}s`;
    };

    const handleExit = () => {
        if (window.confirm("Exit game? You'll return to the lobby.")) {
            socket.disconnect();
            navigate("/lobby");
        }
    };

    const levelLabel = {
        hub: "🎮 Game Lobby",
        frozenfrenzy: "🌨️ Frozen Frenzy",
        lavahell: "🔥 Lava Hell",
        honeycomb: "🍯 Honeycomb",
        neonparadox: "🔮 Neon Paradox",
        cryovoid: "❄️ Cryo Void",
        cyberverse: "🌐 Cyberverse",
        world2: "🌋 World 2",
    }[currentLevel] || "🎮 Game Lobby";

    const playerList = Object.values(players);
    const activePlayers = playerList.filter((p) => !p.eliminated);
    const myPlace = myFinishResult?.position;

    // ---- Leveling info (sync with server logic) ----
    const xp = useStore((s) => s.xp);
    const level = useStore((s) => s.level);
    const gems = useStore((s) => s.gems);

    const getXPRequirement = (lvl) => 100 + (lvl - 1) * 200;
    const currentXPNeeded = getXPRequirement(level);

    // We assume 'xp' in store is the XP earned WITHIN the current level
    // (If it's total XP, we'd need getLevelInfo logic)
    // Looking at distributeTrophies logic: user.xp is set to newTotalXP.
    // So the client needs to calculate current level progress from TOTAL XP.

    const calculateProgress = (totalXP) => {
        let curlvl = 1;
        let req = 100;
        let runningXP = totalXP;
        while (runningXP >= req) {
            runningXP -= req;
            curlvl++;
            req += 200;
        }
        return { curlvl, runningXP, req };
    };

    const { curlvl, runningXP, req } = calculateProgress(xp);
    const xpPercentage = Math.min(100, (runningXP / req) * 100);

    return (
        <div style={S.hud}>
            {/* ---- Level & XP Panel (Top Left) ---- */}
            <div style={S.levelPanel}>
                <div style={S.levelBadge}>LVL {curlvl}</div>
                <div style={S.xpTrack}>
                    <div style={{ ...S.xpBar, width: `${xpPercentage}%` }} />
                    <span style={S.xpText}>{Math.floor(runningXP)} / {req} XP</span>
                </div>
                <div style={S.gemBadge}>
                    <span style={{ fontSize: "1.2rem" }}>💎</span> {gems}
                </div>
            </div>

            {/* ---- Exit ---- */}
            <button onClick={handleExit} style={S.exit} id="btn-exit-game">✕ Exit</button>

            {/* ---- Level badge ---- */}
            <div style={S.badge}>{levelLabel}</div>

            {/* ---- Timer ---- */}
            <div style={S.timer}>⏱ {formatTime(elapsed)}</div>

            {/* ---- Player count ---- */}
            <div style={S.count}>👥 {activePlayers.length}/{playerList.length} active</div>

            {/* ---- Voice widget (archit2 — bottom-left) ---- */}
            <div style={S.voiceWrap}>
                <Voice name={playerName || "Player"} room={roomId || "game"} />
            </div>

            {/* ---- Finish banner ---- */}
            {myFinishResult && (
                <div style={S.finishBanner}>
                    🏁 You finished #{myPlace}!<br />
                    Time: {formatTime(myFinishResult.finishTime)}
                </div>
            )}

            {/* ---- Finish order sidebar ---- */}
            {finishedOrder.length > 0 && (
                <div style={S.finishedList}>
                    {finishedOrder.map((id, i) => (
                        <div key={id} style={S.finishedItem}>
                            #{i + 1} {players[id]?.name || id}
                        </div>
                    ))}
                </div>
            )}

            {/* ---- Controls hint ---- */}
            {gameState === "playing" && (
                <div style={S.hint}>
                    WASD · Move &nbsp;|&nbsp; Space · Jump &nbsp;|&nbsp; Shift · Crouch
                </div>
            )}
        </div>
    );
}

const S = {
    hud: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10, fontFamily: "'Exo 2',sans-serif", color: "#fff" },
    exit: { position: "absolute", bottom: 20, right: 20, background: "rgba(255,77,109,0.25)", border: "1px solid rgba(255,77,109,0.6)", backdropFilter: "blur(8px)", padding: "10px 24px", borderRadius: 12, fontSize: "1rem", fontWeight: 700, color: "#ff4d6d", cursor: "pointer", pointerEvents: "auto", transition: "all 0.2s", zIndex: 100 },
    levelPanel: { position: "absolute", top: 16, left: 20, display: "flex", alignItems: "center", gap: 12, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)", padding: "8px 16px", borderRadius: 16, pointerEvents: "auto" },
    levelBadge: { background: "linear-gradient(135deg, #00ffe0, #0077ff)", color: "#000", fontWeight: 900, fontSize: "0.9rem", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(0,255,224,0.4)" },
    xpTrack: { width: 140, height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 6, position: "relative", overflow: "hidden" },
    xpBar: { height: "100%", background: "linear-gradient(90deg, #00ffe0, #0077ff)", transition: "width 0.5s ease-out" },
    xpText: { position: "absolute", top: "100%", left: 0, fontSize: "0.65rem", color: "#aaa", fontWeight: 600, marginTop: 4 },
    gemBadge: { display: "flex", alignItems: "center", gap: 6, fontSize: "1.1rem", fontWeight: 800, color: "#00ffe0", marginLeft: 4, textShadow: "0 0 10px rgba(0,255,224,0.3)" },
    badge: { position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,255,200,0.35)", backdropFilter: "blur(8px)", padding: "6px 20px", borderRadius: 999, fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.08em", color: "#00ffe0" },
    timer: { position: "absolute", top: 16, right: 20, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,255,200,0.25)", backdropFilter: "blur(8px)", padding: "6px 14px", borderRadius: 8, fontFamily: "'Orbitron',monospace", fontSize: "1.1rem", color: "#ffe066" },
    count: { position: "absolute", top: 70, left: 20, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,255,200,0.2)", backdropFilter: "blur(8px)", padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem", color: "#a0cfff" },
    voiceWrap: { position: "absolute", bottom: 60, left: 20, pointerEvents: "auto", zIndex: 50 },
    finishBanner: { position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,200,140,0.18)", border: "2px solid rgba(0,255,200,0.5)", backdropFilter: "blur(12px)", borderRadius: 16, padding: "20px 40px", fontSize: "1.4rem", fontWeight: 700, textAlign: "center", color: "#00ffe0", textShadow: "0 0 20px rgba(0,255,200,0.5)" },
    finishedList: { position: "absolute", bottom: 60, right: 20, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,255,200,0.2)", backdropFilter: "blur(8px)", borderRadius: 10, padding: "10px 16px", display: "flex", flexDirection: "column", gap: 4, fontSize: "0.82rem", color: "#c0e8ff", minWidth: 140 },
    finishedItem: { padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" },
    hint: { position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(6px)", padding: "5px 18px", borderRadius: 999, fontSize: "0.75rem", color: "rgba(200,220,255,0.6)", letterSpacing: "0.05em" },
};
