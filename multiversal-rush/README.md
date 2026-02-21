# 🌌 Multiversal Rush

> **Real-time 3D multiplayer obstacle-course racing game — race through dimensions!**

Built at **DevHacks 2026** by a 4-person team.  
Stack: React · Three.js / React Three Fiber · Socket.IO · Node.js · Express · MongoDB · PeerJS

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (URI in `.env`)

### 1 — Server
```bash
cd multiversal-rush/server
cp .env.example .env          # fill in MONGO_URI / MONGODB_URI + JWT_SECRET
npm install
npm run dev                   # nodemon → http://localhost:5000
```

### 2 — Client
```bash
cd multiversal-rush/client
npm install
npm run dev                   # Vite → http://localhost:5173
```

> **Tip:** The Vite dev server proxies `/api` and `/socket.io` to `localhost:5000` automatically — no CORS issues.

---

## 🗂️ Project Structure

```
multiversal-rush/
├── client/                         # React + Vite frontend
│   ├── index.html                  # PeerJS CDN loaded here
│   ├── vite.config.js              # Proxy API → :5000
│   └── src/
│       ├── App.jsx                 # Router + auth guard
│       ├── main.jsx                # Entry point
│       ├── index.css               # Global styles
│       ├── components/
│       │   ├── Player/
│       │   │   └── Player.jsx      # ★ 3D player (WASD + jump + gravity)
│       │   ├── Worlds/
│       │   │   ├── World1.jsx      # ★ Cyberverse scene
│       │   │   └── World2.jsx      # ★ Lava Hell scene
│       │   ├── Obstacles/
│       │   │   └── Obstacles.jsx   # (stub — Task 1 next step)
│       │   ├── Multiplayer/
│       │   │   └── RemotePlayers.jsx # Remote player meshes
│       │   └── UI/
│       │       └── HUD.jsx         # In-game timer / results HUD
│       ├── pages/
│       │   ├── Login.jsx           # ★ Sign In / Sign Up (tabbed)
│       │   ├── Login.css
│       │   ├── Lobby.jsx           # ★ Room join + chat + voice
│       │   ├── Lobby.css
│       │   ├── Game.jsx            # ★ Canvas container (World1/2)
│       │   ├── Leaderboard.jsx     # ★ Global trophies table
│       │   └── Leaderboard.css
│       ├── socket/
│       │   └── socket.js           # Socket.IO singleton client
│       ├── store/
│       │   └── store.js            # Zustand global state
│       ├── utils/
│       │   └── collision.js        # AABB collision helpers
│       └── voice/
│           └── Voice.jsx           # ★ WebRTC voice chat (PeerJS)
│
└── server/                         # Node.js + Express backend
    ├── server.js                   # ★ Entry: Express + Socket.IO + PeerJS
    ├── .env                        # Secrets (not committed)
    ├── config/
    │   └── db.js                   # MongoDB connection
    ├── models/
    │   └── User.js                 # ★ Mongoose schema
    ├── controllers/
    │   ├── authController.js       # ★ Signup / Login logic
    │   └── leaderboardController.js
    ├── middleware/
    │   └── auth.js                 # JWT requireAuth middleware
    ├── routes/
    │   ├── authRoutes.js           # /api/auth/*
    │   └── leaderboardRoutes.js    # /api/leaderboard/*
    └── socket/
        ├── gameSocket.js           # ★ Room management + game logic
        └── chat.js                 # ★ Text chat + PeerJS peer signaling
```

---

## ✅ What's Done (as of DevHacks Day 1)

### 🔐 Authentication (Tasks 2 + 3 merged)
| Feature | Status |
|---------|--------|
| Sign Up — email + username + password + DOB | ✅ Done |
| Age validation (must be 13+), client + server | ✅ Done |
| Password hashing (bcrypt pre-save hook) | ✅ Done |
| JWT login (30-day tokens) | ✅ Done |
| Login by email + password | ✅ Done |
| Protected routes (React Router guards) | ✅ Done |
| Persistent sessions (token in localStorage) | ✅ Done |
| Logout (clears token + Zustand state) | ✅ Done |

**API Endpoints:**
```
POST /api/auth/signup   { email, username, password, dateOfBirth }
POST /api/auth/login    { email, password }
GET  /api/auth/me       (requires Bearer token)
```

### 🕹️ 3D Game Engine (Task 1 — Tanaya)
| Feature | Status |
|---------|--------|
| React Three Fiber Canvas setup | ✅ Done |
| Player cube with WASD + Arrow key movement | ✅ Done |
| Spacebar jump with real physics gravity | ✅ Done |
| Shift to crouch (reduces speed + scale) | ✅ Done |
| Smooth camera follow (lerp, no jitter) | ✅ Done |
| Fall detection + respawn | ✅ Done |
| World 1 — Cyberverse (platforms + portal) | ✅ Done |
| World 2 — Lava Hell (floating platforms) | ✅ Done |
| Optimized: no shadows, pooled vectors, frame-rate independent | ✅ Done |

### 🌐 Multiplayer / Rooms (Task 2 — Varun)
| Feature | Status |
|---------|--------|
| Socket.IO room join / create (max 5 players) | ✅ Done |
| Ready system → auto-countdown → game start | ✅ Done |
| Per-tick position broadcast (throttled 50ms) | ✅ Done |
| RemotePlayers renderer (other player meshes) | ✅ Done |
| Finish line detection + ordering | ✅ Done |
| Elimination on fall | ✅ Done |
| World transition socket events | ✅ Done |
| HUD (race timer, player count, results) | ✅ Done |
| Leaderboard route (GET + POST update) | ✅ Done |
| Zustand global state (players, chat, game state) | ✅ Done |

### 💬 Chat + Voice (Task 4 — archit2)
| Feature | Status |
|---------|--------|
| In-lobby text chat (Socket.IO per-room) | ✅ Done |
| Voice chat component (PeerJS WebRTC) | ✅ Done |
| Auto-connect peers in same room (max 5) | ✅ Done |
| Mute / Deafen controls | ✅ Done |
| PeerJS server mounted at `/peerjs` on port 5000 | ✅ Done |
| Peer signaling via Socket.IO `peer-join` event | ✅ Done |

### 🗄️ Database (Task 3 — Atharva)
| Feature | Status |
|---------|--------|
| MongoDB Atlas connection | ✅ Done |
| User schema (email + username + password + DOB) | ✅ Done |
| Game stats (trophies, wins, gamesPlayed) | ✅ Done |
| Leaderboard (top 20, sorted by trophies) | ✅ Done |

---

## 🔜 Next Steps — What Each Member Must Complete

### 🎮 Task 1 — Tanaya (3D World Design)

**Priority tasks remaining:**
1. **Obstacles** — implement `Obstacles.jsx` with moving/static obstacles on each platform
   - Use `<mesh>` groups, animate via `useFrame`
   - Collision detection: use `collision.js` AABB helpers already in `/utils/`
2. **World 1 (Cyberverse)** — polish the scene:
   - Add more platform variety (varying heights, gaps)
   - Portal trigger: when player reaches `z < -25`, emit `worldTransition(2)` to switch to World 2
3. **World 2 (Lava Hell)** — polish:
   - Add lava particle effect or animated texture
   - Finish portal (at far end): emit `emitFinished()` when player touches it
4. **Multiplayer integration** — Player component already has `emitMove` / `emitFell` props:
   - Make sure `RemotePlayers.jsx` renders other player cubes in the same scene

**File targets:** `World1.jsx`, `World2.jsx`, `Obstacles.jsx`, `RemotePlayers.jsx`

---

### 🌐 Task 2 — Varun (Multiplayer + Auth)

**Priority tasks remaining:**
1. **Logout button** — add a logout button to the Lobby header:
   ```jsx
   import useStore from '../store/store';
   const logout = useStore(s => s.logout);
   // <button onClick={logout}>Logout</button>
   ```
2. **Post-game trophy update** — after race ends, call `POST /api/leaderboard/update` with win/trophies
3. **Game.jsx** — hook up World transition:
   - When `worldTransition` socket event fires, switch component from `<World1>` to `<World2>`
4. **RemotePlayers** — render other players' positions received via socket in the Canvas scene
5. **HUD** — connect it to live race data (time, positions, eliminations)

**File targets:** `Game.jsx`, `Lobby.jsx`, `HUD.jsx`, `RemotePlayers.jsx`, `store.js`

---

### 🗄️ Task 3 — Atharva (Database + Backend)

**Priority tasks remaining:**
1. **Leaderboard real-time push** — after each race, server should emit `leaderboardUpdate` with updated top-20
2. **Trophy award logic** — in `gameSocket.js`, when a player finishes:
   - 1st place → +15 trophies
   - 2nd place → +10 trophies
   - 3rd place → +5 trophies
   - Everyone else → +0 (no loss for now)
   - Call `leaderboardController.updateTrophies()` for each finisher
3. **Rate limiting** — add `express-rate-limit` to `/api/auth/*` routes (prevent brute-force)
4. **Input sanitization** — add `express-validator` or `joi` for request body validation

**File targets:** `gameSocket.js`, `leaderboardController.js`, `server.js`

---

### 💬 Task 4 — archit2 (Chat + Voice)

**Priority tasks remaining:**
1. **Voice UI integration** — Voice widget is already mounted in the Lobby sidebar. Test that:
   - Microphone permission prompt works
   - Two players in the same room auto-connect
   - Mute/Deafen toggles work
2. **Voice in-game** — add `<Voice>` component to `Game.jsx` so players can talk while racing
3. **Chat styling** — the lobby chat uses our cyberpunk CSS; review messages display on mobile
4. **Spam protection** — throttle `message` socket events (max 1 per 500ms per socket)
5. **Emoji / reactions** — optional: add quick-reactions to lobby chat (👍 🔥 👋)

**File targets:** `Lobby.jsx`, `Game.jsx`, `Voice.jsx`, `server/socket/chat.js`

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| POST | `/api/auth/signup` | `{ email, username, password, dateOfBirth }` | `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/api/auth/me` | — (Bearer token) | `user object` |

### Leaderboard
| Method | Endpoint | Body | Response |
|--------|----------|------|----------|
| GET | `/api/leaderboard` | — | Top 20 players array |
| POST | `/api/leaderboard/update` | `{ username, trophiesToAdd, win }` | Updated user |

### Socket Events (Client → Server)
| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `{ roomId, playerName }` | Join/create a room |
| `playerReady` | — | Toggle ready state |
| `playerMove` | `{ position, rotation, world }` | Broadcast position |
| `playerFinished` | — | Mark self as finished |
| `chatMessage` | `{ text }` | Send lobby chat |
| `peer-join` | `{ peerId, name, room }` | Register for voice |

### Socket Events (Server → Client)
| Event | Payload | Description |
|-------|---------|-------------|
| `roomJoined` | `{ roomId, playerId, players }` | Joined successfully |
| `playerJoined` | `{ players }` | Someone joined |
| `playersUpdated` | `{ players }` | Ready state changed |
| `countdownStarted` | `{ seconds }` | 3-2-1 countdown |
| `gameStarted` | `{ startTime }` | Navigate to game |
| `playerMoved` | `{ id, position, rotation }` | Remote player moved |
| `playerFinished` | `{ id, place }` | Someone finished |
| `leaderboardUpdate` | `{ leaderboard }` | Live trophy update |
| `peers` | `[{ socketId, name, peerId }]` | Voice peer list |

---

## 🧪 Environment Variables

### `server/.env`
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/multiversal
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/multiversal
JWT_SECRET=your_random_secret_here
CLIENT_URL=http://localhost:5173
```

### `client/.env`
```env
VITE_SERVER_URL=http://localhost:5000
```

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| 3D Engine | Three.js, @react-three/fiber, @react-three/drei |
| State | Zustand |
| Realtime | Socket.IO v4 |
| Voice | PeerJS (WebRTC) |
| Backend | Node.js, Express |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Dev Tools | Nodemon, ESLint |

---

## 👥 Team

| Member | Branch | Task |
|--------|--------|------|
| **Tanaya** | `Tanaya` | Task 1 — 3D worlds, obstacles, player movement |
| **Varun** | `Varun` | Task 2 — Multiplayer, rooms, auth, routing |
| **Atharva** | `Atharva` | Task 3 — Database, user schema, leaderboard |
| **archit2** | `archit2` | Task 4 — Voice chat, text chat, PeerJS |

> **Varun's `Varun` branch** is the **integration branch** — all work is merged here first.  
> PRs from each member's branch → `Varun` → final demo build.

---

## 🏁 Git Workflow

```bash
# Each member works on their own branch
git checkout <YourBranch>
git pull origin <YourBranch>
# ... make changes ...
git add .
git commit -m "feat: describe your change"
git push origin <YourBranch>

# Varun merges everyone's work
git checkout Varun
git merge origin/<MemberBranch>
git push origin Varun
```

---

*Built with ❤️ at DevHacks 2026 — StrangerStrings team*
