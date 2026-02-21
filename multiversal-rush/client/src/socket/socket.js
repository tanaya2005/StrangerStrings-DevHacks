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
    transports: ["websocket"], // Skip polling – faster and cleaner
    reconnectionAttempts: 5,  // Retry 5 times on disconnect
    reconnectionDelay: 1000,  // 1 second between retries
});

// ---- Debug listeners (remove in production) ----
socket.on("connect", () => {
    console.log(`[Socket] Connected with id: ${socket.id}`);
});

socket.on("disconnect", (reason) => {
    console.log(`[Socket] Disconnected: ${reason}`);
});

socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
});

export default socket;
