// ============================================================
//  pages/TeamRoomJoin.jsx — Multiversal Relay Join / Create Room
//  Players enter or generate a room code, then navigate to
//  /team-lobby/:roomId for Red vs Blue team selection.
// ============================================================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import "./TeamRoomJoin.css";

export default function TeamRoomJoin() {
    const navigate = useNavigate();
    const playerName = useStore((s) => s.playerName);
    const setPlayerName = useStore((s) => s.setPlayerName);
    const [inputRoom, setInputRoom] = useState("");
    const [error, setError] = useState("");
    const [isConnecting, setIsConnecting] = useState(false);

    // Hydrate playerName from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("mr_user");
        if (stored) {
            try {
                const user = JSON.parse(stored);
                if (user.username && !playerName) setPlayerName(user.username);
            } catch { /* ignore */ }
        }
    }, [playerName, setPlayerName]);

    // Ensure socket connected
    useEffect(() => {
        if (!socket.connected) socket.connect();
    }, []);

    function generateRoomCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return "MR-" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    function handleCreate() {
        if (!playerName) { setError("Log in first!"); return; }
        const code = generateRoomCode();
        setInputRoom(code);
        navigate(`/team-lobby/${code}`);
    }

    function handleJoin() {
        if (!inputRoom.trim()) { setError("Enter a room code"); return; }
        if (!playerName) { setError("Log in first!"); return; }
        navigate(`/team-lobby/${inputRoom.trim().toUpperCase()}`);
    }

    return (
        <div className="team-join-page">
            <div className="team-join-bg" />
            <div className="team-join-particles" />

            <div className="team-join-container">
                <button className="team-join-back" onClick={() => navigate("/home")}>
                    ← BACK
                </button>

                <div className="team-join-hero">
                    <div className="team-join-icon">🏁</div>
                    <h1 className="team-join-title">MULTIVERSAL RELAY</h1>
                    <p className="team-join-subtitle">3v3 team relay race • Race through 3 maps</p>
                </div>

                <div className="team-join-card">
                    <div className="team-join-section">
                        <h2>Join a Room</h2>
                        <div className="team-join-input-row">
                            <input
                                className="team-join-input"
                                placeholder="Room Code (e.g. MR-A1B2C)"
                                value={inputRoom}
                                onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                maxLength={10}
                                id="team-room-input"
                            />
                            <button className="team-join-btn" onClick={handleJoin} id="btn-team-join">
                                JOIN
                            </button>
                        </div>
                    </div>

                    <div className="team-join-divider">
                        <span>OR</span>
                    </div>

                    <div className="team-join-section">
                        <button className="team-join-create-btn" onClick={handleCreate} id="btn-team-create">
                            ⚡ CREATE NEW ROOM
                        </button>
                    </div>

                    {error && <p className="team-join-error">{error}</p>}
                </div>

                <div className="team-join-rules">
                    <div className="rule-item">
                        <span className="rule-icon">👥</span>
                        <span>3v3 Relay Teams</span>
                    </div>
                    <div className="rule-item">
                        <span className="rule-icon">🏁</span>
                        <span>3 Maps per Race</span>
                    </div>
                    <div className="rule-item">
                        <span className="rule-icon">🔄</span>
                        <span>Tag-team Runners</span>
                    </div>
                    <div className="rule-item">
                        <span className="rule-icon">🏆</span>
                        <span>+50 Trophies to Win</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
