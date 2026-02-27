// ============================================================
//  socket/friendSocket.js (CLIENT)
//  Connects to the /friends namespace with the stored JWT token.
//  Re-exports the socket singleton + helper hooks.
// ============================================================
import { io } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

// Lazy singleton — only created when getToken() is non-null
let friendSocket = null;

export function getFriendSocket() {
    if (friendSocket) return friendSocket;

    const token = localStorage.getItem("mr_token");
    if (!token) return null;

    friendSocket = io(`${SERVER}/friends`, {
        auth: { token },
        autoConnect: true,
        reconnectionAttempts: 5,
    });

    friendSocket.on("connect", () => console.log("[FriendSocket] connected"));
    friendSocket.on("disconnect", () => console.log("[FriendSocket] disconnected"));

    return friendSocket;
}

export function destroyFriendSocket() {
    if (friendSocket) {
        friendSocket.disconnect();
        friendSocket = null;
    }
}
