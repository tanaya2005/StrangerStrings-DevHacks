// ============================================================
//  store/store.js — Zustand global state
//  Member 2: multiplayer slices
//  Auth: merged (Atharva DB schema + Varun DOB frontend)
//  user shape: { id, username, email, trophies, wins, gamesPlayed }
// ============================================================
import { create } from "zustand";

const useStore = create((set, get) => ({
    // ---- Player identity ----
    playerId: null,         // Our socket.id
    playerName: "",         // Display name chosen on login

    setPlayerName: (name) => set({ playerName: name }),
    setPlayerId: (id) => set({ playerId: id }),

    // ---- Room ----
    roomId: null,
    setRoomId: (id) => set({ roomId: id }),

    // ---- Players (includes self + all others) ----
    // Map of socketId → player object
    players: {},

    setPlayers: (playerList) => {
        const map = {};
        playerList.forEach((p) => (map[p.id] = p));
        set({ players: map });
    },

    updatePlayer: (playerId, data) =>
        set((state) => ({
            players: {
                ...state.players,
                [playerId]: { ...state.players[playerId], ...data },
            },
        })),

    removePlayer: (playerId) =>
        set((state) => {
            const updated = { ...state.players };
            delete updated[playerId];
            return { players: updated };
        }),

    // ---- Game state ----
    // "waiting" | "countdown" | "playing" | "finished"
    gameState: "waiting",
    setGameState: (s) => set({ gameState: s }),

    countdown: 0,
    setCountdown: (n) => set({ countdown: n }),

    startTime: null,
    setStartTime: (t) => set({ startTime: t }),

    // ---- World ----
    currentWorld: 1,         // 1 = Cyberverse, 2 = Lava Hell
    setCurrentWorld: (w) => set({ currentWorld: w }),

    // ---- Self position (what WE broadcast) ----
    myPosition: { x: 0, y: 1, z: 0 },
    myRotation: { y: 0 },

    setMyPosition: (pos) => set({ myPosition: pos }),
    setMyRotation: (rot) => set({ myRotation: rot }),

    // ---- Finish/Leaderboard ----
    finishedOrder: [],        // array of socketIds in finish order
    myFinishResult: null,     // { position, finishTime }

    setFinishedOrder: (order) => set({ finishedOrder: order }),
    setMyFinishResult: (result) => set({ myFinishResult: result }),

    // ---- Chat ----
    chatMessages: [],         // [{ senderId, sender, text, timestamp }]

    addChatMessage: (msg) =>
        set((state) => ({
            chatMessages: [...state.chatMessages, msg].slice(-100), // keep last 100
        })),

    setChatMessages: (msgs) => set({ chatMessages: msgs }),

    // ---- Auth (custom JWT — no Firebase) ----
    // user shape: { id, username, trophies, wins, gamesPlayed }
    // Hydrate from localStorage so user stays logged in on page refresh
    user: (() => {
        try { return JSON.parse(localStorage.getItem("mr_user")) || null; }
        catch { return null; }
    })(),
    setUser: (user) => set({ user }),

    // Clear everything on logout
    logout: () => {
        localStorage.removeItem("mr_token");
        localStorage.removeItem("mr_user");
        set({
            user: null,
            playerName: "",
            playerId: null,
            roomId: null,
            players: {},
            gameState: "waiting",
            chatMessages: [],
        });
    },

    // ---- Leaderboard ----
    leaderboard: [],
    setLeaderboard: (lb) => set({ leaderboard: lb }),

    // ---- Platforms (Collisions) ----
    platforms: {},
    setPlatform: (id, data) => set((state) => ({
        platforms: { ...state.platforms, [id]: data }
    })),
    removePlatform: (id) => set((state) => {
        const p = { ...state.platforms };
        delete p[id];
        return { platforms: p };
    }),
}));

export default useStore;
