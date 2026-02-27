// ============================================================
//  socket/gameSocket.js — ALL multiplayer game logic lives here
//  Member 2 (Multiplayer / Socket.io)
// ============================================================

import User from "../models/User.js";
import { updateAchievement } from "../services/achievementService.js";
import Message from "../models/Message.js";
import Game from "../models/Game.js";

/**
 * In-memory room store.
 * Structure:
 *   rooms = {
 *     [roomId]: {
 *       players: {
 *         [socketId]: {
 *           id, name, position: {x,y,z}, rotation: {y},
 *           world, finished, finishTime, eliminated
 *         }
 *       },
 *       gameState: "waiting" | "countdown" | "playing" | "finished",
 *       startTime: Number,
 *       finishedOrder: [socketId, ...],   // order of finish
 *       chatMessages: [{ sender, text, timestamp }]
 *     }
 *   }
 */
const rooms = {};

// ---- Constants ----
const MAX_PLAYERS_PER_ROOM = 5;   // Hard cap per room
const MOVE_THROTTLE_MS = 50;       // Min ms between move broadcasts
const LOBBY_COUNTDOWN_SECONDS = 15;  // seconds in 3D lobby before map loads
const MATCH_RESULTS_DURATION = 10000; // 10 seconds show results

// Trophy distribution
const TROPHY_REWARDS = {
    1: 15,  // 1st place
    2: 10,  // 2nd place
    3: 5,   // 3rd place
};

// XP rewards
const XP_REWARDS = {
    1: 200,
    2: 175,
    3: 150,
    participation: 100,
};

// ---- Helpers ----

/**
 * Calculates level from total XP
 * Level 1: 0-99 XP
 * Level 2: Starts at 100 XP
 * Requirement increases by 200 each level
 */
function getLevelInfo(totalXP) {
    let level = 1;
    let xpNeeded = 100;
    let tempXP = totalXP;
    while (tempXP >= xpNeeded) {
        tempXP -= xpNeeded;
        level++;
        xpNeeded += 200;
    }
    return {
        level,
        currentXP: tempXP,
        neededXP: xpNeeded,
        progress: Math.floor((tempXP / xpNeeded) * 100)
    };
}

// ---- Helpers ----

/** Create a blank room object */
function createRoom(roomId) {
    return {
        players: {},
        gameState: "waiting",   // waiting → lobby → playing → finished
        startTime: null,
        finishedOrder: [],
        chatMessages: [],
        selectedMap: null,
        lastMap: null,          // track last played map to avoid repeat
        windDirection: 1,
        windInterval: null,
        avalancheActive: false,
        avalancheZ: 60,
        avalancheSpeed: 8,
        avalancheInterval: null,
        lobbyInterval: null,    // 15s countdown interval
    };
}

/** Start wind direction broadcaster for a room */
function startWindBroadcast(io, roomId, room) {
    if (room.windInterval) clearInterval(room.windInterval);

    room.windInterval = setInterval(() => {
        if (room.gameState !== "playing") {
            clearInterval(room.windInterval);
            return;
        }
        room.windDirection *= -1;
        io.to(roomId).emit("windDirection", {
            direction: room.windDirection,
            timestamp: Date.now()
        });
        console.log(`[Room ${roomId}] Wind direction: ${room.windDirection > 0 ? "RIGHT" : "LEFT"}`);
    }, 3000);
}

/** Start snow cannon firing for Frozen Frenzy map */
function startCannonFiring(io, roomId, room) {
    if (room.cannonIntervals) {
        room.cannonIntervals.forEach(interval => clearInterval(interval));
    }
    room.cannonIntervals = [];

    // Cannon definitions matching FrozenFrenzyArena.jsx
    const cannons = [
        { id: "cannon_A1", interval: 3000, delay: 0, speed: 8, size: 1.8 },
        { id: "cannon_A2", interval: 3000, delay: 1500, speed: 14, size: 1.0 },
        { id: "cannon_B1", interval: 2500, delay: 0, speed: 9, size: 2.0 },
        { id: "cannon_B2", interval: 2500, delay: 800, speed: 15, size: 1.0 },
        { id: "cannon_B3", interval: 2500, delay: 1600, speed: 11, size: 1.4 },
    ];

    cannons.forEach(cannon => {
        setTimeout(() => {
            const fire = () => {
                if (room.gameState !== "playing") return;
                io.to(roomId).emit("cannonFire", {
                    cannonId: cannon.id,
                    speed: cannon.speed,
                    size: cannon.size,
                    timestamp: Date.now()
                });
            };

            fire(); // Fire immediately after delay
            const interval = setInterval(fire, cannon.interval);
            room.cannonIntervals.push(interval);
        }, cannon.delay);
    });

    console.log(`[Room ${roomId}] ❄️ Snow cannons activated`);
}

/** Trigger the avalanche for a room (called once when first player hits checkpoint) */
function startAvalanche(io, roomId, room) {
    if (room.avalancheActive) return; // Already running
    room.avalancheActive = true;
    room.avalancheZ = 60;
    room.avalancheSpeed = 8;

    // Tell all clients to start the wave
    io.to(roomId).emit('avalancheStart');
    console.log(`[Room ${roomId}] 🏔️ Avalanche triggered!`);

    const ACCEL = 0.8;
    const MAX_SPD = 26;
    const TICK_MS = 1000; // sync interval

    room.avalancheInterval = setInterval(() => {
        if (!room.avalancheActive || room.gameState !== 'playing') {
            stopAvalanche(io, roomId, room);
            return;
        }

        // Advance server-side position
        room.avalancheSpeed = Math.min(room.avalancheSpeed + ACCEL, MAX_SPD);
        room.avalancheZ -= room.avalancheSpeed;

        // Broadcast authoritative sync
        io.to(roomId).emit('avalancheSync', {
            z: room.avalancheZ,
            spd: room.avalancheSpeed,
        });

        // Past finish — end
        if (room.avalancheZ < -230) {
            stopAvalanche(io, roomId, room);
        }
    }, TICK_MS);
}

/** Stop and clean up avalanche for a room */
function stopAvalanche(io, roomId, room) {
    room.avalancheActive = false;
    if (room.avalancheInterval) {
        clearInterval(room.avalancheInterval);
        room.avalancheInterval = null;
    }
    io.to(roomId).emit('avalancheEnd');
    console.log(`[Room ${roomId}] 🏔️ Avalanche ended.`);
}

/** Return a safe, serialisable snapshot of all players in a room */
function getPlayerList(room) {
    return Object.values(room.players);
}

/** Count players in room */
function playerCount(room) {
    return Object.keys(room.players).length;
}

/**
 * Distribute trophies and update database after match ends
 */
async function distributeTrophies(io, roomId, room) {
    const results = [];

    // 1. Process each player in finish order (Winners)
    for (let i = 0; i < room.finishedOrder.length; i++) {
        const socketId = room.finishedOrder[i];
        const player = room.players[socketId];
        if (!player) continue;

        const place = i + 1;
        const trophiesEarned = TROPHY_REWARDS[place] || 0;
        const xpEarned = XP_REWARDS[place] || XP_REWARDS.participation;
        const isWinner = place === 1;

        try {
            // Find user to get current XP/Level
            const user = await User.findOne({ username: player.name });
            if (!user) continue;

            const oldXP = user.xp || 0;
            const oldLevel = user.level || 1;
            const newTotalXP = oldXP + xpEarned;

            // Calculate new level info
            const levelInfo = getLevelInfo(newTotalXP);
            const levelsGained = levelInfo.level - oldLevel;
            const gemsEarned = levelsGained * 2;

            // Update user in database
            const updatedUser = await User.findOneAndUpdate(
                { username: player.name },
                {
                    $set: { xp: newTotalXP, level: levelInfo.level },
                    $inc: {
                        trophies: trophiesEarned,
                        gamesPlayed: 1,
                        gems: gemsEarned,
                        ...(isWinner ? { wins: 1 } : {}),
                    },
                },
                { new: true }
            );

            if (updatedUser) {
                results.push({
                    username: player.name,
                    place,
                    trophiesEarned,
                    xpEarned,
                    gemsEarned,
                    level: updatedUser.level,
                    newXP: updatedUser.xp,
                    totalTrophies: updatedUser.trophies,
                    wins: updatedUser.wins,
                    gamesPlayed: updatedUser.gamesPlayed,
                });

                console.log(
                    `[Room ${roomId}] ${player.name} - Place ${place} - XP +${xpEarned} - Level ${updatedUser.level}`
                );
            }
        } catch (err) {
            console.error(`[XP/Trophy Distribution] Error updating ${player.name}:`, err);
            results.push({
                username: player.name,
                place,
                trophiesEarned: 0,
                xpEarned: 0,
                gemsEarned: 0,
                level: 1,
                totalTrophies: 0,
            });
        }
    }

    // 2. Process eliminated players (Participation)
    for (const socketId in room.players) {
        const player = room.players[socketId];
        if (!room.finishedOrder.includes(socketId)) {
            const xpEarned = XP_REWARDS.participation;
            try {
                const user = await User.findOne({ username: player.name });
                if (user) {
                    const oldXP = user.xp || 0;
                    const oldLevel = user.level || 1;
                    const newTotalXP = oldXP + xpEarned;
                    const levelInfo = getLevelInfo(newTotalXP);
                    const levelsGained = levelInfo.level - oldLevel;
                    const gemsEarned = levelsGained * 2;

                    const updatedUser = await User.findOneAndUpdate(
                        { username: player.name },
                        {
                            $set: { xp: newTotalXP, level: levelInfo.level },
                            $inc: { gamesPlayed: 1, gems: gemsEarned }
                        },
                        { new: true }
                    );

                    results.push({
                        username: player.name,
                        place: 0, // Eliminated
                        trophiesEarned: 0,
                        xpEarned,
                        gemsEarned,
                        level: updatedUser.level,
                        totalTrophies: updatedUser.trophies,
                    });
                }
            } catch (err) {
                console.error(`[XP Distribution] Error updating eliminated player ${player.name}:`, err);
            }
        }
    }

    // Emit match results to all players
    io.to(roomId).emit("matchResults", { results });

    // ---- Achievement updates: trophyCollector & survivorSpirit ----
    for (const r of results) {
        // trophyCollector
        if (r.trophiesEarned > 0) {
            const unlock = await updateAchievement(r.username, 'trophyCollector', r.trophiesEarned);
            if (unlock) {
                for (const sid in room.players) {
                    if (room.players[sid].name === r.username) {
                        io.to(sid).emit('achievementUnlocked', unlock);
                        break;
                    }
                }
            }
        }

        // survivorSpirit (Survive without elimination)
        if (r.place > 0) {
            const ss = await updateAchievement(r.username, 'survivorSpirit', 1);
            if (ss) {
                for (const sid in room.players) {
                    if (room.players[sid].name === r.username) {
                        io.to(sid).emit('achievementUnlocked', ss);
                        break;
                    }
                }
            }
        }
    }

    // Fetch and broadcast updated leaderboard
    try {
        const leaderboard = await User.find()
            .sort({ trophies: -1 })
            .limit(20)
            .select("username trophies wins gamesPlayed");

        io.to(roomId).emit("leaderboardUpdate", { leaderboard });
    } catch (err) {
        console.error(`[Leaderboard Update] Error:`, err);
    }

    return results;
}

/**
 * Save a completed game to MongoDB.
 */
async function saveGameRecord(roomId, room) {
    try {
        const allPlayers = Object.values(room.players);
        const finishedOrder = room.finishedOrder || [];
        const endedAt = new Date();
        const startedAt = room.gameStartedAt ? new Date(room.gameStartedAt) : new Date(Date.now() - (room.startTime || 0));

        const playerResults = allPlayers.map(p => {
            const place = finishedOrder.indexOf(p.id);
            return {
                socketId: p.id,
                username: p.name,
                place: place >= 0 ? place + 1 : null,
                eliminated: p.eliminated || false,
                finishTime: p.finishTime || null,
                trophiesEarned: place >= 0 ? (TROPHY_REWARDS[place + 1] || 0) : 0,
            };
        });

        const winner = allPlayers.find(p => !p.eliminated && p.finished &&
            room.finishedOrder[0] === p.id);

        await Game.findOneAndUpdate(
            { roomId, status: "in_progress" },
            {
                $set: {
                    status: "completed",
                    endedAt,
                    durationMs: endedAt - startedAt,
                    players: playerResults,
                    winnerUsername: winner?.name || null,
                }
            },
            { new: true }
        );
        console.log(`[Game] Saved record for room ${roomId}`);
    } catch (err) {
        console.error("[saveGameRecord] Error:", err);
    }
}

/**
 * After every elimination / finish check, see if only 1 player is left
 * un-eliminated and un-finished → they become the winner.
 */
async function checkElimination(io, roomId, room) {
    if (room.gameState !== "playing") return;

    const activePlayers = Object.values(room.players).filter(
        (p) => !p.finished && !p.eliminated
    );

    // If only 1 active player remains, they win automatically
    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        winner.finished = true;
        winner.finishTime = Date.now() - room.startTime;
        room.finishedOrder.push(winner.id);
        room.gameState = "finished";

        io.to(roomId).emit("playerFinishedRace", {
            playerId: winner.id,
            playerName: winner.name,
            position: room.finishedOrder.length,
            finishTime: winner.finishTime,
            finishedOrder: room.finishedOrder,
        });

        console.log(`[Room ${roomId}] Game finished. Winner: ${winner.name}`);

        // Distribute trophies and show match results
        await distributeTrophies(io, roomId, room);
        // Save to DB
        await saveGameRecord(roomId, room);

        // User choice handled in MatchResultsOverlay
    }

    // If no active players (all eliminated), end game
    if (activePlayers.length === 0) {
        room.gameState = "finished";

        console.log(`[Room ${roomId}] Game finished. All players eliminated.`);

        // Distribute trophies even if all eliminated
        await distributeTrophies(io, roomId, room);
        // Save to DB
        await saveGameRecord(roomId, room);

        // User choice handled in MatchResultsOverlay
    }
}

// ============================================================
//  Module-level DM tracking (survives individual connections)
//  Maps userId (MongoDB string) → current socketId
// ============================================================
const dmUserMap = new Map(); // userId → socketId

/** Compute the deterministic private-chat room name for two users */
function dmRoom(idA, idB) {
    return [idA, idB].sort().join("___dm___");
}

// ============================================================
//  Main export – call this once in server.js
//  Returns { rooms } so admin controller can access live state.
// ============================================================
export function registerGameSocket(io) {

    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // --------------------------------------------------------
        //  dm:register
        //  Called as soon as the Friends page mounts.
        //  Payload: { userId }  (the user's MongoDB _id string)
        //  Allows the server to route inbound DMs to this socket.
        // --------------------------------------------------------
        socket.on("dm:register", ({ userId }) => {
            if (!userId) return;
            socket.data.dmUserId = userId;
            dmUserMap.set(userId, socket.id);
            console.log(`[DM] Registered ${userId} → ${socket.id}`);
        });

        // --------------------------------------------------------
        //  dm:join
        //  Called when the user opens a chat with a friend.
        //  Payload: { myId, friendId }  (both MongoDB _id strings)
        //  Both clients compute the SAME sorted room name.
        // --------------------------------------------------------
        socket.on("dm:join", ({ myId, friendId }) => {
            if (!myId || !friendId) return;
            const room = dmRoom(myId, friendId);
            socket.join(room);
            // Store so we can clean up on disconnect
            socket.data.dmUserId = myId;
            dmUserMap.set(myId, socket.id);
            console.log(`[DM] ${myId} joined room ${room}`);
        });

        // --------------------------------------------------------
        //  dm:send
        //  Payload: { myId, friendId, text }
        //  Saves message to DB → emits dm:receive to the private room.
        // --------------------------------------------------------
        socket.on("dm:send", async ({ myId, friendId, text }) => {
            if (!myId || !friendId || !text?.trim()) return;

            const room = dmRoom(myId, friendId);
            const trimmed = text.trim().slice(0, 500);

            try {
                const msg = await Message.create({
                    participants: [myId, friendId].sort(),
                    sender: myId,
                    text: trimmed,
                });

                io.to(room).emit("dm:receive", {
                    _id: msg._id,
                    sender: myId,
                    text: msg.text,
                    createdAt: msg.createdAt,
                });

                console.log(`[DM] ${myId} → ${friendId}: "${trimmed.slice(0, 40)}"`);
            } catch (err) {
                console.error("[DM] dm:send error:", err);
                socket.emit("dm:error", { error: "Message could not be saved" });
            }
        });

        // --------------------------------------------------------
        //  sendRoomInvite
        //  { toUsername, roomCode }
        //  Finds the target socket (if online) and forwards the invite.
        // --------------------------------------------------------
        socket.on("sendRoomInvite", ({ toUsername, roomCode }) => {
            if (!toUsername || !roomCode) return;
            const fromName = socket.data.playerName || "Someone";

            // Search all connected sockets for one with matching playerName
            // (same socket.data.playerName set on joinRoom)
            const allSockets = io.sockets.sockets;
            let delivered = false;
            for (const [, s] of allSockets) {
                if (s.data.playerName?.toLowerCase() === toUsername.toLowerCase() && s.id !== socket.id) {
                    s.emit("roomInvite", { fromName, roomCode });
                    delivered = true;
                    break;
                }
            }
            console.log(`[Invite] ${fromName} → ${toUsername}: room ${roomCode} — delivered: ${delivered}`);
        });

        // --------------------------------------------------------
        //  joinRoom
        //  Client sends: { roomId, playerName }
        //  Server responds: roomJoined | roomFull | roomError
        // --------------------------------------------------------
        socket.on("joinRoom", async ({ roomId, playerName }) => {
            try {
                // Create room if it doesn't exist yet
                if (!rooms[roomId]) {
                    rooms[roomId] = createRoom(roomId);
                    console.log(`[Room ${roomId}] Created`);
                }

                const room = rooms[roomId];

                // Start ranking interval if not active
                if (!room.rankInterval) {
                    room.rankInterval = setInterval(() => {
                        if (room.gameState !== "playing") return;

                        // Sort players by Z (most negative is furthest ahead)
                        const sorted = Object.values(room.players)
                            .filter(p => !p.finished && !p.eliminated)
                            .sort((a, b) => a.position.z - b.position.z);

                        sorted.forEach((p, index) => {
                            const rank = index + 1;
                            if (rank >= 4) {
                                p.wasBehind = true;
                            }
                        });
                    }, 5000);
                }

                // Reject if room is full
                if (playerCount(room) >= MAX_PLAYERS_PER_ROOM) {
                    socket.emit("roomFull", { message: "Room is full (max 5 players)" });
                    return;
                }

                // Reject if game already in progress
                if (room.gameState !== "waiting") {
                    socket.emit("roomError", { message: "Game already in progress" });
                    return;
                }

                // Join the Socket.io room (for broadcasting)
                socket.join(roomId);

                // Add player to room state
                let initialLevel = 1;
                try {
                    const user = await User.findOne({ username: playerName });
                    if (user) initialLevel = user.level || 1;
                } catch (err) {
                    console.error("[joinRoom] Error fetching player level:", err);
                }

                room.players[socket.id] = {
                    id: socket.id,
                    name: playerName || `Player_${socket.id.slice(0, 5)}`,
                    level: initialLevel,
                    position: { x: 0, y: 1, z: 0 },   // spawn position
                    rotation: { y: 0 },
                    world: 0,          // starts in hub (world 0)
                    finished: false,
                    eliminated: false,
                    finishTime: null,
                    ready: false,      // for the "ready" lobby mechanic
                    fellThisRace: false, // for Untouchable Run achievement
                    wasBehind: false,    // for Comeback King achievement
                };

                console.log(
                    `[Room ${roomId}] ${room.players[socket.id].name} joined (${playerCount(room)}/${MAX_PLAYERS_PER_ROOM})`
                );

                // Tell the joining player they're in, send them full room state
                socket.emit("roomJoined", {
                    roomId,
                    playerId: socket.id,
                    players: getPlayerList(room),
                    chatHistory: room.chatMessages,
                });

                // Tell everyone else a new player arrived
                socket.to(roomId).emit("playerJoined", {
                    player: room.players[socket.id],
                    players: getPlayerList(room),
                });

                // Store roomId + playerName on socket for cleanup & invite lookup
                socket.data.roomId = roomId;
                socket.data.playerName = playerName;

            } catch (err) {
                console.error("[joinRoom error]", err);
                socket.emit("roomError", { message: "Server error joining room" });
            }
        });

        // --------------------------------------------------------
        //  leaveRoom  ← NEW
        //  Client emits this when they click "Back" in the Lobby.
        //  Does exactly what disconnect does for that room, but
        //  keeps the socket alive so the player can rejoin later.
        // --------------------------------------------------------
        socket.on("leaveRoom", (data) => {
            const roomId = data?.roomId || socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];

            if (player) {
                console.log(`[Room ${roomId}] ${player.name} left voluntarily`);

                // Remove from the Socket.io room (stops receiving broadcasts)
                socket.leave(roomId);

                // Notify remaining players
                delete room.players[socket.id];
                io.to(roomId).emit("playerLeft", {
                    playerId: socket.id,
                    playerName: player.name,
                    players: getPlayerList(room),
                });
            }

            // Clear roomId from socket data so accidental re-triggers don't fire
            socket.data.roomId = null;

            // If countdown/lobby was running and not enough players, cancel it
            if ((room.gameState === "lobby" || room.gameState === "countdown") && playerCount(room) < 1) {
                room.gameState = "waiting";
                if (room.lobbyInterval) { clearInterval(room.lobbyInterval); room.lobbyInterval = null; }
                Object.values(room.players).forEach((p) => (p.ready = false));
                io.to(roomId).emit("countdownCancelled", { reason: "Not enough players" });
            }

            // If the remaining players are no longer all-ready, reset ready states
            if (room.gameState === "waiting" && playerCount(room) > 0) {
                Object.values(room.players).forEach((p) => (p.ready = false));
                io.to(roomId).emit("playersUpdated", { players: getPlayerList(room) });
            }

            // Clean up empty rooms
            if (playerCount(room) === 0) {
                if (room.windInterval) clearInterval(room.windInterval);
                if (room.cannonIntervals) room.cannonIntervals.forEach(i => clearInterval(i));
                if (room.avalancheInterval) clearInterval(room.avalancheInterval);
                if (room.lobbyInterval) clearInterval(room.lobbyInterval);
                if (room.rankInterval) clearInterval(room.rankInterval);
                delete rooms[roomId];
                console.log(`[Room ${roomId}] Deleted (empty after voluntary leave)`);
            }
        });

        // --------------------------------------------------------
        //  playAgain  ← NEW
        //  Fired from the Winner Screen. Resets the player for rematch.
        // --------------------------------------------------------
        socket.on("playAgain", () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player) return;

            // 1. Reset specific player state
            player.ready = false;
            player.finished = false;
            player.finishTime = null;
            player.eliminated = false;
            player.fellThisRace = false;

            // 2. Room-level Reset: if first person to ask for rematch
            if (room.gameState === "finished") {
                room.gameState = "waiting";
                room.finishedOrder = [];
                room.startTime = null;
                room.selectedMap = null;
                // Stop any leftover intervals
                if (room.windInterval) clearInterval(room.windInterval);
                if (room.cannonIntervals) room.cannonIntervals.forEach(i => clearInterval(i));
                if (room.avalancheInterval) clearInterval(room.avalancheInterval);
                if (room.lobbyInterval) clearInterval(room.lobbyInterval);
            }

            // 3. Emit rematchAccepted ONLY to this player
            io.to(socket.id).emit("rematchAccepted");

            // 4. Update everyone (so player list reflects not-ready status)
            io.to(roomId).emit("playersUpdated", { players: getPlayerList(room) });

            console.log(`[Room ${roomId}] ${player.name} requested rematch`);
        });

        // --------------------------------------------------------
        //  playerReady
        //  Client sends: {} (no payload needed)
        //  Toggles the player's ready state.
        //  If all players are ready (and ≥ 2), starts countdown.
        // --------------------------------------------------------
        socket.on("playerReady", () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player) return;

            // Toggle ready state
            player.ready = !player.ready;
            io.to(roomId).emit("playersUpdated", { players: getPlayerList(room) });

            // Check if ALL players (min 2) are ready
            const allPlayers = Object.values(room.players);
            const allReady = allPlayers.length >= 2 && allPlayers.every((p) => p.ready);

            if (allReady && room.gameState === "waiting") {
                room.gameState = "lobby";  // 3D lobby phase

                // Pick map NOW so we can show it during countdown
                // Weighted random map — prioritize cryovoid & honeycomb for demos
                const MAP_WEIGHTS = {
                    "cryovoid": 3,      // 3x more likely
                    "honeycomb": 3,     // 3x more likely
                    "frozenfrenzy": 1,
                    "lavahell": 1,
                    "neonparadox": 1
                };
                
                const availableMaps = Object.keys(MAP_WEIGHTS).filter(m => m !== room.lastMap);
                const weightedPool = [];
                availableMaps.forEach(map => {
                    for (let i = 0; i < MAP_WEIGHTS[map]; i++) {
                        weightedPool.push(map);
                    }
                });
                
                room.selectedMap = weightedPool[Math.floor(Math.random() * weightedPool.length)];
                room.lastMap = room.selectedMap;

                console.log(`[Room ${roomId}] All ready – entering 3D lobby. Map pre-selected: ${room.selectedMap}`);

                // Tell all clients: go to the 3D lobby page immediately
                io.to(roomId).emit("allReadyMoveToLobby", { map: room.selectedMap });

                // Start 15-second server-side countdown
                let timeLeft = LOBBY_COUNTDOWN_SECONDS;

                // Clear any stale interval
                if (room.lobbyInterval) clearInterval(room.lobbyInterval);

                // Emit first tick immediately
                io.to(roomId).emit("lobbyCountdown", { timeLeft });

                room.lobbyInterval = setInterval(() => {
                    timeLeft -= 1;
                    io.to(roomId).emit("lobbyCountdown", { timeLeft });

                    if (timeLeft <= 0) {
                        clearInterval(room.lobbyInterval);
                        room.lobbyInterval = null;

                        // Start the game
                        room.gameState = "playing";
                        room.startTime = Date.now();
                        room.gameStartedAt = Date.now();

                        console.log(`[Room ${roomId}] Lobby countdown done – starting map: ${room.selectedMap}`);

                        // Create a Game record in MongoDB now the map is starting
                        Game.create({
                            roomId,
                            map: room.selectedMap,
                            status: "in_progress",
                            startedAt: new Date(),
                            players: Object.values(room.players).map(p => ({ socketId: p.id, username: p.name })),
                        }).catch(err => console.error("[Game.create]", err));


                        io.to(roomId).emit("startGame", {
                            map: room.selectedMap,
                            startTime: room.startTime,
                            players: getPlayerList(room),
                        });

                        // Start wind for FrozenFrenzy / Wind Tunnel
                        startWindBroadcast(io, roomId, room);

                        // Start snow cannons for FrozenFrenzy
                        if (room.selectedMap === 'frozenfrenzy') {
                            startCannonFiring(io, roomId, room);
                        }
                    }
                }, 1000);
            }
        });

        // --------------------------------------------------------
        //  move
        //  Client sends: { position: {x,y,z}, rotation: {y}, world }
        //  Server broadcasts delta to everyone else in the room.
        //  Throttling is handled client-side (emit every 50ms).
        // --------------------------------------------------------
        socket.on("move", ({ position, rotation, world }) => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player || player.eliminated || player.finished) return;

            // Update server state
            player.position = position;
            player.rotation = rotation;
            player.world = world;

            // ── Avalanche Checkpoint: first player to reach Phase 4 (Ice Slide entry) ──
            // Z < -220 = start of Ice Slide / Frozen Frenzy Arena Phase 4
            if (
                room.gameState === 'playing' &&
                !room.avalancheActive &&
                position && position.z < -220
            ) {
                startAvalanche(io, roomId, room);
            }

            // Broadcast to everyone EXCEPT the sender
            socket.to(roomId).emit("playerMoved", {
                playerId: socket.id,
                position,
                rotation,
                world,
            });
        });

        // --------------------------------------------------------
        //  worldTransition
        //  Fired when a player hits the portal and moves to World 2.
        //  Client sends: { newWorld: 2 }
        // --------------------------------------------------------
        socket.on("worldTransition", ({ newWorld }) => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player) return;

            player.world = newWorld;

            // Tell all clients so they can hide/show this player in the right scene
            io.to(roomId).emit("playerWorldChanged", {
                playerId: socket.id,
                newWorld,
            });

            console.log(`[Room ${roomId}] ${player.name} moved to World ${newWorld}`);
        });

        // --------------------------------------------------------
        //  playerFinished
        //  Fired when a player crosses the final portal in World 2.
        //  Client sends: {} (no payload needed)
        // --------------------------------------------------------
        socket.on("playerFinished", async () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player || player.finished || player.eliminated) return;

            // Record finish
            player.finished = true;
            player.finishTime = Date.now() - room.startTime; // ms since game start
            room.finishedOrder.push(socket.id);

            const finishPosition = room.finishedOrder.length; // 1st, 2nd, 3rd…

            console.log(
                `[Room ${roomId}] ${player.name} finished in position #${finishPosition} ` +
                `(${(player.finishTime / 1000).toFixed(2)}s)`
            );

            // Tell the finisher their placement
            socket.emit("yourFinishResult", {
                position: finishPosition,
                finishTime: player.finishTime,
            });

            // Tell everyone else
            io.to(roomId).emit("playerFinishedRace", {
                playerId: socket.id,
                playerName: player.name,
                position: finishPosition,
                finishTime: player.finishTime,
                finishedOrder: room.finishedOrder,
            });

            // Check if all non-eliminated players have finished OR if half the room has finished
            const totalPlayersCount = Object.keys(room.players).length;
            const finishedCount = room.finishedOrder.length;
            const requiredToFinish = Math.max(1, Math.ceil(totalPlayersCount / 2));

            const activePlayers = Object.values(room.players).filter(p => !p.eliminated);
            const allFinished = activePlayers.every(p => p.finished) || (totalPlayersCount > 1 && finishedCount >= requiredToFinish);

            if (allFinished) {
                room.gameState = "finished";
                console.log(`[Room ${roomId}] All players finished!`);

                // Distribute trophies and show match results
                await distributeTrophies(io, roomId, room);
                // Save to DB
                await saveGameRecord(roomId, room);

                // ---- Achievements for each finisher ----
                for (let i = 0; i < room.finishedOrder.length; i++) {
                    const sid = room.finishedOrder[i];
                    const p = room.players[sid];
                    if (!p) continue;
                    const place = i + 1;

                    // raceFinisher
                    const rf = await updateAchievement(p.name, 'raceFinisher', 1);
                    if (rf) io.to(sid).emit('achievementUnlocked', rf);

                    // podiumChampion (top 3)
                    if (place <= 3) {
                        const pc = await updateAchievement(p.name, 'podiumChampion', 1);
                        if (pc) io.to(sid).emit('achievementUnlocked', pc);
                    }

                    // speedDemon (1st place)
                    if (place === 1) {
                        const sd = await updateAchievement(p.name, 'speedDemon', 1);
                        if (sd) io.to(sid).emit('achievementUnlocked', sd);

                        // comebackKing (Won after being behind)
                        if (p.wasBehind) {
                            const ck = await updateAchievement(p.name, 'comebackKing', 1);
                            if (ck) io.to(sid).emit('achievementUnlocked', ck);
                        }
                    }

                    // untouchableRun (Finished race without falling)
                    if (!p.fellThisRace) {
                        const ur = await updateAchievement(p.name, 'untouchableRun', 1);
                        if (ur) io.to(sid).emit('achievementUnlocked', ur);
                    }
                }

                // User choice handled in MatchResultsOverlay
            }
        });

        // --------------------------------------------------------
        //  playerFell
        //  Fired when a player falls off an obstacle and needs reset.
        //  Client sends: {} — server broadcasts so others can see it.
        // --------------------------------------------------------
        socket.on("playerFell", () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const player = rooms[roomId].players[socket.id];
            if (player) player.fellThisRace = true;

            socket.to(roomId).emit("playerRespawned", { playerId: socket.id });
        });

        // --------------------------------------------------------
        //  playerEliminated
        //  Fired when client falls into Honeycomb lava (permanent).
        //  Client sends: {} — server marks them eliminated.
        // --------------------------------------------------------
        socket.on("playerEliminated", async () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player || player.eliminated || player.finished) return;

            player.eliminated = true;
            console.log(`[Room ${roomId}] ${player.name} eliminated (lava)`);

            // Tell everyone
            io.to(roomId).emit("playerEliminated", { eliminatedId: socket.id });

            // Check if only one player remains (winner)
            const activePlayers = Object.values(room.players).filter(
                (p) => !p.finished && !p.eliminated
            );

            if (activePlayers.length === 1) {
                // Last player standing wins
                const winner = activePlayers[0];
                winner.finished = true;
                winner.finishTime = Date.now() - room.startTime;
                room.finishedOrder.push(winner.id);
                room.gameState = "finished";

                io.to(roomId).emit("playerFinishedRace", {
                    playerId: winner.id,
                    playerName: winner.name,
                    position: room.finishedOrder.length,
                    finishTime: winner.finishTime,
                    finishedOrder: room.finishedOrder,
                });

                console.log(`[Room ${roomId}] ${winner.name} wins (last player standing)!`);

                // Distribute trophies and show match results
                await distributeTrophies(io, roomId, room);

                // User choice handled in MatchResultsOverlay
            } else if (activePlayers.length === 0) {
                // All eliminated
                room.gameState = "finished";
                console.log(`[Room ${roomId}] All players eliminated!`);

                // Distribute trophies (all get 0)
                await distributeTrophies(io, roomId, room);

                // User choice handled in MatchResultsOverlay
            }
        });

        // --------------------------------------------------------
        //  chatMessage  (Waiting Room Chat)
        //  Client sends: { text }
        //  Server broadcasts to entire room including sender.
        // --------------------------------------------------------
        socket.on("chatMessage", ({ text }) => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;
            if (!text || typeof text !== "string" || text.trim().length === 0) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player) return;

            const message = {
                senderId: socket.id,
                sender: player.name,
                text: text.trim().slice(0, 300), // cap message length
                timestamp: Date.now(),
            };

            // Persist in room history (last 100 messages)
            room.chatMessages.push(message);
            if (room.chatMessages.length > 100) room.chatMessages.shift();

            // Broadcast to ALL players in room (including sender for confirmation)
            io.to(roomId).emit("chatUpdate", { message });
        });

        // --------------------------------------------------------
        //  leaderboardUpdate
        //  Called by Member 3's leaderboard controller after saving scores.
        //  We re-broadcast updated leaderboard to the room.
        //  Client sends: { leaderboard: [...] }
        // --------------------------------------------------------
        socket.on("leaderboardUpdate", ({ leaderboard }) => {
            const roomId = socket.data.roomId;
            if (!roomId) return;

            io.to(roomId).emit("leaderboardUpdate", { leaderboard });
        });

        // --------------------------------------------------------
        //  achievementEvent
        //  Client sends: { type, value }
        //  For client-tracked stats: jumps, laserDodges, slideDistance,
        //  flawlessFinish, comebackWin
        // --------------------------------------------------------
        socket.on("achievementEvent", async ({ type, value }) => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;
            const player = rooms[roomId].players[socket.id];
            if (!player) return;

            // Map client event types to achievement keys
            const typeMap = {
                jump: 'jumpMaster',
                laserDodge: 'laserDodger',
                slideDistance: 'unstoppableMomentum',
                flawlessFinish: 'untouchableRun',
                comebackWin: 'comebackKing',
                survive: 'survivorSpirit',
            };

            const achKey = typeMap[type];
            if (!achKey) return;

            const increment = value || 1;
            const unlock = await updateAchievement(player.name, achKey, increment);
            if (unlock) {
                socket.emit('achievementUnlocked', unlock);
            }
        });

        // --------------------------------------------------------
        //  disconnect
        //  Automatically fired when a player closes tab / loses connection.
        // --------------------------------------------------------
        socket.on("disconnect", () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) {
                console.log(`[Socket] Disconnected (no room): ${socket.id}`);
                return;
            }

            const room = rooms[roomId];
            const player = room.players[socket.id];

            if (player) {
                console.log(`[Room ${roomId}] ${player.name} disconnected`);

                // Notify remaining players with player name
                io.to(roomId).emit("playerLeft", {
                    playerId: socket.id,
                    playerName: player.name,
                    players: getPlayerList(room),
                });
            }

            // Remove player from room
            delete room.players[socket.id];

            // If game is in lobby/countdown phase and a player leaves, reset
            if ((room.gameState === "lobby" || room.gameState === "countdown") && playerCount(room) < 1) {
                room.gameState = "waiting";
                if (room.lobbyInterval) { clearInterval(room.lobbyInterval); room.lobbyInterval = null; }
                Object.values(room.players).forEach((p) => (p.ready = false));
                io.to(roomId).emit("countdownCancelled", { reason: "Not enough players" });
            }

            // Clean up empty rooms to save memory
            if (playerCount(room) === 0) {
                if (room.windInterval) clearInterval(room.windInterval);
                if (room.cannonIntervals) room.cannonIntervals.forEach(i => clearInterval(i));
                if (room.avalancheInterval) clearInterval(room.avalancheInterval);
                if (room.lobbyInterval) clearInterval(room.lobbyInterval);
                delete rooms[roomId];
                console.log(`[Room ${roomId}] Deleted (empty)`);
            }
        });

        // ---- DM cleanup on disconnect ----
        socket.on("disconnect", () => {
            if (socket.data.dmUserId) {
                // Only delete from map if this socket is still the current one
                // (user may have re-connected on another tab)
                if (dmUserMap.get(socket.data.dmUserId) === socket.id) {
                    dmUserMap.delete(socket.data.dmUserId);
                    console.log(`[DM] Unregistered ${socket.data.dmUserId}`);
                }
            }
        });

    }); // end io.on("connection")

    // Return rooms so admin controller can read live state
    return { rooms };

} // end registerGameSocket
