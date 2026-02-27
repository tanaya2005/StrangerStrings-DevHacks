# 🌌 Multiversal Rush

> **A real-time 3D multiplayer obstacle-course race across dimensions.**
> Built for DevHacks 2026 by Team StrangerStrings.

---

## 🎮 Game Overview

Players race through a multidimensional obstacle course — starting in a **Hub World**, then diving into:
- **🌐 Cyberverse** — moving + rotating platforms in a neon grid world
- **🍯 Honeycomb** — hex tiles that drop when stepped on, lava floor below
- *(🌋 Lava Hell — World 2, coming soon via portal)*

**Voice chat** is built-in via LiveKit (muted + deafened by default — players choose to unmute).

---

## 👥 Team & Responsibilities

| Member | Branch | Task |
|--------|--------|------|
| **Varun (Rahat)** | `Varun` | Multiplayer (Socket.io), Auth (JWT), Lobby, server backbone |
| **Tanaya** | `Tanaya` | 3D Player movement (WASD + jump + gravity + camera) |
| **Atharva** | `Atharva` | 3D Worlds (HubWorld, Cyberverse, Honeycomb), AABB collision engine |
| **Archit** | `archit2` | Voice chat (LiveKit SFU), HUD polish |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- LiveKit account ([livekit.io](https://livekit.io))

### 1. Clone & Install

```bash
git clone https://github.com/tanaya2005/StrangerStrings-DevHacks.git
cd StrangerStrings-DevHacks

# Server
cd multiversal-rush/server
npm install

# Client
cd ../client
npm install
```

### 2. Configure `.env`

Create `multiversal-rush/server/.env`:

```env
PORT=5000

MONGO_URI=mongodb+srv://...
MONGODB_URI=mongodb+srv://...

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173

LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-instance.livekit.cloud
```

### 3. Run

```bash
# Terminal 1 — Server
cd multiversal-rush/server
npm run dev

# Terminal 2 — Client
cd multiversal-rush/client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🎯 Features

### ✅ Authentication
- Sign Up (email + username + password + date-of-birth, must be 13+)
- Sign In (email + password)
- JWT stored in localStorage — stays logged in on refresh
- Protected routes (`/lobby`, `/game`, `/leaderboard`)

### ✅ Lobby / Waiting Room
- Create or join a room by ID
- See all players + their ready status
- Text chat while waiting
- Countdown → game starts when all ≥2 players ready
- **Voice Chat** panel (LiveKit, default muted+deafened)

### ✅ 3D Game
- **Hub World** — spawn + two portals (Cyberverse, Honeycomb)
- **Cyberverse** — static + moving + rotating platforms, custom AABB collision
- **Honeycomb** — hex tile grid (3 descending layers), tiles flash orange then drop after 800ms
  - Falling to lava = **ELIMINATED** (full-screen overlay, return-to-lobby button)
- Real-time multiplayer: see other players move in your world
- Timer + player count HUD
- Exit button → returns to lobby

### ✅ Voice Chat (LiveKit)
- Auto-connects on entering lobby or game
- **Default: Muted + Deafened** (privacy-first)
- 🎤 Mic toggle (Muted / Live)
- 🔊 Deafen toggle (Deaf / Hearing)
- Connected player count

### ✅ Leaderboard
- Global leaderboard (MongoDB backed)
- Per-race finish positions

---

## 🗂️ Project Structure

```
multiversal-rush/
├── client/                    # React + Vite + R3F frontend
│   └── src/
│       ├── App.jsx            # Routes + auth guards
│       ├── pages/
│       │   ├── Login.jsx      # Sign in / Sign up
│       │   ├── Lobby.jsx      # Waiting room + chat + voice
│       │   ├── Game.jsx       # 3D game shell + socket wiring
│       │   └── Leaderboard.jsx
│       ├── components/
│       │   ├── Player/        # Player.jsx — movement, collision
│       │   ├── Worlds/        # HubWorld, World1, World2, Honeycomb
│       │   ├── Obstacles/     # Platform.jsx — moving/rotating/static
│       │   ├── Multiplayer/   # RemotePlayers.jsx
│       │   └── UI/            # HUD.jsx
│       ├── voice/             # Voice.jsx (LiveKit)
│       ├── socket/            # socket.js (Socket.io client)
│       ├── store/             # store.js (Zustand global state)
│       └── utils/             # collision.js (AABB)
└── server/                    # Express + Socket.io backend
    ├── server.js              # Entry point
    ├── socket/
    │   ├── gameSocket.js      # All game events
    │   └── chat.js            # Chat events
    ├── routes/
    │   ├── authRoutes.js      # /api/auth/*
    │   ├── leaderboardRoutes.js
    │   └── voiceRoutes.js     # /api/voice/token (LiveKit)
    ├── models/                # User.js, Leaderboard.js
    └── config/db.js           # MongoDB connection
```

---

## 🌐 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/leaderboard` | Get global leaderboard |
| POST | `/api/leaderboard` | Save race result |
| POST | `/api/voice/token` | Get LiveKit room token |

---

## 🔌 Socket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `{roomId, playerName}` | Join/create a room |
| `playerReady` | — | Toggle ready state |
| `move` | `{position, rotation, world}` | Broadcast position |
| `worldTransition` | `{newWorld}` | Crossed a portal |
| `playerFinished` | — | Crossed finish portal |
| `playerFell` | — | Fell off platform (respawn) |
| `playerEliminated` | — | Fell into Honeycomb lava |
| `chatMessage` | `{text}` | Send chat message |

### Server → Client
| Event | Description |
|-------|-------------|
| `roomJoined` | Confirms join, sends full state |
| `playerJoined` | New player arrived |
| `playersUpdated` | Ready-state changed |
| `countdownStarted` | 3-2-1 countdown begins |
| `gameStarted` | Race is live |
| `playerMoved` | Another player moved |
| `playerRespawned` | Player respawned after fall |
| `playerEliminated` | Player hit lava |
| `playerFinishedRace` | Player crossed finish |
| `gameFinished` | Race over |

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Move forward |
| `S` / `↓` | Move backward |
| `A` / `←` | Strafe left |
| `D` / `→` | Strafe right |
| `Space` | Jump |
| `Shift` | Crouch (half speed) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| 3D Engine | React Three Fiber (@react-three/fiber), Three.js |
| State | Zustand |
| Realtime | Socket.io |
| Voice | LiveKit SFU (cloud) |
| Auth | JWT (custom, no Firebase) |
| Database | MongoDB Atlas + Mongoose |
| Backend | Node.js, Express |

---

## 🚧 Pull Latest (for teammates)

```bash
git checkout <YourBranch>
git pull origin <YourBranch>

# Server — install new packages (livekit-server-sdk)
cd multiversal-rush/server && npm install

# Client — install new packages (livekit-client, @livekit/components-react)
cd ../client && npm install
```

> ⚠️ **If you get conflicts:** `git merge --abort` then `git reset --hard origin/<YourBranch>`
