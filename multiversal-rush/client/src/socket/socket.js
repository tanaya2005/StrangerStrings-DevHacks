// ============================================================
//  socket/socket.js — Client-side Socket.io singleton
//  Member 2 (Multiplayer)
//
//  This file exports ONE shared socket instance so every
//  component imports from the same connection.
// ============================================================
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

/**
 * Create the socket.
 * `autoConnect: false` lets us call socket.connect() only after
 * the user has logged in (so their name is known).
 */
const socket = io(SERVER_URL, {
    autoConnect: false,       // We connect manually in the Lobby page
    reconnectionAttempts: 5,  // Retry 5 times on disconnect
    reconnectionDelay: 1000,  // 1 second between retries
    timeout: 20000,
});

// ---- Debug listeners (remove in production) ----
socket.on("connect", () => {
    console.log(`[Socket] ✅ Connected with id: ${socket.id}`);
});

socket.on("disconnect", (reason) => {
    console.log(`[Socket] ❌ Disconnected: ${reason}`);
});

socket.on("connect_error", (err) => {
    console.error("[Socket] ⚠️ Connection error:", err.message);
    console.error("[Socket] Error details:", err);
});

socket.io.on("error", (error) => {
    console.error("[Socket] ⚠️ IO error:", error);
});

socket.io.on("reconnect_attempt", (attempt) => {
    console.log(`[Socket] 🔄 Reconnect attempt ${attempt}`);
});

socket.io.on("reconnect_failed", () => {
    console.error("[Socket] ❌ Reconnection failed");
});

export default socket;
