// ============================================================
//  pages/Friends.jsx — Friends list + real-time DMs
//
//  DM transport: Main game socket (socket/socket.js)
//    Events emitted : dm:register, dm:join, dm:send
//    Events received: dm:receive, dm:error
//
//  Presence + room-invites: /friends namespace (friendSocket.js)
//    gracefully skipped if auth fails — non-blocking
//
//  Chat history : REST GET /api/friends/:friendId/messages
//  Friend actions: REST POST /api/friends/request|respond
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";          // main game socket — always connected
import { getFriendSocket } from "../socket/friendSocket"; // optional namespace for presence
import useStore from "../store/store";
import "./Friends.css";

const API = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem("mr_token")}`,
        "Content-Type": "application/json",
    };
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

export default function Friends() {
    const navigate = useNavigate();
    const user = useStore(s => s.user);                        // { id, username, ... }
    const myId = user?.id?.toString() || null;               // MongoDB _id string
    const myName = user?.username || "";
    const roomId = useStore(s => s.roomId);

    // ── friend + pending data ──────────────────────────────
    const [friends, setFriends] = useState([]);
    const [pending, setPending] = useState([]);

    // ── presence (best-effort via /friends namespace) ──────
    const [onlineSet, setOnlineSet] = useState(new Set());

    // ── search ─────────────────────────────────────────────
    const [searchQ, setSearchQ] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [sentRequests, setSentRequests] = useState(new Set());

    // ── DM chat ────────────────────────────────────────────
    const [activeFriend, setActiveFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [unreadMap, setUnreadMap] = useState({});   // friendId → count
    const chatEndRef = useRef(null);

    // ── room-invite toast ──────────────────────────────────
    const [inviteToast, setInviteToast] = useState(null);

    const fsRef = useRef(null);  // optional /friends namespace ref

    // ──────────────────────────────────────────────────────
    //  1. Register with main socket for DMs
    //     Do this once on mount (myId comes from Zustand).
    // ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!myId) return;

        // Ensure main socket is connected
        if (!socket.connected) socket.connect();

        // Tell server our DB userId so it can route incoming DMs to us
        socket.emit("dm:register", { userId: myId });

        // Listen for incoming DMs on the main socket
        socket.on("dm:receive", (msg) => {
            setMessages(prev => {
                // Deduplicate (server echoes back to both parties)
                if (prev.some(m => m._id && m._id === msg._id)) return prev;
                return [...prev, msg];
            });
            // If the message is FROM someone other than the active chat, badge it
            if (msg.sender !== myId) {
                setUnreadMap(prev => ({
                    ...prev,
                    [msg.sender]: (prev[msg.sender] || 0) + 1,
                }));
            }
        });

        socket.on("dm:error", ({ error }) => {
            console.error("[DM] error:", error);
            alert(`DM error: ${error}`);
        });

        return () => {
            socket.off("dm:receive");
            socket.off("dm:error");
        };
    }, [myId]);

    // ──────────────────────────────────────────────────────
    //  2. Load friends + pending from REST on mount
    // ──────────────────────────────────────────────────────
    const loadFriends = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/friends`, { headers: authHeaders() });
            const data = await res.json();
            setFriends(data.friends || []);
            setPending(data.pending || []);
        } catch (err) {
            console.error("[Friends] loadFriends error", err);
        }
    }, []);

    useEffect(() => { loadFriends(); }, [loadFriends]);

    // ──────────────────────────────────────────────────────
    //  3. Best-effort presence via /friends namespace
    //     If this socket auth fails, we just skip online dots —
    //     DMs still work through the main socket above.
    // ──────────────────────────────────────────────────────
    useEffect(() => {
        const fs = getFriendSocket();
        if (!fs) return;
        fsRef.current = fs;

        fs.on("friendsOnlineStatus", ({ online }) => setOnlineSet(new Set(online)));
        fs.on("friendOnline", ({ userId }) => setOnlineSet(prev => new Set([...prev, userId])));
        fs.on("friendOffline", ({ userId }) => setOnlineSet(prev => { const n = new Set(prev); n.delete(userId); return n; }));
        fs.on("friend:inviteReceived", ({ fromUsername, roomId: invRoomId }) => {
            setInviteToast({ fromUsername, roomId: invRoomId });
        });

        return () => {
            fs.off("friendsOnlineStatus");
            fs.off("friendOnline");
            fs.off("friendOffline");
            fs.off("friend:inviteReceived");
        };
    }, []);

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ──────────────────────────────────────────────────────
    //  4. Open chat with a friend
    //     • Clear unread badge
    //     • Load history via REST
    //     • Emit dm:join so main socket enters the private room
    // ──────────────────────────────────────────────────────
    const openChat = useCallback(async (friend) => {
        setActiveFriend(friend);
        setMessages([]);
        setLoadingMsgs(true);

        // Clear unread badge for this friend
        setUnreadMap(prev => { const n = { ...prev }; delete n[friend._id]; return n; });

        // Join the deterministic private socket room (same sort both sides)
        if (myId) socket.emit("dm:join", { myId, friendId: friend._id });

        // Load history from DB
        try {
            const res = await fetch(`${API}/api/friends/${friend._id}/messages`, { headers: authHeaders() });
            const data = await res.json();
            setMessages(data.messages || []);
        } catch (err) {
            console.error("[Friends] loadMessages error", err);
        } finally {
            setLoadingMsgs(false);
        }
    }, [myId]);

    // ──────────────────────────────────────────────────────
    //  5. Send a DM via main socket
    // ──────────────────────────────────────────────────────
    const sendDM = useCallback((e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text || !activeFriend || !myId) return;

        socket.emit("dm:send", {
            myId,
            friendId: activeFriend._id,
            text,
        });
        setChatInput("");
    }, [chatInput, activeFriend, myId]);

    // ──────────────────────────────────────────────────────
    //  6. Search + add friend
    // ──────────────────────────────────────────────────────
    const handleSearch = useCallback(async () => {
        if (searchQ.trim().length < 2) return;
        setSearchLoading(true);
        try {
            const res = await fetch(`${API}/api/friends/search?q=${encodeURIComponent(searchQ)}`, { headers: authHeaders() });
            const data = await res.json();
            setSearchResults(data.users || []);
        } catch { setSearchResults([]); }
        finally { setSearchLoading(false); }
    }, [searchQ]);

    const sendFriendRequest = useCallback(async (username) => {
        try {
            const res = await fetch(`${API}/api/friends/request`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ toUsername: username }),
            });
            const data = await res.json();
            if (res.ok || data.autoAccepted) {
                setSentRequests(prev => new Set([...prev, username]));
                if (data.autoAccepted) await loadFriends();
            } else {
                alert(`Could not add friend: ${data.error || "Unknown error"}`);
            }
        } catch (err) {
            console.error("[sendFriendRequest]", err);
            alert("Network error — is the server running?");
        }
    }, [loadFriends]);

    // ──────────────────────────────────────────────────────
    //  7. Accept / Decline pending request
    // ──────────────────────────────────────────────────────
    const respondRequest = useCallback(async (fromId, action) => {
        // Optimistic removal from UI
        setPending(prev => prev.filter(p => p._id.toString() !== fromId.toString()));
        try {
            const res = await fetch(`${API}/api/friends/respond`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ fromUserId: fromId, action }),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(`Action failed: ${data.error || "Unknown server error"}`);
                await loadFriends();   // restore state
                return;
            }
            if (action === "accept") await loadFriends();
        } catch (err) {
            console.error("[respondRequest] network error:", err);
            alert("Network error — is the server running?");
            await loadFriends();
        }
    }, [loadFriends]);

    // ──────────────────────────────────────────────────────
    //  8. Send room invite (via /friends namespace or clipboard)
    // ──────────────────────────────────────────────────────
    const sendInvite = useCallback(() => {
        if (!roomId || !activeFriend) return;
        const fs = fsRef.current;
        if (fs?.connected) {
            fs.emit("friend:invite", { toUserId: activeFriend._id, roomId });
        } else {
            // Fallback — just copy to clipboard
            navigator.clipboard?.writeText(roomId);
            alert(`Room code copied! Share it with ${activeFriend.username}: ${roomId}`);
        }
    }, [roomId, activeFriend]);

    // ──────────────────────────────────────────────────────
    //  Render
    // ──────────────────────────────────────────────────────
    return (
        <div className="friends-page">

            {/* ── Room-invite toast ── */}
            {inviteToast && (
                <div className="invite-toast">
                    <h3>🎮 Room Invite!</h3>
                    <p><strong>{inviteToast.fromUsername}</strong> wants you to join:</p>
                    <p style={{ fontFamily: "monospace", fontSize: "1.1rem", color: "#00ffe0", margin: "4px 0 10px" }}>
                        {inviteToast.roomId}
                    </p>
                    <div className="invite-toast-btns">
                        <button className="btn-accept" onClick={() => {
                            navigator.clipboard?.writeText(inviteToast.roomId);
                            navigate("/lobby");
                            setInviteToast(null);
                        }}>Join</button>
                        <button className="btn-decline" onClick={() => setInviteToast(null)}>Ignore</button>
                    </div>
                </div>
            )}

            {/* ── Nav ── */}
            <nav className="friends-nav">
                <h1>👥 Friends</h1>
                <button className="nav-back" onClick={() => navigate("/home")}>← Home</button>
            </nav>

            <div className="friends-layout">

                {/* ════════ SIDEBAR ════════ */}
                <aside className="friends-sidebar">

                    {/* Add Friend */}
                    <div className="sidebar-section">
                        <h2>Add Friend</h2>
                        <div className="search-row">
                            <input
                                className="search-input"
                                placeholder="Search username…"
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleSearch()}
                            />
                            <button className="btn-search" onClick={handleSearch} disabled={searchLoading}>
                                {searchLoading ? "…" : "Search"}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map(u => (
                                    <div key={u._id} className="search-result-item">
                                        <span>
                                            <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{u.username}</span>
                                            <span style={{ color: "rgba(200,220,255,0.4)", fontSize: "0.78rem", marginLeft: 6 }}>🏆 {u.trophies}</span>
                                        </span>
                                        <button
                                            className="btn-add"
                                            disabled={sentRequests.has(u.username) || friends.some(f => f.username === u.username)}
                                            onClick={() => sendFriendRequest(u.username)}
                                        >
                                            {sentRequests.has(u.username) ? "Sent ✓" :
                                                friends.some(f => f.username === u.username) ? "Friends" : "+ Add"}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pending requests */}
                    {pending.length > 0 && (
                        <div className="sidebar-section">
                            <h2>Requests ({pending.length})</h2>
                            {pending.map(p => (
                                <div key={p._id} className="pending-item">
                                    <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{p.username}</span>
                                    <div>
                                        <button className="btn-accept" onClick={() => respondRequest(p._id, "accept")}>✓</button>
                                        <button className="btn-decline" onClick={() => respondRequest(p._id, "decline")}>✗</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Friends list */}
                    <div className="sidebar-section" style={{ paddingBottom: 0 }}>
                        <h2>Friends ({friends.length})</h2>
                    </div>
                    <div className="friends-list">
                        {friends.length === 0 && (
                            <p style={{ textAlign: "center", color: "rgba(200,220,255,0.3)", fontSize: "0.88rem", marginTop: 20 }}>
                                No friends yet — search above!
                            </p>
                        )}
                        {friends.map(f => {
                            const online = onlineSet.has(f._id);
                            const unread = unreadMap[f._id] || 0;
                            return (
                                <div
                                    key={f._id}
                                    className={`friend-item ${activeFriend?._id === f._id ? "active" : ""}`}
                                    onClick={() => openChat(f)}
                                >
                                    <div className="friend-avatar">
                                        {f.username[0].toUpperCase()}
                                        {online && <span className="online-dot" title="Online" />}
                                    </div>
                                    <div className="friend-info">
                                        <div className="friend-name">{f.username}</div>
                                        <div className="friend-status">
                                            {online ? "🟢 Online" : "⚫ Offline"} · 🏆 {f.trophies}
                                        </div>
                                    </div>
                                    {unread > 0 && <span className="unread-badge">{unread}</span>}
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* ════════ CHAT PANEL ════════ */}
                {activeFriend ? (
                    <div className="chat-area">
                        <div className="chat-header">
                            <div className="chat-header-info">
                                <h2>{activeFriend.username}</h2>
                                <p>
                                    {onlineSet.has(activeFriend._id) ? "🟢 Online now" : "⚫ Offline"}
                                    {" · "}🏆 {activeFriend.trophies} trophies · {activeFriend.wins} wins
                                </p>
                            </div>
                            {roomId && (
                                <button className="btn-invite" onClick={sendInvite} title="Invite to your current game room">
                                    🎮 Invite to Room
                                </button>
                            )}
                        </div>

                        <div className="chat-messages">
                            {loadingMsgs && <p className="chat-empty">Loading…</p>}
                            {!loadingMsgs && messages.length === 0 && (
                                <p className="chat-empty">No messages yet. Say hi! 👋</p>
                            )}
                            {messages.map((msg, i) => {
                                const mine = msg.sender === myId;
                                return (
                                    <div key={msg._id || i} className={`msg-bubble ${mine ? "mine" : "theirs"}`}>
                                        <div className="msg-text">{msg.text}</div>
                                        <div className="msg-time">{timeAgo(msg.createdAt)}</div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        <form className="chat-input-row" onSubmit={sendDM}>
                            <input
                                className="chat-input"
                                placeholder={`Message ${activeFriend.username}…`}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                maxLength={500}
                                autoFocus
                            />
                            <button type="submit" className="btn-send-dm">Send</button>
                        </form>
                    </div>
                ) : (
                    <div className="chat-placeholder">
                        <div className="icon">💬</div>
                        <p>Select a friend to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}
