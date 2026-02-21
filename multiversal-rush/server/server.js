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
import voiceRoutes from "./routes/voiceRoutes.js";     // archit2 — LiveKit token
import { registerGameSocket } from "./socket/gameSocket.js";
import { attachChat } from "./socket/chat.js";

// Load environment variables from .env
dotenv.config({ override: true });

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    process.env.CLIENT_URL
].filter(Boolean);

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    process.env.CLIENT_URL,
].filter(Boolean);

// ---- Express ----
const app = express();
app.use(express.json());
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    })
);

// ---- REST Routes ----
app.use("/api/auth", authRoutes);          // signup / login / me
app.use("/api/leaderboard", leaderboardRoutes);   // global leaderboard
app.use("/api/voice", voiceRoutes);         // LiveKit token (archit2)

// Health check
app.get("/", (req, res) => res.send("Multiversal Rush Server ✅"));

// ---- HTTP Server ----
const httpServer = http.createServer(app);

// ---- Socket.io ----
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// Register socket handlers
registerGameSocket(io);
attachChat(io);

console.log("✅ LiveKit voice enabled (cloud SFU — no local server needed)");

// ---- MongoDB ----
connectDB().catch((err) =>
    console.warn("⚠️  MongoDB not connected:", err.message)
);

// ---- Start ----
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
