// ============================================================
//  pages/Lobby.jsx — Waiting Room (v3)
//  Features:
//   • Join / create room + invite friends from friend list
//   • Player list with friend-status-aware follow buttons 
//     (shows ✓ if already friends on mount — no re-add needed)
//   • Ready button → server flow → 3D lobby → random map
//   • Scrollable chat with auto-scroll
//   • FR toasts bottom-right (incoming request + accepted)
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import { getFriendSocket } from "../socket/friendSocket";
import useStore from "../store/store";
import Voice from "../voice/Voice";
import "./Lobby.css";

const API = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function authHeaders() {
    const token = localStorage.getItem("mr_token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

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
    const avatar = useStore((s) => s.avatar);
    const setAvatar = useStore((s) => s.setAvatar);
    const players = useStore((s) => s.players);
    const chatMessages = useStore((s) => s.chatMessages);
    const gameState = useStore((s) => s.gameState);

    // ---- Local UI state ----
    const [inputRoom, setInputRoom] = useState("");
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState("");
    const [chatInput, setChatInput] = useState("");
    const [isReady, setIsReady] = useState(false);

    // friendMap: username → "idle" | "friends" | "sending" | "sent"
    const [friendMap, setFriendMap] = useState({});

    // friend list for invite panel: [{ _id, username }]
    const [friendList, setFriendList] = useState([]);

    // invite status: username → "idle"|"sending"|"sent"
    const [inviteMap, setInviteMap] = useState({});

    // FR toasts
    const [frToasts, setFrToasts] = useState([]);
    const [acceptedToasts, setAcceptedToasts] = useState([]);

    // Room invite notification (someone invited ME)
    const [roomInvites, setRoomInvites] = useState([]); // [{ fromName, roomCode, id }]

    const chatEndRef = useRef(null);

    // ---- Load username from localStorage ----
    useEffect(() => {
        const storedUser = localStorage.getItem("mr_user");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.username && !playerName) setPlayerName(user.username);
            } catch { /* ignore */ }
        }
    }, [playerName, setPlayerName]);

    // ---- Pre-fetch my friend list so we know who's already a friend ----
    useEffect(() => {
        async function fetchFriends() {
            try {
                const res = await fetch(`${API}/api/friends`, { headers: authHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                const friends = data.friends || [];
                setFriendList(friends);
                // Pre-mark everyone already a friend as "friends"
                // Normalize keys to lowercase to avoid casing mismatches
                const initial = {};
                friends.forEach(f => {
                    if (f.username) initial[f.username.toLowerCase()] = "friends";
                });
                setFriendMap(prev => ({ ...initial, ...prev }));
            } catch { /* no auth / offline */ }
        }
        fetchFriends();
    }, []);

    // ---- Auto-scroll chat ----
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // ---- Friend socket: real-time request notifications ----
    useEffect(() => {
        const fs = getFriendSocket?.();
        if (!fs) return;

        fs.on("friend:requestReceived", ({ fromUserId, fromUsername }) => {
            const id = `fr-${Date.now()}`;
            setFrToasts(prev => [...prev, { fromUserId, fromUsername, id }]);
            setTimeout(() => setFrToasts(prev => prev.filter(t => t.id !== id)), 15000);
        });

        fs.on("friend:accepted", ({ friendUsername }) => {
            const id = `acc-${Date.now()}`;
            setAcceptedToasts(prev => [...prev, { friendUsername, id }]);
            setTimeout(() => setAcceptedToasts(prev => prev.filter(t => t.id !== id)), 5000);
            // Update map so button shows ✓ friends (normalized key)
            if (friendUsername) {
                setFriendMap(prev => ({ ...prev, [friendUsername.toLowerCase()]: "friends" }));
            }
        });

        fs.on("friend:requestSent", ({ toUsername }) => {
            if (toUsername) {
                setFriendMap(prev => ({ ...prev, [toUsername.toLowerCase()]: "sent" }));
            }
        });

        fs.on("friend:requestError", () => {
            setFriendMap(prev => {
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
        if (!socket.connected) socket.connect();

        socket.on("roomJoined", ({ roomId, playerId, players, chatHistory }) => {
            setPlayerId(playerId);
            setRoomId(roomId);
            setPlayers(players);
            setChatMessages(chatHistory || []);
            setJoined(true);
            setError("");
        });

        socket.on("roomFull", ({ message }) => setError(message));
        socket.on("roomError", ({ message }) => setError(message));
        socket.on("playerJoined", ({ players }) => setPlayers(players));
        socket.on("playersUpdated", ({ players }) => setPlayers(players));
        socket.on("playerLeft", ({ players }) => setPlayers(players));

        socket.on("countdownCancelled", ({ reason }) => {
            setGameState("waiting");
            setIsReady(false);
            setError(`Cancelled: ${reason}`);
        });

        // ── All ready → go to 3D lobby ──
        socket.on("allReadyMoveToLobby", () => {
            console.log("[Lobby] allReadyMoveToLobby → /game");
            setGameState("lobby");
            navigate("/game");
        });

        // ── Someone invited me to a room ──
        socket.on("roomInvite", ({ fromName, roomCode }) => {
            const id = `inv-${Date.now()}`;
            setRoomInvites(prev => [...prev, { fromName, roomCode, id }]);
            setTimeout(() => setRoomInvites(prev => prev.filter(t => t.id !== id)), 30000);
        });

        socket.on("chatUpdate", ({ message }) => addChatMessage(message));

        return () => {
            socket.off("roomJoined");
            socket.off("roomFull");
            socket.off("roomError");
            socket.off("playerJoined");
            socket.off("playersUpdated");
            socket.off("playerLeft");
            socket.off("countdownCancelled");
            socket.off("allReadyMoveToLobby");
            socket.off("roomInvite");
            socket.off("chatUpdate");
        };
    }, []);

    // ---- Handlers ----
    function generateRoomCode() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    function handleCreateRoom() {
        if (!playerName) { setError("Set your name first"); return; }
        const code = generateRoomCode();
        setInputRoom(code);
        setError("");
        socket.emit("joinRoom", { roomId: code, playerName });
        document.activeElement?.blur();
    }

    function handleJoinRoom() {
        if (!inputRoom.trim()) { setError("Enter a room code"); return; }
        if (!playerName) { setError("Set your name first"); return; }
        setError("");
        socket.emit("joinRoom", { roomId: inputRoom.trim().toUpperCase(), playerName });
        document.activeElement?.blur();
    }

    function handleReady() {
        socket.emit("playerReady");
        setIsReady(prev => !prev);
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

    // ── Send friend request ──
    const handleFollow = useCallback(async (targetName) => {
        if (!targetName) return;
        const lowerName = targetName.toLowerCase();
        setFriendMap(prev => ({ ...prev, [lowerName]: "sending" }));
        try {
            const res = await fetch(`${API}/api/friends/request`, {
                method: "POST", headers: authHeaders(),
                body: JSON.stringify({ toUsername: targetName }),
            });
            const data = await res.json();
            if (res.ok || data.error === "Already friends" || data.error === "Request already sent") {
                setFriendMap(prev => ({ ...prev, [lowerName]: "sent" }));
            } else {
                setFriendMap(prev => ({ ...prev, [lowerName]: "idle" }));
                setError(`Add friend failed: ${data.error}`);
                setTimeout(() => setError(""), 4000);
            }
        } catch {
            setFriendMap(prev => ({ ...prev, [lowerName]: "idle" }));
        }
    }, []);

    // ── Accept FR toast ──
    const handleAcceptRequest = useCallback(async (fromUserId, toastId) => {
        setFrToasts(prev => prev.filter(t => t.id !== toastId));
        try {
            await fetch(`${API}/api/friends/respond`, {
                method: "POST", headers: authHeaders(),
                body: JSON.stringify({ fromUserId, action: "accept" }),
            });
        } catch { /* ignore */ }
    }, []);

    // ── Decline FR toast ──
    const handleDeclineRequest = useCallback(async (fromUserId, toastId) => {
        setFrToasts(prev => prev.filter(t => t.id !== toastId));
        try {
            await fetch(`${API}/api/friends/respond`, {
                method: "POST", headers: authHeaders(),
                body: JSON.stringify({ fromUserId, action: "decline" }),
            });
        } catch { /* ignore */ }
    }, []);

    // ── Invite a friend to the current room ──
    const handleInviteFriend = useCallback((friendUsername) => {
        if (!roomId && !inputRoom) return;
        const code = roomId || inputRoom;
        setInviteMap(prev => ({ ...prev, [friendUsername]: "sending" }));
        // Emit invite via socket so server can forward to that player's socket
        socket.emit("sendRoomInvite", { toUsername: friendUsername, roomCode: code });
        setInviteMap(prev => ({ ...prev, [friendUsername]: "sent" }));
        setTimeout(() => setInviteMap(prev => ({ ...prev, [friendUsername]: "idle" })), 8000);
    }, [roomId, inputRoom]);

    // ── Accept room invite toast ──
    const handleJoinViaInvite = useCallback((roomCode, toastId) => {
        setRoomInvites(prev => prev.filter(t => t.id !== toastId));
        setInputRoom(roomCode);
        socket.emit("joinRoom", { roomId: roomCode, playerName });
    }, [playerName]);

    // ---- Render ----
    const playerList = Object.values(players);
    const currentCode = roomId || inputRoom;

    return (
        <div className="lobby-page">
            <div className="lobby-bg-anim" />

            {/* ── Toasts: bottom-right stack ── */}
            <div className="fr-toast-stack">
                {/* Incoming FR */}
                {frToasts.map(t => (
                    <div key={t.id} className="fr-toast">
                        <div className="fr-toast-icon">👤</div>
                        <div className="fr-toast-body">
                            <p><strong>{t.fromUsername}</strong> sent you a friend request!</p>
                        </div>
                        <div className="fr-toast-actions">
                            <button className="fr-btn-accept" onClick={() => handleAcceptRequest(t.fromUserId, t.id)}>✓ Accept</button>
                            <button className="fr-btn-decline" onClick={() => handleDeclineRequest(t.fromUserId, t.id)}>✗</button>
                        </div>
                    </div>
                ))}

                {/* Accepted */}
                {acceptedToasts.map(t => (
                    <div key={t.id} className="fr-toast fr-toast--accepted">
                        <div className="fr-toast-icon">🤝</div>
                        <div className="fr-toast-body">
                            <p>You and <strong>{t.friendUsername}</strong> are now friends!</p>
                        </div>
                    </div>
                ))}

                {/* Room invites */}
                {roomInvites.map(t => (
                    <div key={t.id} className="fr-toast fr-toast--invite">
                        <div className="fr-toast-icon">🎮</div>
                        <div className="fr-toast-body">
                            <p><strong>{t.fromName}</strong> invited you to room <strong>{t.roomCode}</strong></p>
                        </div>
                        <div className="fr-toast-actions">
                            <button className="fr-btn-accept" onClick={() => handleJoinViaInvite(t.roomCode, t.id)}>Join</button>
                            <button className="fr-btn-decline" onClick={() => setRoomInvites(prev => prev.filter(i => i.id !== t.id))}>✗</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="lobby-container">
                {/* ---- Header ---- */}
                <div className="lobby-header">
                    <div>
                        <h1 className="lobby-title">🌌 Multiversal Rush</h1>
                        <p className="lobby-subtitle">Waiting Room</p>
                    </div>
                    <button className="btn-logout" onClick={handleLogout}>Logout</button>
                </div>

                {/* ---- Avatar Picker ---- */}
                <div className="avatar-picker">
                    <p className="avatar-label">🎭 Choose your avatar</p>
                    <div className="avatar-row">
                        {[
                            { label: "🐧 Penguin", path: "/models/penguin/scene.gltf" },
                            { label: "🐼 Red Panda", path: "/models/red-panda/scene.gltf" },
                        ].map(({ label, path }) => (
                            <button
                                key={path}
                                className={`btn-avatar ${avatar === path ? "selected" : ""}`}
                                onClick={() => setAvatar(path)}
                            >{label}</button>
                        ))}
                    </div>
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
                            <button className="btn-join" onClick={handleJoinRoom} id="btn-join-room">Join</button>
                        </div>
                        <button className="btn-join btn-create" onClick={handleCreateRoom} id="btn-create-room">
                            + Create New Room
                        </button>
                        {error && <p className="lobby-error">{error}</p>}
                    </div>
                ) : (
                    /* ---- In-Room Panel ---- */
                    <div className="room-panel">
                        <div className="room-layout">

                            {/* === LEFT COLUMN === */}
                            <div className="left-col">

                                {/* Room Code */}
                                <div className="room-code-box">
                                    <div className="room-code-label">Room Code</div>
                                    <div className="room-code-value">{currentCode}</div>
                                    <button
                                        className="btn-copy"
                                        onClick={() => navigator.clipboard.writeText(currentCode)}
                                        title="Copy room code"
                                    >📋 Copy</button>
                                    <div className="room-code-hint">Share with friends to join</div>
                                </div>

                                {/* Players */}
                                <div className="players-sidebar">
                                    <h2 className="sidebar-title">Players ({playerList.length}/5)</h2>
                                    <ul className="player-list">
                                        {playerList.map((p) => {
                                            const isSelf = p.id === socket.id;
                                            const lowerName = p.name ? p.name.toLowerCase() : "";
                                            const fState = friendMap[lowerName] || "idle";
                                            const isFriend = fState === "friends";
                                            return (
                                                <li key={p.id} className={`player-item ${isSelf ? "self" : ""}`}>
                                                    <span className="player-avatar">{p.name ? p.name.charAt(0).toUpperCase() : "?"}</span>
                                                    <span className="player-name">
                                                        {p.name}{isSelf && " (you)"}
                                                    </span>
                                                    <span className={`ready-badge ${p.ready ? "ready" : "not-ready"}`}>
                                                        {p.ready ? "✓ Ready" : "Waiting"}
                                                    </span>
                                                    {!isSelf && (
                                                        <button
                                                            className={`btn-follow-lobby ${isFriend ? "is-friend" : fState === "sent" ? "is-sent" : ""}`}
                                                            onClick={() => !isFriend && fState === "idle" && handleFollow(p.name)}
                                                            disabled={isFriend || fState !== "idle"}
                                                            title={isFriend ? "✓ Friends" : fState === "sent" ? "Request sent!" : `Add ${p.name}`}
                                                        >
                                                            {isFriend ? "🤝" : fState === "sending" ? "…" : fState === "sent" ? "✓" : "👤+"}
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
                                    >
                                        {isReady ? "✅ Ready!" : "Click to Ready"}
                                    </button>

                                    {error && <p className="lobby-error">{error}</p>}

                                    <p className="start-hint">
                                        All players must be ready to start
                                    </p>

                                    <Voice name={playerName} room={inputRoom || "lobby"} />
                                </div>

                                {/* Invite Friends Panel */}
                                {friendList.length > 0 && (
                                    <div className="invite-panel">
                                        <h2 className="sidebar-title">👥 Invite Friends</h2>
                                        <ul className="friend-invite-list">
                                            {friendList.map(f => {
                                                const iStatus = inviteMap[f.username] || "idle";
                                                return (
                                                    <li key={f._id} className="friend-invite-item">
                                                        <span className="player-avatar">{f.username.charAt(0).toUpperCase()}</span>
                                                        <span className="player-name">{f.username}</span>
                                                        <button
                                                            className={`btn-invite ${iStatus === "sent" ? "invited" : ""}`}
                                                            onClick={() => handleInviteFriend(f.username)}
                                                            disabled={iStatus === "sending" || iStatus === "sent"}
                                                        >
                                                            {iStatus === "sent" ? "✓ Invited" : iStatus === "sending" ? "…" : "Invite"}
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* === RIGHT COLUMN — Chat === */}
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
                                    <button type="submit" className="btn-send" id="btn-send-chat">Send</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
