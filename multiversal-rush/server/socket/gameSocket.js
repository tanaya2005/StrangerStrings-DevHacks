// ============================================================
//  socket/gameSocket.js — ALL multiplayer game logic lives here
//  Member 2 (Multiplayer / Socket.io)
// ============================================================

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
const COUNTDOWN_SECONDS = 3;       // Countdown before race starts

// ---- Helpers ----

/** Create a blank room object */
function createRoom(roomId) {
    return {
        players: {},
        gameState: "waiting",   // waiting → countdown → playing → finished
        startTime: null,
        finishedOrder: [],       // socket IDs in finish order
        chatMessages: [],        // waiting-room chat history
    };
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
 * After every elimination / finish check, see if only 1 player is left
 * un-eliminated and un-finished → they become the winner.
 */
function checkElimination(io, roomId, room) {
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

        io.to(roomId).emit("gameFinished", {
            finishedOrder: room.finishedOrder,
            eliminatedPlayers: Object.values(room.players)
                .filter((p) => p.eliminated)
                .map((p) => p.id),
        });

        console.log(`[Room ${roomId}] Game finished. Winner: ${winner.name}`);
    }

    // If no active players (all eliminated), end game
    if (activePlayers.length === 0) {
        room.gameState = "finished";
        io.to(roomId).emit("gameFinished", {
            finishedOrder: room.finishedOrder,
            eliminatedPlayers: Object.values(room.players)
                .filter((p) => p.eliminated)
                .map((p) => p.id),
        });
        console.log(`[Room ${roomId}] Game finished. All players eliminated.`);
    }
}

// ============================================================
//  Main export – call this once in server.js
// ============================================================
export function registerGameSocket(io) {

    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        // --------------------------------------------------------
        //  joinRoom
        //  Client sends: { roomId, playerName }
        //  Server responds: roomJoined | roomFull | roomError
        // --------------------------------------------------------
        socket.on("joinRoom", ({ roomId, playerName }) => {
            try {
                // Create room if it doesn't exist yet
                if (!rooms[roomId]) {
                    rooms[roomId] = createRoom(roomId);
                    console.log(`[Room ${roomId}] Created`);
                }

                const room = rooms[roomId];

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
                room.players[socket.id] = {
                    id: socket.id,
                    name: playerName || `Player_${socket.id.slice(0, 5)}`,
                    position: { x: 0, y: 1, z: 0 },   // spawn position
                    rotation: { y: 0 },
                    world: 1,          // starts in World 1
                    finished: false,
                    eliminated: false,
                    finishTime: null,
                    ready: false,      // for the "ready" lobby mechanic
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

                // Store roomId on the socket so we can clean up on disconnect
                socket.data.roomId = roomId;

            } catch (err) {
                console.error("[joinRoom error]", err);
                socket.emit("roomError", { message: "Server error joining room" });
            }
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

            // Toggle ready
            player.ready = !player.ready;

            // Broadcast updated player list so UI shows ready status
            io.to(roomId).emit("playersUpdated", { players: getPlayerList(room) });

            // Check if all players (min 2) are ready
            const allPlayers = Object.values(room.players);
            const allReady = allPlayers.length >= 2 && allPlayers.every((p) => p.ready);

            if (allReady && room.gameState === "waiting") {
                room.gameState = "countdown";

                console.log(`[Room ${roomId}] All ready – countdown starting`);
                io.to(roomId).emit("countdownStarted", { seconds: COUNTDOWN_SECONDS });

                // After countdown – start the game
                setTimeout(() => {
                    room.gameState = "playing";
                    room.startTime = Date.now();

                    io.to(roomId).emit("gameStarted", {
                        startTime: room.startTime,
                        players: getPlayerList(room),
                    });
                    console.log(`[Room ${roomId}] Game started!`);
                }, COUNTDOWN_SECONDS * 1000);
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
        socket.on("playerFinished", () => {
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

            // Trigger elimination check
            checkElimination(io, roomId, room);
        });

        // --------------------------------------------------------
        //  playerFell
        //  Fired when a player falls off an obstacle and needs reset.
        //  Client sends: {} — server broadcasts so others can see it.
        // --------------------------------------------------------
        socket.on("playerFell", () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;
            socket.to(roomId).emit("playerRespawned", { playerId: socket.id });
        });

        // --------------------------------------------------------
        //  playerEliminated
        //  Fired when client falls into Honeycomb lava (permanent).
        //  Client sends: {} — server marks them eliminated.
        // --------------------------------------------------------
        socket.on("playerEliminated", () => {
            const roomId = socket.data.roomId;
            if (!roomId || !rooms[roomId]) return;

            const room = rooms[roomId];
            const player = room.players[socket.id];
            if (!player || player.eliminated || player.finished) return;

            player.eliminated = true;
            console.log(`[Room ${roomId}] ${player.name} eliminated (lava)`);

            // Tell everyone
            io.to(roomId).emit("playerEliminated", { eliminatedId: socket.id });

            // Check if game should end
            checkElimination(io, roomId, room);
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

            // If game is in progress and active players drop too low, handle it
            if (room.gameState === "playing") {
                checkElimination(io, roomId, room);
            }

            // If game is in countdown and falls below 2, cancel countdown
            if (room.gameState === "countdown" && playerCount(room) < 2) {
                room.gameState = "waiting";
                // Reset ready state for remaining players
                Object.values(room.players).forEach((p) => (p.ready = false));
                io.to(roomId).emit("countdownCancelled", {
                    reason: "Not enough players",
                });
            }

            // Clean up empty rooms to save memory
            if (playerCount(room) === 0) {
                delete rooms[roomId];
                console.log(`[Room ${roomId}] Deleted (empty)`);
            }
        });

    }); // end io.on("connection")

} // end registerGameSocket
