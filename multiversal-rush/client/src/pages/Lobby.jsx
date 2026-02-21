// ============================================================
//  pages/Lobby.jsx — Waiting Room
//  Member 2 (Multiplayer)
//
//  Features:
//   • Text input to pick a room ID
//   • Join / create a room via socket
//   • Show connected players + their ready status
//   • Ready button
//   • Waiting-room text chat
//   • Countdown display before game starts
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import { getFriendSocket } from "../socket/friendSocket";
import useStore from "../store/store";
import Voice from "../voice/Voice";
import "./Lobby.css";

export default function Lobby() {
    const navigate = useNavigate();

    // ---- Zustand state ----
    const playerName = useStore((s) => s.playerName);
    const logout = useStore((s) => s.logout);
    const setPlayerName = useStore((s) => s.setPlayerName);
    const setPlayerId = useStore((s) => s.setPlayerId);
    const roomId = useStore((s) => s.roomId);
    const setRoomId = useStore((s) => s.setRoomId);
    const setPlayers = useStore((s) => s.setPlayers);
    const setGameState = useStore((s) => s.setGameState);
    const setStartTime = useStore((s) => s.setStartTime);
    const setChatMessages = useStore((s) => s.setChatMessages);
    const addChatMessage = useStore((s) => s.addChatMessage);

    const players = useStore((s) => s.players);
    const chatMessages = useStore((s) => s.chatMessages);
    const gameState = useStore((s) => s.gameState);

    // ---- Local UI state ----
    const [inputRoom, setInputRoom] = useState("");
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(null);
    const [chatInput, setChatInput] = useState("");
    const [isReady, setIsReady] = useState(false);
    // followMap: playerName → "idle" | "sending" | "sent"
    const [followMap, setFollowMap] = useState({});
    // incoming friend-request toasts: [{ fromUserId, fromUsername, id }]
    const [frToasts, setFrToasts] = useState([]);
    // accepted toasts: [{ friendUsername, id }]
    const [acceptedToasts, setAcceptedToasts] = useState([]);

    const chatEndRef = useRef(null);
    const fsRef = useRef(null);   // friend socket ref

    // ---- Load username from localStorage on mount ----
    useEffect(() => {
        const storedUser = localStorage.getItem("mr_user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.username && !playerName) {
                    setPlayerName(user.username);
                }
            } catch (err) {
                console.error("Failed to parse stored user:", err);
            }
        }
    }, [playerName, setPlayerName]);

    // ---- Auto-scroll chat ----
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // ---- Friend socket: real-time request notifications ----
    useEffect(() => {
        const fs = getFriendSocket();
        if (!fs) return;
        fsRef.current = fs;

        // Someone sent ME a friend request
        fs.on("friend:requestReceived", ({ fromUserId, fromUsername }) => {
            const toastId = `fr-${Date.now()}`;
            setFrToasts(prev => [...prev, { fromUserId, fromUsername, id: toastId }]);
            // Auto-dismiss after 15s
            setTimeout(() => setFrToasts(prev => prev.filter(t => t.id !== toastId)), 15000);
        });

        // MY request was accepted (or I accepted someone) — confirmation
        fs.on("friend:accepted", ({ friendUsername }) => {
            const toastId = `acc-${Date.now()}`;
            setAcceptedToasts(prev => [...prev, { friendUsername, id: toastId }]);
            setTimeout(() => setAcceptedToasts(prev => prev.filter(t => t.id !== toastId)), 5000);
        });

        // Server ack for MY outgoing request
        fs.on("friend:requestSent", ({ toUsername, status }) => {
            setFollowMap(prev => ({ ...prev, [toUsername]: "sent" }));
        });

        fs.on("friend:requestError", ({ error }) => {
            console.warn("[FriendSocket] request error:", error);
            // Reset button so user can retry
            setFollowMap(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(k => { if (next[k] === "sending") next[k] = "idle"; });
                return next;
            });
        });

        return () => {
            fs.off("friend:requestReceived");
            fs.off("friend:accepted");
            fs.off("friend:requestSent");
            fs.off("friend:requestError");
        };
    }, []);

    // ---- Socket setup ----
    useEffect(() => {
        // Connect socket when entering lobby
        if (!socket.connected) socket.connect();

        // ---- Incoming events ----

        // Successfully joined room
        socket.on("roomJoined", ({ roomId, playerId, players, chatHistory }) => {
            console.log('[Lobby] roomJoined:', { roomId, playerId, players });
            setPlayerId(playerId);
            setRoomId(roomId);
            setPlayers(players);
            setChatMessages(chatHistory || []);
            setJoined(true);
            setError("");
        });

        // Room was full or error
        socket.on("roomFull", ({ message }) => {
            console.log('[Lobby] roomFull:', message);
            setError(message);
        });
        socket.on("roomError", ({ message }) => {
            console.log('[Lobby] roomError:', message);
            setError(message);
        });

        // Another player joined
        socket.on("playerJoined", ({ players }) => {
            console.log('[Lobby] playerJoined, total players:', players.length);
            setPlayers(players);
        });

        // A player's ready state changed
        socket.on("playersUpdated", ({ players }) => setPlayers(players));

        // A player left
        socket.on("playerLeft", ({ players }) => setPlayers(players));

        // Countdown started
        socket.on("countdownStarted", ({ seconds }) => {
            setGameState("countdown");
            setCountdown(seconds);
            // Decrement every second
            let remaining = seconds;
            const interval = setInterval(() => {
                remaining -= 1;
                setCountdown(remaining);
                if (remaining <= 0) clearInterval(interval);
            }, 1000);
        });

        // Countdown cancelled (someone left)
        socket.on("countdownCancelled", ({ reason }) => {
            setGameState("waiting");
            setCountdown(null);
            setError(`Countdown cancelled: ${reason}`);
        });

        // Game started → navigate to Game page
        socket.on("gameStarted", ({ startTime, players }) => {
            setGameState("playing");
            setStartTime(startTime);
            setPlayers(players);
            navigate("/game");
        });

        // Chat message received
        socket.on("chatUpdate", ({ message }) => addChatMessage(message));

        return () => {
            socket.off("roomJoined");
            socket.off("roomFull");
            socket.off("roomError");
            socket.off("playerJoined");
            socket.off("playersUpdated");
            socket.off("playerLeft");
            socket.off("countdownStarted");
            socket.off("countdownCancelled");
            socket.off("gameStarted");
            socket.off("chatUpdate");
        };
    }, []);

    // ---- Handlers ----

    function generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function handleCreateRoom() {
        if (!playerName) { setError("Go back and set your name first"); return; }
        const newRoomCode = generateRoomCode();
        setInputRoom(newRoomCode);
        setError("");
        socket.emit("joinRoom", {
            roomId: newRoomCode,
            playerName,
        });
        // Remove focus from the input so WASD doesn't type into it
        if (document.activeElement) document.activeElement.blur();
    }

    function handleJoinRoom() {
        if (!inputRoom.trim()) { setError("Enter a room code"); return; }
        if (!playerName) { setError("Go back and set your name first"); return; }
        setError("");
        console.log('[Lobby] Joining room:', inputRoom.trim().toUpperCase(), 'as', playerName);
        socket.emit("joinRoom", {
            roomId: inputRoom.trim().toUpperCase(),
            playerName,
        });
        // Remove focus from the input so WASD doesn't type into it
        if (document.activeElement) document.activeElement.blur();
    }

    function handleReady() {
        socket.emit("playerReady");
        setIsReady((prev) => !prev);
    }

    function handleSendChat(e) {
        e.preventDefault();
        if (!chatInput.trim()) return;
        socket.emit("chatMessage", { text: chatInput.trim() });
        setChatInput("");
    }

    function handleLogout() {
        if (socket.connected) socket.disconnect();
        logout();
        navigate("/");
    }

    // ---- Send friend request — pure REST, no socket dependency ----
    const handleFollow = useCallback(async (targetName) => {
        setFollowMap(prev => ({ ...prev, [targetName]: "sending" }));
        try {
            const token = localStorage.getItem("mr_token");
            const res = await fetch(
                `${import.meta.env.VITE_SERVER_URL || "http://localhost:5000"}/api/friends/request`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ toUsername: targetName }),
                }
            );
            const data = await res.json();

            if (res.ok) {
                // "sent" covers both normal request AND auto-accepted cross-request
                setFollowMap(prev => ({ ...prev, [targetName]: "sent" }));
            } else if (data.error === "Already friends" || data.error === "Request already sent") {
                // Treat as success — button should still show ✓
                setFollowMap(prev => ({ ...prev, [targetName]: "sent" }));
            } else {
                console.warn("[handleFollow] server error:", data.error);
                setFollowMap(prev => ({ ...prev, [targetName]: "idle" }));
                // Show brief inline error instead of blocking alert
                setError(`Add friend failed: ${data.error}`);
                setTimeout(() => setError(""), 4000);
            }
        } catch (err) {
            console.error("[handleFollow] fetch error:", err);
            setFollowMap(prev => ({ ...prev, [targetName]: "idle" }));
        }
    }, []);

    // ---- Accept incoming friend request — pure REST ----
    const handleAcceptRequest = useCallback(async (fromUserId, toastId) => {
        setFrToasts(prev => prev.filter(t => t.id !== toastId));
        try {
            const token = localStorage.getItem("mr_token");
            await fetch(
                `${import.meta.env.VITE_SERVER_URL || "http://localhost:5000"}/api/friends/respond`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ fromUserId, action: "accept" }),
                }
            );
        } catch (err) {
            console.error("[handleAcceptRequest] error:", err);
        }
    }, []);

    // ---- Decline incoming friend request — pure REST ----
    const handleDeclineRequest = useCallback(async (fromUserId, toastId) => {
        setFrToasts(prev => prev.filter(t => t.id !== toastId));
        try {
            const token = localStorage.getItem("mr_token");
            await fetch(
                `${import.meta.env.VITE_SERVER_URL || "http://localhost:5000"}/api/friends/respond`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ fromUserId, action: "decline" }),
                }
            );
        } catch (err) {
            console.error("[handleDeclineRequest] error:", err);
        }
    }, []);

    // ---- Render ----
    const playerList = Object.values(players);

    return (
        <div className="lobby-page">
            <div className="lobby-bg-anim" />

            {/* ── Friend-request toasts (incoming) ── */}
            <div className="fr-toast-stack">
                {frToasts.map(t => (
                    <div key={t.id} className="fr-toast">
                        <div className="fr-toast-icon">👤</div>
                        <div className="fr-toast-body">
                            <p><strong>{t.fromUsername}</strong> sent you a friend request!</p>
                        </div>
                        <div className="fr-toast-actions">
                            <button
                                className="fr-btn-accept"
                                onClick={() => handleAcceptRequest(t.fromUserId, t.id)}
                            >✓ Accept</button>
                            <button
                                className="fr-btn-decline"
                                onClick={() => handleDeclineRequest(t.fromUserId, t.id)}
                            >✗</button>
                        </div>
                    </div>
                ))}
                {acceptedToasts.map(t => (
                    <div key={t.id} className="fr-toast fr-toast--accepted">
                        <div className="fr-toast-icon">🤝</div>
                        <div className="fr-toast-body">
                            <p>You and <strong>{t.friendUsername}</strong> are now friends!</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="lobby-container">
                {/* ---- Header ---- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h1 className="lobby-title">
                            🌌 <span>Multiversal Rush</span>
                        </h1>
                        <p className="lobby-subtitle">Waiting Room</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: 'rgba(255,77,109,0.2)',
                            border: '1px solid rgba(255,77,109,0.5)',
                            color: '#ff4d6d',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.background = 'rgba(255,77,109,0.3)'}
                        onMouseOut={(e) => e.target.style.background = 'rgba(255,77,109,0.2)'}
                    >
                        Logout
                    </button>
                </div>

                {/* ---- Join Panel ---- */}
                {!joined ? (
                    <div className="join-panel">
                        <p className="panel-label">Welcome, <strong>{playerName || "Stranger"}</strong></p>
                        <div className="join-row">
                            <input
                                className="room-input"
                                placeholder="Room code (e.g. RUSH1)"
                                value={inputRoom}
                                onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                                maxLength={10}
                                id="room-code-input"
                            />
                            <button className="btn-join" onClick={handleJoinRoom} id="btn-join-room">
                                Join Room
                            </button>
                        </div>
                        <div style={{ marginTop: '10px', textAlign: 'center' }}>
                            <span style={{ color: '#888', fontSize: '0.9rem' }}>or</span>
                        </div>
                        <button
                            className="btn-join"
                            onClick={handleCreateRoom}
                            id="btn-create-room"
                            style={{ width: '100%', marginTop: '10px', background: 'rgba(0,255,200,0.15)' }}
                        >
                            Create New Room
                        </button>
                        {error && <p className="lobby-error">{error}</p>}
                    </div>
                ) : (
                    /* ---- In-Room Panel ---- */
                    <div className="room-panel">

                        {/* Countdown overlay */}
                        {countdown !== null && countdown > 0 && (
                            <div className="countdown-overlay">
                                <span>{countdown}</span>
                            </div>
                        )}
                        {countdown === 0 && (
                            <div className="countdown-overlay go">GO!</div>
                        )}

                        <div className="room-layout">

                            {/* === Room ID Display === */}
                            <div style={{
                                background: 'rgba(0,255,200,0.1)',
                                border: '2px solid rgba(0,255,200,0.3)',
                                borderRadius: '12px',
                                padding: '15px',
                                marginBottom: '20px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '5px' }}>
                                    Room Code
                                </div>
                                <div style={{
                                    fontSize: '1.8rem',
                                    fontWeight: 'bold',
                                    color: '#00ffe0',
                                    letterSpacing: '0.3em',
                                    fontFamily: 'monospace'
                                }}>
                                    {roomId || inputRoom}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '5px' }}>
                                    Share this code with friends to join
                                </div>
                            </div>

                            {/* === Players sidebar === */}
                            <div className="players-sidebar">
                                <h2 className="sidebar-title">Players ({playerList.length}/5)</h2>
                                <ul className="player-list">
                                    {playerList.map((p) => {
                                        const isSelf = p.id === socket.id;
                                        const fState = followMap[p.name] || "idle";
                                        return (
                                            <li key={p.id} className={`player-item ${isSelf ? "self" : ""}`}>
                                                <span className="player-avatar">
                                                    {p.name.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="player-name">
                                                    {p.name}
                                                    {isSelf && " (you)"}
                                                </span>
                                                <span className={`ready-badge ${p.ready ? "ready" : "not-ready"}`}>
                                                    {p.ready ? "✓ Ready" : "Waiting"}
                                                </span>
                                                {/* ➕ Follow button — only for other players */}
                                                {!isSelf && (
                                                    <button
                                                        className="btn-follow-lobby"
                                                        onClick={() => handleFollow(p.name)}
                                                        disabled={fState !== "idle"}
                                                        title={fState === "sent" ? "Request sent!" : `Add ${p.name} as friend`}
                                                    >
                                                        {fState === "sending" ? "…" :
                                                            fState === "sent" ? "✓" : "👤"}
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <button
                                    id="btn-ready"
                                    className={`btn-ready ${isReady ? "active" : ""}`}
                                    onClick={handleReady}
                                    disabled={gameState === "countdown"}
                                >
                                    {isReady ? "✅ Ready!" : "Click to Ready"}
                                </button>

                                {error && <p className="lobby-error">{error}</p>}

                                <p className="start-hint">
                                    {gameState === "countdown"
                                        ? "🚀 Starting…"
                                        : "Need 2+ players all ready to start"}
                                </p>

                                {/* === Voice Chat (archit2 Task 4) === */}
                                <Voice name={playerName} room={inputRoom || "lobby"} />
                            </div>

                            {/* === Chat panel === */}
                            <div className="chat-panel">
                                <h2 className="sidebar-title">💬 Room Chat</h2>

                                <div className="chat-messages" id="chat-messages">
                                    {chatMessages.length === 0 && (
                                        <p className="chat-empty">No messages yet. Say hi! 👋</p>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`chat-msg ${msg.senderId === socket.id ? "mine" : "theirs"}`}
                                        >
                                            <span className="chat-sender">{msg.sender}</span>
                                            <span className="chat-text">{msg.text}</span>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <form className="chat-form" onSubmit={handleSendChat} id="chat-form">
                                    <input
                                        id="chat-input"
                                        className="chat-input"
                                        placeholder="Type a message…"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        maxLength={300}
                                    />
                                    <button type="submit" className="btn-send" id="btn-send-chat">
                                        Send
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
