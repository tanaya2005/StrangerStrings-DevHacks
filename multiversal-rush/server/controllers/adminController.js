// ============================================================
//  controllers/adminController.js
//  All admin panel REST endpoints.
// ============================================================
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Game from "../models/Game.js";

const JWT_SECRET = process.env.JWT_SECRET || "multiversal_secret_change_me";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "supersecretadmin2024";

// ── Shared in-memory rooms ref (passed in from gameSocket) ──
// Set by initAdminController() called from server.js
let _rooms = null;
let _io = null;
export function initAdminController(rooms, io) {
    _rooms = rooms;
    _io = io;
}

// ─────────────────────────────────────────────────────────────
//  1. Admin Login
//  POST /api/admin/login  { secret }
//  Returns a short-lived admin JWT (2h).
// ─────────────────────────────────────────────────────────────
export async function adminLogin(req, res) {
    const { secret } = req.body;
    if (!secret || secret !== ADMIN_SECRET) {
        return res.status(403).json({ error: "Invalid admin secret" });
    }
    const token = jwt.sign({ id: "admin", isAdmin: true }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token });
}

// ─────────────────────────────────────────────────────────────
//  2. Dashboard Overview
//  GET /api/admin/overview
// ─────────────────────────────────────────────────────────────
export async function getOverview(req, res) {
    try {
        const [
            totalUsers,
            totalGames,
            activeGames,
            completedGames,
            abortedGames,
        ] = await Promise.all([
            User.countDocuments(),
            Game.countDocuments(),
            Game.countDocuments({ status: "in_progress" }),
            Game.countDocuments({ status: "completed" }),
            Game.countDocuments({ status: "aborted" }),
        ]);

        // Live rooms from memory
        const liveRooms = _rooms ? Object.entries(_rooms).map(([id, r]) => ({
            roomId: id,
            state: r.gameState,
            map: r.selectedMap || null,
            players: Object.values(r.players).map(p => ({
                name: p.name,
                ready: p.ready,
                eliminated: p.eliminated,
                finished: p.finished,
            })),
        })) : [];

        // Map popularity (last 30 days)
        const mapStats = await Game.aggregate([
            { $match: { status: "completed" } },
            { $group: { _id: "$map", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        // Games per day (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const gamesPerDay = await Game.aggregate([
            { $match: { startedAt: { $gte: sevenDaysAgo }, status: "completed" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } },
                    count: { $sum: 1 },
                    avgDuration: { $avg: "$durationMs" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            stats: { totalUsers, totalGames, activeGames, completedGames, abortedGames },
            liveRooms,
            mapStats,
            gamesPerDay,
        });
    } catch (err) {
        console.error("[adminController.getOverview]", err);
        res.status(500).json({ error: "Overview fetch failed" });
    }
}

// ─────────────────────────────────────────────────────────────
//  3. Games list  (paginated)
//  GET /api/admin/games?page=0&limit=20&map=&status=
// ─────────────────────────────────────────────────────────────
export async function getGames(req, res) {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 20;
        const filter = {};
        if (req.query.map) filter.map = req.query.map;
        if (req.query.status) filter.status = req.query.status;

        const [games, total] = await Promise.all([
            Game.find(filter)
                .sort({ startedAt: -1 })
                .skip(page * limit)
                .limit(limit),
            Game.countDocuments(filter),
        ]);

        res.json({ games, total, page, limit });
    } catch (err) {
        console.error("[adminController.getGames]", err);
        res.status(500).json({ error: "Failed to get games" });
    }
}

// ─────────────────────────────────────────────────────────────
//  4. Users list (paginated + search)
//  GET /api/admin/users?page=0&q=
// ─────────────────────────────────────────────────────────────
export async function getUsers(req, res) {
    try {
        const page = parseInt(req.query.page) || 0;
        const limit = 20;
        const q = req.query.q?.trim();

        const filter = q
            ? { username: { $regex: q, $options: "i" } }
            : {};

        const [users, total] = await Promise.all([
            User.find(filter)
                .select("username email trophies wins gamesPlayed banned createdAt")
                .sort({ trophies: -1 })
                .skip(page * limit)
                .limit(limit),
            User.countDocuments(filter),
        ]);

        res.json({ users, total, page, limit });
    } catch (err) {
        console.error("[adminController.getUsers]", err);
        res.status(500).json({ error: "Failed to get users" });
    }
}

// ─────────────────────────────────────────────────────────────
//  5. Ban / Unban user
//  POST /api/admin/users/:userId/ban  { banned: true|false }
// ─────────────────────────────────────────────────────────────
export async function setBanStatus(req, res) {
    try {
        const { userId } = req.params;
        const { banned } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { banned: !!banned } },
            { new: true }
        ).select("username banned");

        if (!user) return res.status(404).json({ error: "User not found" });

        // If banning, kick them from any live room
        if (banned && _io && _rooms) {
            const allSockets = _io.sockets.sockets;
            for (const [, s] of allSockets) {
                if (s.data.playerName?.toLowerCase() === user.username.toLowerCase()) {
                    s.emit("serverKick", { reason: "You have been banned by an admin." });
                    s.disconnect(true);
                    break;
                }
            }
        }

        console.log(`[Admin] ${banned ? "Banned" : "Unbanned"} user: ${user.username}`);
        res.json({ user });
    } catch (err) {
        console.error("[adminController.setBanStatus]", err);
        res.status(500).json({ error: "Ban operation failed" });
    }
}

// ─────────────────────────────────────────────────────────────
//  6. Reset a user's stats
//  POST /api/admin/users/:userId/reset-stats
// ─────────────────────────────────────────────────────────────
export async function resetStats(req, res) {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: { trophies: 0, wins: 0, gamesPlayed: 0 } },
            { new: true }
        ).select("username trophies wins gamesPlayed");

        if (!user) return res.status(404).json({ error: "User not found" });
        console.log(`[Admin] Stats reset for: ${user.username}`);
        res.json({ user });
    } catch (err) {
        console.error("[adminController.resetStats]", err);
        res.status(500).json({ error: "Reset failed" });
    }
}

// ─────────────────────────────────────────────────────────────
//  7. Kick a player from their room
//  POST /api/admin/rooms/:roomId/kick  { playerName }
// ─────────────────────────────────────────────────────────────
export async function kickPlayer(req, res) {
    try {
        const { roomId } = req.params;
        const { playerName } = req.body;

        if (!_io || !_rooms) return res.status(503).json({ error: "Socket not available" });

        const allSockets = _io.sockets.sockets;
        let found = false;
        for (const [, s] of allSockets) {
            if (s.data.roomId === roomId &&
                s.data.playerName?.toLowerCase() === playerName.toLowerCase()) {
                s.emit("serverKick", { reason: "You were removed by an admin." });
                s.disconnect(true);
                found = true;
                break;
            }
        }

        console.log(`[Admin] Kick ${playerName} from room ${roomId}: ${found}`);
        res.json({ success: found, message: found ? "Player kicked" : "Player not found" });
    } catch (err) {
        console.error("[adminController.kickPlayer]", err);
        res.status(500).json({ error: "Kick failed" });
    }
}

// ─────────────────────────────────────────────────────────────
//  8. Force-end a room
//  POST /api/admin/rooms/:roomId/force-end
// ─────────────────────────────────────────────────────────────
export async function forceEndRoom(req, res) {
    try {
        const { roomId } = req.params;
        if (!_io || !_rooms) return res.status(503).json({ error: "Socket not available" });

        const room = _rooms[roomId];
        if (!room) return res.status(404).json({ error: "Room not found" });

        _io.to(roomId).emit("serverMessage", { msg: "⚠️ This room was ended by an admin." });
        _io.to(roomId).emit("returnToLobby");

        // Cleanup interval
        if (room.lobbyInterval) clearInterval(room.lobbyInterval);
        if (room.windInterval) clearInterval(room.windInterval);
        delete _rooms[roomId];

        // Mark game aborted in DB
        await Game.findOneAndUpdate(
            { roomId, status: "in_progress" },
            { $set: { status: "aborted", endedAt: new Date() } }
        );

        console.log(`[Admin] Force-ended room: ${roomId}`);
        res.json({ success: true });
    } catch (err) {
        console.error("[adminController.forceEndRoom]", err);
        res.status(500).json({ error: "Force end failed" });
    }
}

// ─────────────────────────────────────────────────────────────
//  9. Broadcast server-wide message to all connected players
//  POST /api/admin/broadcast  { msg }
// ─────────────────────────────────────────────────────────────
export async function broadcastMessage(req, res) {
    try {
        const { msg } = req.body;
        if (!msg?.trim()) return res.status(400).json({ error: "msg required" });
        if (!_io) return res.status(503).json({ error: "Socket not available" });

        _io.emit("serverMessage", { msg: msg.trim() });
        console.log(`[Admin] Broadcast: "${msg.trim()}"`);
        res.json({ success: true });
    } catch (err) {
        console.error("[adminController.broadcastMessage]", err);
        res.status(500).json({ error: "Broadcast failed" });
    }
}

// ─────────────────────────────────────────────────────────────
//  10. Delete a game record
//  DELETE /api/admin/games/:gameId
// ─────────────────────────────────────────────────────────────
export async function deleteGame(req, res) {
    try {
        await Game.findByIdAndDelete(req.params.gameId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
}
