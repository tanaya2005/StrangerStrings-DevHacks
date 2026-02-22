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
import voiceRoutes from "./routes/voiceRoutes.js";
import achievementRoutes from "./routes/achievementRoutes.js";
import { registerGameSocket } from "./socket/gameSocket.js";
import { attachChat } from "./socket/chat.js";
import { attachFriendSocket } from "./socket/friendSocket.js";
import friendRoutes from "./routes/friendRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { initAdminController } from "./controllers/adminController.js";
import User from "./models/User.js";

// Load environment variables
dotenv.config({ override: true });

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://strangerstrings-devhacks.onrender.com",
    "https://stranger-strings-dev-hacks-bn59.vercel.app",
    process.env.CLIENT_URL,
].filter(Boolean);

// ---- Express ----
const app = express();
app.use(express.json());
app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
}));

// ---- REST Routes ----
app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/voice", voiceRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/admin", adminRoutes);   // 🔒 Admin panel API
app.use("/api/shop", shopRoutes);

// Banned user check — any authenticated request
app.use(async (req, res, next) => {
    // Only check player routes (not admin)
    if (req.path.startsWith("/api/admin")) return next();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return next();
    try {
        const jwt = await import("jsonwebtoken");
        const decoded = jwt.default.verify(authHeader.split(" ")[1], process.env.JWT_SECRET || "multiversal_secret_change_me");
        const user = await User.findById(decoded.id).select("banned");
        if (user?.banned) return res.status(403).json({ error: "Account banned. Contact admin." });
        next();
    } catch { next(); }
});

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

const { rooms } = registerGameSocket(io);
attachChat(io);
attachFriendSocket(io);

// Wire live rooms map into admin controller
initAdminController(rooms, io);

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
