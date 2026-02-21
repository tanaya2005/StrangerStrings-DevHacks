// ============================================================
//  pages/Leaderboard.jsx — Post-game & global leaderboard
//  Member 2: shows finish order from socket state.
//  Member 3: fetches global trophy leaderboard from MongoDB.
// ============================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/store";
import socket from "../socket/socket";
import "./Leaderboard.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function Leaderboard() {
    const navigate = useNavigate();

    const players = useStore((s) => s.players);
    const finishedOrder = useStore((s) => s.finishedOrder);
    const myFinishResult = useStore((s) => s.myFinishResult);
    const playerName = useStore((s) => s.playerName);
    const setLeaderboard = useStore((s) => s.setLeaderboard);
    const leaderboard = useStore((s) => s.leaderboard);

    const [loading, setLoading] = useState(true);
    const [fetchErr, setFetchErr] = useState("");

    // ---- Fetch global leaderboard from REST API ----
    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch(`${SERVER_URL}/api/leaderboard`);
                const data = await res.json();
                setLeaderboard(data);
            } catch (err) {
                setFetchErr("Could not fetch leaderboard");
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, []);

    // ---- Listen for live leaderboard pushes ----
    useEffect(() => {
        socket.on("leaderboardUpdate", ({ leaderboard }) => {
            setLeaderboard(leaderboard);
        });
        return () => socket.off("leaderboardUpdate");
    }, []);

    function formatTime(ms) {
        if (!ms) return "–";
        return `${(ms / 1000).toFixed(2)}s`;
    }

    const podiumEmojis = ["🥇", "🥈", "🥉"];

    return (
        <div className="lb-page">
            <div className="lb-bg-anim" />
            <div className="lb-container">

                <h1 className="lb-title">Race Results</h1>

                {/* ---- Match finish order ---- */}
                {finishedOrder.length > 0 && (
                    <section className="lb-section">
                        <h2 className="lb-section-title">🏁 This Race</h2>
                        <div className="lb-cards">
                            {finishedOrder.map((id, i) => {
                                const p = players[id];
                                const isSelf = id === socket.id;
                                return (
                                    <div key={id} className={`lb-card ${isSelf ? "self" : ""}`}>
                                        <span className="lb-rank">{podiumEmojis[i] || `#${i + 1}`}</span>
                                        <span className="lb-player-name">{p?.name || "Player"}</span>
                                        <span className="lb-time">{formatTime(p?.finishTime)}</span>
                                    </div>
                                );
                            })}
                            {/* Show eliminated players */}
                            {Object.values(players)
                                .filter((p) => p.eliminated)
                                .map((p) => (
                                    <div key={p.id} className="lb-card eliminated">
                                        <span className="lb-rank">💀</span>
                                        <span className="lb-player-name">{p.name}</span>
                                        <span className="lb-time">Eliminated</span>
                                    </div>
                                ))}
                        </div>
                    </section>
                )}

                {/* ---- Global leaderboard ---- */}
                <section className="lb-section">
                    <h2 className="lb-section-title">🌐 Global Trophies</h2>
                    {loading && <p className="lb-loading">Loading…</p>}
                    {fetchErr && <p className="lb-error">{fetchErr}</p>}
                    {!loading && leaderboard.length === 0 && (
                        <p className="lb-empty">No data yet – be the first to win!</p>
                    )}
                    <div className="lb-global-table">
                        {leaderboard.map((entry, i) => (
                            <div
                                key={entry._id}
                                className={`lb-row ${entry.email === useStore.getState().user?.email ? "self" : ""}`}
                            >
                                <span className="lb-row-rank">{i + 1}</span>
                                <span className="lb-row-name">{entry.email}</span>
                                <span className="lb-row-trophies">🏆 {entry.trophies}</span>
                                <span className="lb-row-wins">🎮 {entry.wins}W</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ---- Actions ---- */}
                <div className="lb-actions">
                    <button
                        id="btn-play-again"
                        className="btn-action primary"
                        onClick={() => navigate("/lobby")}
                    >
                        Play Again
                    </button>
                    <button
                        id="btn-back-home"
                        className="btn-action secondary"
                        onClick={() => navigate("/")}
                    >
                        Main Menu
                    </button>
                </div>

            </div>
        </div>
    );
}
