// ============================================================
//  pages/TeamLobby.jsx — Red vs Blue Team Matchmaking
//  Route: /team-lobby/:roomId
//  Players join Red or Blue team. Start requires 2+ per team.
//  On start, transitions to /relay-game/:roomId (Relay Race)
// ============================================================
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import "./TeamLobby.css";

export default function TeamLobby() {
    const navigate = useNavigate();
    const { roomId } = useParams();
    const user = useStore((s) => s.user);

    // Derive playerName reliably: prefer store, fall back to localStorage
    const storePlayerName = useStore((s) => s.playerName);
    const setPlayerName = useStore((s) => s.setPlayerName);

    const [joined, setJoined] = useState(false);
    const [redTeam, setRedTeam] = useState([]);
    const [blueTeam, setBlueTeam] = useState([]);
    const [myTeam, setMyTeam] = useState(null); // "red" | "blue" | null
    const [error, setError] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isHost, setIsHost] = useState(false);
    const chatEndRef = useRef(null);
    const hasJoinedRef = useRef(false); // guard against double-join

    // Resolve playerName synchronously and reliably
    const getPlayerName = useCallback(() => {
        if (storePlayerName) return storePlayerName;
        try {
            const stored = localStorage.getItem("mr_user");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.username) {
                    setPlayerName(parsed.username);
                    return parsed.username;
                }
            }
        } catch { /* ignore */ }
        return user?.username || "";
    }, [storePlayerName, user, setPlayerName]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // ── Socket setup ──
    useEffect(() => {
        if (!socket.connected) socket.connect();

        const name = getPlayerName();

        // ── Join the room (guard against double-join) ──
        if (name && roomId && !hasJoinedRef.current) {
            hasJoinedRef.current = true;
            const myAvatar = useStore.getState().avatar;
            socket.emit("relay:joinRoom", { roomId, playerName: name, avatar: myAvatar });
        }

        // ── Listeners ──
        function onRoomJoined({ roomId: rid, playerId, redTeam: r, blueTeam: b, isHost: host, chatHistory }) {
            setJoined(true);
            setRedTeam(r || []);
            setBlueTeam(b || []);
            setIsHost(host);
            setChatMessages(chatHistory || []);
            setError("");
        }

        function onTeamsUpdated({ redTeam: r, blueTeam: b }) {
            setRedTeam(r || []);
            setBlueTeam(b || []);
        }

        function onYouAreHost() {
            setIsHost(true);
        }

        function onError({ message }) {
            setError(message);
            setTimeout(() => setError(""), 5000);
        }

        function onChatUpdate({ message }) {
            setChatMessages(prev => [...prev, message].slice(-100));
        }

        function onGameStarting(data) {
            // Pass all game data through router state so RelayGame can init immediately
            navigate(`/relay-game/${roomId}`, { state: { gameData: data } });
        }

        function onPlayerLeft({ playerName: leftName, redTeam: r, blueTeam: b }) {
            setRedTeam(r || []);
            setBlueTeam(b || []);
        }

        socket.on("relay:roomJoined", onRoomJoined);
        socket.on("relay:teamsUpdated", onTeamsUpdated);
        socket.on("relay:youAreHost", onYouAreHost);
        socket.on("relay:error", onError);
        socket.on("relay:chatUpdate", onChatUpdate);
        socket.on("relay:gameStarting", onGameStarting);
        socket.on("relay:playerLeft", onPlayerLeft);

        return () => {
            socket.off("relay:roomJoined", onRoomJoined);
            socket.off("relay:teamsUpdated", onTeamsUpdated);
            socket.off("relay:youAreHost", onYouAreHost);
            socket.off("relay:error", onError);
            socket.off("relay:chatUpdate", onChatUpdate);
            socket.off("relay:gameStarting", onGameStarting);
            socket.off("relay:playerLeft", onPlayerLeft);
        };
    }, [roomId, navigate, getPlayerName]);

    const playerName = getPlayerName();

    function handleJoinTeam(color) {
        socket.emit("relay:joinTeam", { team: color });
        setMyTeam(color);
    }

    function handleStartGame() {
        socket.emit("relay:startGame");
    }

    function handleSendChat(e) {
        e.preventDefault();
        if (!chatInput.trim()) return;
        socket.emit("relay:chatMessage", { text: chatInput.trim() });
        setChatInput("");
    }

    function handleLeave() {
        hasJoinedRef.current = false;
        socket.emit("relay:leaveRoom");
        navigate("/team-join");
    }

    const canStart = redTeam.length >= 1 && blueTeam.length >= 1;
    const totalPlayers = redTeam.length + blueTeam.length;

    return (
        <div className="team-lobby-page">
            <div className="team-lobby-container">
                <div className="team-lobby-header">
                    <button className="team-lobby-back" onClick={handleLeave}>← LEAVE</button>
                    <div className="team-lobby-title-group">
                        <h1 className="team-lobby-title">MULTIVERSAL RELAY</h1>
                        <div className="team-lobby-room-code">
                            <span className="room-label">ROOM</span>
                            <span className="room-code">{roomId}</span>
                        </div>
                    </div>
                    <div className="team-lobby-stats">
                        <span className="player-count">👥 {totalPlayers} / 6</span>
                    </div>
                </div>

                <div className="team-selection">
                    {/* RED TEAM */}
                    <div className="team-pane team-red">
                        <div className="team-header">
                            <h2 className="team-name">RED TEAM</h2>
                            <span className="team-count">{redTeam.length}/3</span>
                        </div>
                        <div className="player-list">
                            {redTeam.map((p, i) => (
                                <div key={p.id} className={`player-slot ${p.id === socket.id ? 'me' : ''}`}>
                                    <span className="player-index">{i + 1}</span>
                                    <span className="player-name">{p.name || 'Anonymous'}</span>
                                    {p.isHost && <span className="host-badge">HOST</span>}
                                </div>
                            ))}
                            {[...Array(3 - redTeam.length)].map((_, i) => (
                                <div key={`empty-red-${i}`} className="player-slot empty">
                                    <span className="player-index">{redTeam.length + i + 1}</span>
                                    <span className="player-name">Waiting...</span>
                                </div>
                            ))}
                        </div>
                        <button
                            className={`btn-join-team btn-join-red ${myTeam === 'red' ? 'joined' : ''}`}
                            onClick={() => handleJoinTeam('red')}
                            disabled={myTeam === 'red' || (myTeam !== 'red' && redTeam.length >= 3)}
                        >
                            {myTeam === 'red' ? '✓ JOINED' : redTeam.length >= 3 ? 'FULL' : 'JOIN RED'}
                        </button>
                    </div>

                    {/* VS DIVIDER */}
                    <div className="teams-vs">
                        <div className="vs-circle">VS</div>
                    </div>

                    {/* BLUE TEAM */}
                    <div className="team-pane team-blue">
                        <div className="team-header">
                            <h2 className="team-name">BLUE TEAM</h2>
                            <span className="team-count">{blueTeam.length}/3</span>
                        </div>
                        <div className="player-list">
                            {blueTeam.map((p, i) => (
                                <div key={p.id} className={`player-slot ${p.id === socket.id ? 'me' : ''}`}>
                                    <span className="player-index">{i + 1}</span>
                                    <span className="player-name">{p.name || 'Anonymous'}</span>
                                    {p.isHost && <span className="host-badge">HOST</span>}
                                </div>
                            ))}
                            {[...Array(3 - blueTeam.length)].map((_, i) => (
                                <div key={`empty-blue-${i}`} className="player-slot empty">
                                    <span className="player-index">{blueTeam.length + i + 1}</span>
                                    <span className="player-name">Waiting...</span>
                                </div>
                            ))}
                        </div>
                        <button
                            className={`btn-join-team btn-join-blue ${myTeam === 'blue' ? 'joined' : ''}`}
                            onClick={() => handleJoinTeam('blue')}
                            disabled={myTeam === 'blue' || (myTeam !== 'blue' && blueTeam.length >= 3)}
                        >
                            {myTeam === 'blue' ? '✓ JOINED' : blueTeam.length >= 3 ? 'FULL' : 'JOIN BLUE'}
                        </button>
                    </div>
                </div>

                <div className="lobby-footer">
                    <div className="lobby-chat">
                        <div className="chat-messages">
                            {chatMessages.length === 0 ? (
                                <p className="chat-empty">No messages yet. Say hi!</p>
                            ) : (
                                chatMessages.map((m, i) => (
                                    <div key={i} className="chat-line">
                                        <span className="chat-sender">{m.sender}:</span>
                                        <span className="chat-text">{m.text}</span>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>
                        <form className="chat-input-area" onSubmit={handleSendChat}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                            />
                            <button type="submit">SEND</button>
                        </form>
                    </div>

                    <div className="lobby-controls">
                        {error && <div className="lobby-error">{error}</div>}

                        {!isHost ? (
                            <div className="host-waiting">
                                <span className="spinner">⏳</span>
                                <p>Waiting for host to start...</p>
                            </div>
                        ) : (
                            <div className="host-actions">
                                {!canStart ? (
                                    <p className="start-hint">Need at least 1 player per team to start</p>
                                ) : (
                                    <p className="start-ready">Ready to race!</p>
                                )}
                                <button
                                    className="btn-start-game"
                                    onClick={handleStartGame}
                                    disabled={!canStart}
                                >
                                    🚀 START RELAY RACE
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
