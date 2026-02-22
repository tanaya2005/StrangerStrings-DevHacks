// ============================================================
//  socket/relayLogic.js — Multiversal Relay server-side logic
//  3v3 team relay race: 3 sequential maps, one runner per team
//  at a time. When a runner finishes a map, the next teammate
//  takes over. First team to complete all 3 stages wins.
//
//  Trophy distribution: +50 to all 3 winning players via MongoDB.
// ============================================================

import User from "../models/User.js";

/**
 * In-memory Relay room store.
 * relayRooms = {
 *   [roomId]: {
 *     players: { [socketId]: { id, name, team, username } },
 *     redTeam: [socketId, ...],   // ordered — index = relay leg assignment
 *     blueTeam: [socketId, ...],
 *     phase: "lobby" | "countdown" | "playing" | "victory" | "finished",
 *     currentStage: 1 | 2 | 3,
 *     redStage: 1,   // which stage Red team is on (1, 2, or 3)
 *     blueStage: 1,  // which stage Blue team is on
 *     redActiveRunner: 0,  // index into redTeam for current runner
 *     blueActiveRunner: 0, // index into blueTeam
 *     stageMap: { 1: "mapId", 2: "mapId", 3: "mapId" },
 *     host: socketId,
 *     chatMessages: [],
 *     winningTeam: null,
 *     winnersData: [],
 *     startTime: null,
 *   }
 * }
 */
const relayRooms = {};

// ---- Constants ----
const RELAY_TROPHY_REWARD = 50;
// Fixed 3-map rotation for relay: Lava Hell → Neon Paradox → Frozen Frenzy
const RELAY_MAPS = ["lavahell", "neonparadox", "frozenfrenzy"];
const MAP_LABELS = {
    frozenfrenzy: "🌨️ Frozen Frenzy",
    lavahell: "🔥 Lava Hell",
    neonparadox: "🔮 Neon Paradox",
};

// Map each map id → the R3F world number used by the client
const MAP_WORLD_NUM = {
    frozenfrenzy: 7,
    lavahell: 5,
    neonparadox: 1,
};

// ---- Helpers ----

function createRelayRoom(roomId, hostSocketId) {
    // Fixed map order: Stage 1 = Lava Hell, Stage 2 = Neon Paradox, Stage 3 = Frozen Frenzy
    const stageMap = {
        1: RELAY_MAPS[0],
        2: RELAY_MAPS[1],
        3: RELAY_MAPS[2],
    };

    return {
        players: {},
        redTeam: [],
        blueTeam: [],
        phase: "lobby",
        currentStage: 1,
        redStage: 1,
        blueStage: 1,
        redActiveRunner: 0,
        blueActiveRunner: 0,
        stageMap,
        host: hostSocketId,
        chatMessages: [],
        winningTeam: null,
        winnersData: [],
        startTime: null,
    };
}

/** Get team color from arrays */
function getPlayerTeam(room, socketId) {
    if (room.redTeam.includes(socketId)) return "red";
    if (room.blueTeam.includes(socketId)) return "blue";
    return null;
}

/** Get team lists with player info */
function getTeamLists(room) {
    const makeList = (ids) => ids.map(sid => {
        const p = room.players[sid];
        return p ? { id: p.id, name: p.name, avatar: p.avatar, isHost: sid === room.host } : null;
    }).filter(Boolean);

    return {
        redTeam: makeList(room.redTeam),
        blueTeam: makeList(room.blueTeam),
    };
}

/** Get current relay state for all clients */
function getRelayState(room) {
    return {
        phase: room.phase,
        redStage: room.redStage,
        blueStage: room.blueStage,
        redActiveRunner: room.redTeam[room.redActiveRunner] || null,
        blueActiveRunner: room.blueTeam[room.blueActiveRunner] || null,
        stageMap: room.stageMap,
        currentMap: room.stageMap[Math.max(room.redStage, room.blueStage)] || room.stageMap[1],
        startTime: room.startTime,
    };
}

/**
 * Award +50 trophies to all winning team members via MongoDB.
 */
async function distributeRelayTrophies(io, roomId, room) {
    const winnerSids = room.winningTeam === "red" ? room.redTeam : room.blueTeam;
    const winnersData = [];

    for (const sid of winnerSids) {
        const player = room.players[sid];
        if (!player) continue;

        try {
            const updatedUser = await User.findOneAndUpdate(
                { username: player.name },
                {
                    $inc: {
                        trophies: RELAY_TROPHY_REWARD,
                        gamesPlayed: 1,
                        wins: 1,
                    },
                },
                { new: true }
            );

            winnersData.push({
                socketId: sid,
                username: player.name,
                trophiesEarned: RELAY_TROPHY_REWARD,
                totalTrophies: updatedUser?.trophies || 0,
            });

            console.log(
                `[Relay] ${player.name} awarded +${RELAY_TROPHY_REWARD} trophies (total: ${updatedUser?.trophies || "?"})`
            );
        } catch (err) {
            console.error(`[Relay] Error awarding trophies to ${player.name}:`, err);
            winnersData.push({
                socketId: sid,
                username: player.name,
                trophiesEarned: RELAY_TROPHY_REWARD,
                totalTrophies: 0,
            });
        }
    }

    // Increment gamesPlayed for losing team
    const loserSids = room.winningTeam === "red" ? room.blueTeam : room.redTeam;
    for (const sid of loserSids) {
        const player = room.players[sid];
        if (!player) continue;
        try {
            await User.findOneAndUpdate(
                { username: player.name },
                { $inc: { gamesPlayed: 1 } }
            );
        } catch (err) {
            console.error(`[Relay] Error updating loser ${player.name}:`, err);
        }
    }

    room.winnersData = winnersData;
    return winnersData;
}

// ============================================================
//  Main export — registerRelaySocket(io)
// ============================================================
export function registerRelaySocket(io) {

    io.on("connection", (socket) => {

        // ── Join Relay Room ──
        socket.on("relay:joinRoom", ({ roomId, playerName, avatar }) => {
            if (!roomId || !playerName) return;

            // Create room if needed
            if (!relayRooms[roomId]) {
                relayRooms[roomId] = createRelayRoom(roomId, socket.id);
                console.log(`[Relay] Room ${roomId} created by ${playerName}`);
            }

            const room = relayRooms[roomId];

            // Reject if game in progress
            if (room.phase !== "lobby") {
                socket.emit("relay:error", { message: "Game already in progress" });
                return;
            }

            // Guard: re-join without duplication
            if (room.players[socket.id]) {
                const { redTeam, blueTeam } = getTeamLists(room);
                socket.emit("relay:roomJoined", {
                    roomId,
                    playerId: socket.id,
                    redTeam,
                    blueTeam,
                    isHost: socket.id === room.host,
                    chatHistory: room.chatMessages,
                });
                return;
            }

            // Reject if already 6 players (3v3)
            if (Object.keys(room.players).length >= 6) {
                socket.emit("relay:error", { message: "Room is full (max 6 for 3v3)" });
                return;
            }

            // Add player
            socket.join(`relay:${roomId}`);
            room.players[socket.id] = {
                id: socket.id,
                name: playerName,
                avatar: avatar || "/models/penguin/scene.gltf",
                team: null,
                username: playerName,
            };
            socket.data.relayRoom = roomId;
            socket.data.playerName = playerName;

            const { redTeam, blueTeam } = getTeamLists(room);

            socket.emit("relay:roomJoined", {
                roomId,
                playerId: socket.id,
                redTeam,
                blueTeam,
                isHost: socket.id === room.host,
                chatHistory: room.chatMessages,
            });

            io.to(`relay:${roomId}`).emit("relay:teamsUpdated", { redTeam, blueTeam });

            console.log(`[Relay] ${playerName} joined room ${roomId} (${Object.keys(room.players).length} players)`);
        });

        // ── Join Team ──
        socket.on("relay:joinTeam", ({ team }) => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const room = relayRooms[roomId];
            if (room.phase !== "lobby") return;

            // Remove from current team
            room.redTeam = room.redTeam.filter(id => id !== socket.id);
            room.blueTeam = room.blueTeam.filter(id => id !== socket.id);

            // Enforce 3-per-team limit
            if (team === "red" && room.redTeam.length >= 3) {
                socket.emit("relay:error", { message: "Red team is full (max 3)" });
                return;
            }
            if (team === "blue" && room.blueTeam.length >= 3) {
                socket.emit("relay:error", { message: "Blue team is full (max 3)" });
                return;
            }

            // Add to new team
            if (team === "red") {
                room.redTeam.push(socket.id);
            } else if (team === "blue") {
                room.blueTeam.push(socket.id);
            }

            if (room.players[socket.id]) {
                room.players[socket.id].team = team;
            }

            const { redTeam, blueTeam } = getTeamLists(room);
            io.to(`relay:${roomId}`).emit("relay:teamsUpdated", { redTeam, blueTeam });
        });

        // ── Chat ──
        socket.on("relay:chatMessage", ({ text }) => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            if (!text?.trim()) return;

            const room = relayRooms[roomId];
            const message = {
                sender: socket.data.playerName || "???",
                text: text.trim().slice(0, 300),
                timestamp: Date.now(),
            };
            room.chatMessages.push(message);
            if (room.chatMessages.length > 100) room.chatMessages.shift();

            io.to(`relay:${roomId}`).emit("relay:chatUpdate", { message });
        });

        // ── Start Game (host only) ── Requires 3v3
        socket.on("relay:startGame", () => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const room = relayRooms[roomId];

            if (socket.id !== room.host) {
                socket.emit("relay:error", { message: "Only the host can start" });
                return;
            }

            if (room.redTeam.length < 1 || room.blueTeam.length < 1) {
                socket.emit("relay:error", { message: "Need at least 1 player on each team" });
                return;
            }

            console.log(
                `[Relay] Room ${roomId} starting! Red ${room.redTeam.length} vs Blue ${room.blueTeam.length}`
            );
            console.log(`[Relay] Stage maps: 1=${room.stageMap[1]}, 2=${room.stageMap[2]}, 3=${room.stageMap[3]}`);

            // Transition to game
            room.phase = "playing";
            room.startTime = Date.now();
            room.redStage = 1;
            room.blueStage = 1;
            room.redActiveRunner = 0;
            room.blueActiveRunner = 0;
            room.winningTeam = null;

            io.to(`relay:${roomId}`).emit("relay:gameStarting", {
                stageMap: room.stageMap,
                redActiveRunner: room.redTeam[0],
                blueActiveRunner: room.blueTeam[0],
                redTeam: room.redTeam,
                blueTeam: room.blueTeam,
                redStage: 1,
                blueStage: 1,
            });
        });

        // ── Relay Stage Complete ──
        // When an active runner crosses the finish line of their current map stage
        socket.on("relay:relayStageComplete", async () => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const room = relayRooms[roomId];
            if (room.phase !== "playing") return;

            const team = getPlayerTeam(room, socket.id);
            if (!team) return;

            const isRedRunner = team === "red" && room.redTeam[room.redActiveRunner] === socket.id;
            const isBlueRunner = team === "blue" && room.blueTeam[room.blueActiveRunner] === socket.id;

            if (!isRedRunner && !isBlueRunner) return; // Not the active runner

            const playerName = room.players[socket.id]?.name || "???";

            if (team === "red") {
                console.log(`[Relay] Red runner ${playerName} completed stage ${room.redStage}`);

                if (room.redStage >= 3) {
                    // RED WINS!
                    room.winningTeam = "red";
                    room.phase = "victory";
                    console.log(`[Relay] 🏆 RED TEAM WINS room ${roomId}!`);

                    const winnersData = await distributeRelayTrophies(io, roomId, room);

                    io.to(`relay:${roomId}`).emit("showVictoryScreen", {
                        winningTeamColor: "red",
                        winnersData,
                        trophyReward: RELAY_TROPHY_REWARD,
                    });
                    return;
                }

                // Advance to next stage + next runner
                room.redStage++;
                room.redActiveRunner = (room.redActiveRunner + 1) % room.redTeam.length;

                io.to(`relay:${roomId}`).emit("relay:relayUpdate", {
                    team: "red",
                    completedBy: playerName,
                    newStage: room.redStage,
                    newActiveRunner: room.redTeam[room.redActiveRunner],
                    redStage: room.redStage,
                    blueStage: room.blueStage,
                    stageMap: room.stageMap,
                });
            } else {
                console.log(`[Relay] Blue runner ${playerName} completed stage ${room.blueStage}`);

                if (room.blueStage >= 3) {
                    // BLUE WINS!
                    room.winningTeam = "blue";
                    room.phase = "victory";
                    console.log(`[Relay] 🏆 BLUE TEAM WINS room ${roomId}!`);

                    const winnersData = await distributeRelayTrophies(io, roomId, room);

                    io.to(`relay:${roomId}`).emit("showVictoryScreen", {
                        winningTeamColor: "blue",
                        winnersData,
                        trophyReward: RELAY_TROPHY_REWARD,
                    });
                    return;
                }

                // Advance
                room.blueStage++;
                room.blueActiveRunner = (room.blueActiveRunner + 1) % room.blueTeam.length;

                io.to(`relay:${roomId}`).emit("relay:relayUpdate", {
                    team: "blue",
                    completedBy: playerName,
                    newStage: room.blueStage,
                    newActiveRunner: room.blueTeam[room.blueActiveRunner],
                    redStage: room.redStage,
                    blueStage: room.blueStage,
                    stageMap: room.stageMap,
                });
            }
        });

        // ── Player Move (relay — broadcast to team room) ──
        socket.on("relay:move", ({ position, rotation, world }) => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const room = relayRooms[roomId];
            const p = room.players[socket.id];

            socket.to(`relay:${roomId}`).emit("relay:playerMoved", {
                playerId: socket.id,
                position,
                rotation,
                world,
                avatar: p?.avatar || "/models/penguin/scene.gltf",
            });
        });

        // ── Return to lobby after victory ──
        socket.on("relay:returnToLobby", () => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const room = relayRooms[roomId];

            // Reset room to lobby state
            room.phase = "lobby";
            room.winningTeam = null;
            room.winnersData = [];
            room.redStage = 1;
            room.blueStage = 1;
            room.redActiveRunner = 0;
            room.blueActiveRunner = 0;
            room.startTime = null;

            // Re-pick maps (fixed order)
            room.stageMap = { 1: RELAY_MAPS[0], 2: RELAY_MAPS[1], 3: RELAY_MAPS[2] };
        });

        // ── Leave Room ──
        socket.on("relay:leaveRoom", () => {
            handleRelayDisconnect(io, socket);
        });

        // ── Request Game State (fired by RelayGame on mount as fallback) ──
        socket.on("relay:requestGameState", () => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const room = relayRooms[roomId];
            if (room.phase !== "playing") return;

            // Re-send current game state to this socket
            socket.emit("relay:gameStarting", {
                stageMap: room.stageMap,
                redActiveRunner: room.redTeam[room.redActiveRunner],
                blueActiveRunner: room.blueTeam[room.blueActiveRunner],
                redTeam: room.redTeam,
                blueTeam: room.blueTeam,
                redStage: room.redStage,
                blueStage: room.blueStage,
            });
            console.log(`[Relay] Re-sent game state to ${socket.id} (room ${roomId})`);
        });

        // ── Cheer (spectator sends emoji to whole room) ──
        socket.on("relay:sendCheer", ({ emoji, team }) => {
            const roomId = socket.data.relayRoom;
            if (!roomId || !relayRooms[roomId]) return;
            const senderName = relayRooms[roomId].players[socket.id]?.name || "?";
            // Broadcast to everyone else in the room
            socket.to(`relay:${roomId}`).emit("relay:cheer", {
                emoji,
                senderName,
                senderTeam: team,
            });
        });

        // ── Disconnect ──
        socket.on("disconnect", () => {
            handleRelayDisconnect(io, socket);
        });
    });

    return { relayRooms };
}

// ---- Disconnect Cleanup ----

function handleRelayDisconnect(io, socket) {
    const roomId = socket.data.relayRoom;
    if (!roomId || !relayRooms[roomId]) return;

    const room = relayRooms[roomId];
    const playerName = room.players[socket.id]?.name || "Unknown";
    const team = getPlayerTeam(room, socket.id);

    // Remove from teams
    const wasRedRunner = team === "red" && room.redTeam[room.redActiveRunner] === socket.id;
    const wasBlueRunner = team === "blue" && room.blueTeam[room.blueActiveRunner] === socket.id;

    room.redTeam = room.redTeam.filter(id => id !== socket.id);
    room.blueTeam = room.blueTeam.filter(id => id !== socket.id);

    // Remove from players
    delete room.players[socket.id];

    socket.leave(`relay:${roomId}`);
    socket.data.relayRoom = null;

    // If room empty, clean up
    if (Object.keys(room.players).length === 0) {
        delete relayRooms[roomId];
        console.log(`[Relay] Room ${roomId} deleted (empty)`);
        return;
    }

    // Transfer host if needed
    if (room.host === socket.id) {
        const remaining = Object.keys(room.players);
        room.host = remaining[0];
        io.to(room.host).emit("relay:youAreHost");
    }

    // If game in progress, ensure active runner indices are still valid
    if (room.phase === "playing") {
        if (team === "red") {
            if (room.redTeam.length > 0) {
                // Adjust index if out of bounds or if we need a new runner because the current one left
                if (room.redActiveRunner >= room.redTeam.length || wasRedRunner) {
                    room.redActiveRunner = room.redActiveRunner % room.redTeam.length;

                    // Broadcast update so teams know the new runner
                    io.to(`relay:${roomId}`).emit("relay:relayUpdate", {
                        team: "red",
                        completedBy: `${playerName} (Disconnected)`,
                        newStage: room.redStage,
                        newActiveRunner: room.redTeam[room.redActiveRunner],
                        redStage: room.redStage,
                        blueStage: room.blueStage,
                        stageMap: room.stageMap,
                    });
                }
            }
        } else if (team === "blue") {
            if (room.blueTeam.length > 0) {
                if (room.blueActiveRunner >= room.blueTeam.length || wasBlueRunner) {
                    room.blueActiveRunner = room.blueActiveRunner % room.blueTeam.length;

                    io.to(`relay:${roomId}`).emit("relay:relayUpdate", {
                        team: "blue",
                        completedBy: `${playerName} (Disconnected)`,
                        newStage: room.blueStage,
                        newActiveRunner: room.blueTeam[room.blueActiveRunner],
                        redStage: room.redStage,
                        blueStage: room.blueStage,
                        stageMap: room.stageMap,
                    });
                }
            }
        }
    }

    const { redTeam, blueTeam } = getTeamLists(room);
    io.to(`relay:${roomId}`).emit("relay:playerLeft", {
        playerName,
        redTeam,
        blueTeam,
    });

    // If game is in progress and a team has no players, cancel
    if (room.phase === "playing" && (room.redTeam.length < 1 || room.blueTeam.length < 1)) {
        room.phase = "lobby";
        io.to(`relay:${roomId}`).emit("relay:gameCancelled", {
            reason: "Not enough players on a team",
        });
    }
}
