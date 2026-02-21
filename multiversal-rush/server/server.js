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

// Load environment variables from .env
dotenv.config();

// ---- Express App Setup ----
const app = express();
app.use(express.json());
app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
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
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket"],
});

// ---- Register all game socket logic ----
registerGameSocket(io);

// ---- Connect MongoDB ----
connectDB().catch((err) =>
    console.warn("⚠️  MongoDB not connected – DB routes disabled:", err.message)
);

// ---- Start listening ----
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
