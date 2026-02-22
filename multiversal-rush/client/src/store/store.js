// ============================================================
//  store/store.js — Zustand global state
//  Varun: multiplayer slices, auth, chat
//  Atharva: platforms collision slice added
// ============================================================
import { create } from "zustand";

const useStore = create((set, get) => ({
    // ---- Player identity ----
    playerId: null,
    playerName: "",
    setPlayerName: (name) => set({ playerName: name }),
    setPlayerId: (id) => set({ playerId: id }),

    // ---- Avatar & Shop ----
    avatar: "/models/penguin/scene.gltf",   // default
    gems: 0,
    xp: 0,
    level: 1,
    ownedAvatars: [],
    setAvatar: (path) => set({ avatar: path }),
    setGems: (val) => set({ gems: val }),
    setXP: (val) => set({ xp: val }),
    setLevel: (val) => set({ level: val }),
    setOwnedAvatars: (list) => set({ ownedAvatars: list }),

    // ---- Room ----
    roomId: null,
    setRoomId: (id) => set({ roomId: id }),

    // ---- Players map: socketId → player object ----
    players: {},
    setPlayers: (playerList) => {
        const map = {};
        playerList.forEach((p) => (map[p.id] = p));
        set({ players: map });
    },
    updatePlayer: (playerId, data) =>
        set((state) => ({
            players: { ...state.players, [playerId]: { ...state.players[playerId], ...data } },
        })),
    removePlayer: (playerId) =>
        set((state) => {
            const updated = { ...state.players };
            delete updated[playerId];
            return { players: updated };
        }),

    // ---- Game state: "waiting" | "countdown" | "playing" | "finished" ----
    gameState: "waiting",
    setGameState: (s) => set({ gameState: s }),

    countdown: 0,
    setCountdown: (n) => set({ countdown: n }),

    startTime: null,
    setStartTime: (t) => set({ startTime: t }),

    // ---- World ----
    currentWorld: 0,  // Start in hub (world 0)
    setCurrentWorld: (w) => set({ currentWorld: w }),

    // ---- Self position ----
    myPosition: { x: 0, y: 1, z: 0 },
    myRotation: { y: 0 },
    setMyPosition: (pos) => set({ myPosition: pos }),
    setMyRotation: (rot) => set({ myRotation: rot }),

    // ---- Finish / Leaderboard ----
    finishedOrder: [],
    myFinishResult: null,
    setFinishedOrder: (order) => set({ finishedOrder: order }),
    setMyFinishResult: (result) => set({ myFinishResult: result }),

    // ---- Match Results ----
    matchResults: [],
    showMatchResults: false,
    setMatchResults: (results) => set({ matchResults: results, showMatchResults: true }),
    hideMatchResults: () => set({ showMatchResults: false, matchResults: [] }),

    // ---- Chat ----
    chatMessages: [],
    addChatMessage: (msg) =>
        set((state) => ({
            chatMessages: [...state.chatMessages, msg].slice(-100),
        })),
    setChatMessages: (msgs) => set({ chatMessages: msgs }),

    // ---- Auth (JWT — no Firebase) ----
    // Hydrate from localStorage so user stays logged in on refresh
    user: (() => {
        try { return JSON.parse(localStorage.getItem("mr_user")) || null; }
        catch { return null; }
    })(),
    setUser: (user) => set({ user }),

    logout: () => {
        localStorage.removeItem("mr_token");
        localStorage.removeItem("mr_user");
        set({
            user: null, playerName: "", playerId: null,
            roomId: null, players: {}, gameState: "waiting", chatMessages: [],
        });
    },

    // ---- Leaderboard ----
    leaderboard: [],
    setLeaderboard: (lb) => set({ leaderboard: lb }),

    // ---- Platforms collision map (Atharva) ----
    platforms: {},
    setPlatform: (id, data) =>
        set((state) => ({ platforms: { ...state.platforms, [id]: data } })),
    removePlatform: (id) =>
        set((state) => {
            const p = { ...state.platforms };
            delete p[id];
            return { platforms: p };
        }),

    // ---- Achievements ----
    achievements: {},
    setAchievements: (ach) => set({ achievements: ach }),
    achievementPopup: null,  // { achievement, newTier } or null
    showAchievementPopup: (data) => set({ achievementPopup: data }),
    dismissAchievementPopup: () => set({ achievementPopup: null }),

    // ---- Notifications ----
    pendingRequests: 0,
    setPendingRequests: (count) => set({ pendingRequests: count }),

    notifications: [],
    addNotification: (notif) => set((s) => ({
        notifications: [{ id: Date.now() + Math.random().toString(), time: Date.now(), ...notif }, ...s.notifications].slice(0, 50)
    })),
    removeNotification: (id) => set((s) => ({
        notifications: s.notifications.filter(n => n.id !== id)
    })),
    clearNotifications: () => set({ notifications: [] }),
}));

export default useStore;
