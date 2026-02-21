// ============================================================
//  server.js — Express + Socket.io entry point
//  Multiversal Rush
// ============================================================
import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import { registerGameSocket } from "./socket/gameSocket.js";
import { attachChat } from "./socket/chat.js";
import { ExpressPeerServer } from "peer";

// Load environment variables from .env
dotenv.config();

// ---- Express App Setup ----
const app = express();
app.use(express.json());
app.use(
    cors({
        origin: [
            process.env.CLIENT_URL || "http://localhost:5173",
            "http://localhost:5174"
        ],
        methods: ["GET", "POST"],
        credentials: true,
    })
);

// ---- REST Routes ----
app.use("/api/auth", authRoutes);        // signup / login / me
app.use("/api/leaderboard", leaderboardRoutes); // global leaderboard

// Health check
app.get("/", (req, res) => res.send("Multiversal Rush Server is running 🚀"));

// ---- Create HTTP server ----
const httpServer = http.createServer(app);

// ---- Socket.io Server ----
const io = new Server(httpServer, {
    cors: {
        origin: [
            process.env.CLIENT_URL || "http://localhost:5173",
            "http://localhost:5174"
        ],
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// ---- Register all game socket logic ----
registerGameSocket(io);

// ---- Register chat + PeerJS voice signaling (archit2 Task 4) ----
attachChat(io);

// ---- Mount PeerJS server at /peerjs (fixes 404 in Voice.jsx) ----
// Voice.jsx connects to: same host, same port, path '/peerjs'
const peerServer = ExpressPeerServer(httpServer, { path: "/peerjs" });
app.use("/peerjs", peerServer);
peerServer.on("connection", (client) => console.log(`[PeerJS] connected: ${client.getId()}`));
peerServer.on("disconnect", (client) => console.log(`[PeerJS] disconnected: ${client.getId()}`));

// ---- Connect MongoDB ----
connectDB().catch((err) =>
    console.warn("⚠️  MongoDB not connected – DB routes disabled:", err.message)
);

// ---- Start listening ----
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
