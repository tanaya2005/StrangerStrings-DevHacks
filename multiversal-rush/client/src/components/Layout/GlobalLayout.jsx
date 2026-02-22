// ============================================================
//  components/Layout/GlobalLayout.jsx
//  Wraps every authenticated page to provide:
//    • Global toast notifications (friend requests, room invites, admin broadcasts)
//    • pendingRequests badge updated in Zustand store
//  Does NOT render a nav bar — Archit's Home page has its own HUD,
//  the Lobby has its own header, and the Game is fullscreen.
// ============================================================
import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import socket from "../../socket/socket";
import { getFriendSocket } from "../../socket/friendSocket";
import useStore from "../../store/store";
import "./GlobalLayout.css";

const API = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function GlobalLayout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();

    const isGamePage = location.pathname === "/game";

    const pendingRequests = useStore((s) => s.pendingRequests);
    const setPendingRequests = useStore((s) => s.setPendingRequests);

    const [globalToasts, setGlobalToasts] = useState([]);

    // ---- Fetch initial friend request count ----
    useEffect(() => {
        async function fetchFriendRequests() {
            try {
                const token = localStorage.getItem("mr_token");
                const res = await fetch(`${API}/api/friends`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPendingRequests(data.friendRequests?.length || data.pending?.length || 0);
                }
            } catch (err) {
                console.error("[GlobalLayout] Failed to fetch FR count:", err);
            }
        }
        fetchFriendRequests();
    }, [setPendingRequests]);

    // ---- Toast helpers ----
    const addToast = useCallback((type, title, message, data = {}) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setGlobalToasts(prev => [...prev, { id, type, title, message, data }]);
        // Admin broadcasts stay longer; others auto-dismiss after 10s
        const duration = type === "adminBroadcast" ? 15000 : 10000;
        setTimeout(() => removeToast(id), duration);
        return id;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const removeToast = useCallback((id) => {
        setGlobalToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // ---- Handle joining room via invite toast ----
    const handleJoinRoom = useCallback((roomCode, toastId) => {
        removeToast(toastId);
        navigate("/lobby", { state: { autoJoinRoom: roomCode } });
    }, [navigate, removeToast]);

    // ---- Socket event listeners ----
    useEffect(() => {
        // friendSocket may not be ready at first render — retry once after a short delay
        let fs = getFriendSocket?.();

        const isFriendsPage = location.pathname === "/friends";

        // 1. Friend Request Received
        const handleFR = ({ fromUserId, fromUsername }) => {
            const current = useStore.getState().pendingRequests;
            useStore.getState().setPendingRequests(current + 1);
            useStore.getState().addNotification({ type: 'friend_request', message: `${fromUsername} sent you a friend request!` });
            if (!isGamePage) {
                addToast("friendRequest", "Friend Request 👤", `${fromUsername} sent you a friend request!`, { fromUserId, fromUsername });
            }
        };

        // 2. Room Invite Received (via main game socket)
        const handleRoomInvite = ({ fromName, roomCode }) => {
            useStore.getState().addNotification({ type: 'room_invite', roomCode, message: `${fromName} invited you to join room ${roomCode}` });
            if (!isGamePage) {
                addToast("roomInvite", "Game Invite 🎮", `${fromName} invited you to join room ${roomCode}`, { roomCode });
            }
        };

        // 3. Admin Broadcast — show EVERYWHERE including in-game
        const handleServerMessage = ({ text }) => {
            useStore.getState().addNotification({ type: 'broadcast', message: `[SYSTEM] ${text}` });
            addToast("adminBroadcast", "📢 Server Announcement", text);
        };

        // 4. DM notification — only when NOT on the Friends page
        const handleDM = ({ senderUsername, text }) => {
            useStore.getState().addNotification({ type: 'dm', message: `DM from ${senderUsername}: ${text?.slice(0, 50)}` });
            if (!isFriendsPage) {
                addToast("dm", `💬 DM from ${senderUsername}`, text?.slice(0, 80));
            }
        };

        socket.on("roomInvite", handleRoomInvite);
        socket.on("serverMessage", handleServerMessage);
        if (fs) {
            fs.on("friend:requestReceived", handleFR);
            fs.on("dm:message", handleDM);
        }

        return () => {
            socket.off("roomInvite", handleRoomInvite);
            socket.off("serverMessage", handleServerMessage);
            if (fs) {
                fs.off("friend:requestReceived", handleFR);
                fs.off("dm:message", handleDM);
            }
        };
    }, [isGamePage, location.pathname, addToast, setPendingRequests]);

    return (
        <div className={`global-container${isGamePage ? " is-game" : ""}`}>
            {/* Page content */}
            <div className="global-content">
                {children}
            </div>

            {/* ── Global Toast Notifications ── */}
            <div className="global-toast-container">
                {globalToasts.map(toast => (
                    <div key={toast.id} className={`global-toast toast-${toast.type}`}>
                        <div className="toast-header">
                            <span className="toast-icon">
                                {toast.type === "friendRequest" ? "👤"
                                    : toast.type === "roomInvite" ? "🎮"
                                        : toast.type === "dm" ? "💬"
                                            : "📢"}
                            </span>
                            <strong>{toast.title}</strong>
                            <button className="toast-close" onClick={() => removeToast(toast.id)}>×</button>
                        </div>
                        <div className="toast-body">{toast.message}</div>
                        {toast.type === "roomInvite" && (
                            <div className="toast-actions">
                                <button
                                    className="toast-btn-action"
                                    onClick={() => handleJoinRoom(toast.data.roomCode, toast.id)}
                                >
                                    Join Room
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
