# Livekit Integration Guide — Multiversal Rush

## ✅ Migration Complete: PeerJS → Livekit

This guide explains how to set up Livekit for voice chat in Multiversal Rush.

---

## 🚀 Quick Setup (5 minutes)

### **Option 1: Use Livekit Cloud (RECOMMENDED)**

1. **Sign up** at https://cloud.livekit.com (free tier available!)
2. **Create a project** and get your API credentials:
   - API Key
   - Secret Key
   - WebSocket URL (e.g., `wss://your-instance.livekit.cloud`)

3. **Update `.env` in `server/` folder:**
   ```env
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_SECRET=your_secret
   LIVEKIT_URL=wss://your-instance.livekit.cloud
   ```

4. **Install dependencies:**
   ```bash
   cd multiversal-rush/server
   npm install
   
   cd ../client
   npm install
   ```

5. **Start the app:**
   ```bash
   # Terminal 1: Backend
   cd server && npm run dev
   
   # Terminal 2: Frontend
   cd client && npm run dev
   ```

6. **Test voice chat:**
   - Join a room on two different browser tabs
   - Click the Voice Chat widget (bottom-right in Lobby)
   - Allow microphone permissions
   - Speak and hear the other player!

---

### **Option 2: Self-Hosted Livekit**

If you want to host Livekit yourself:

1. **Install Docker** (if not already installed)

2. **Run Livekit with Docker:**
   ```bash
   docker run -d \
     -p 7880:7880 \
     -p 7881:7881 \
     -p 7882:7882/udp \
     -e LIVEKIT_API_KEY=devkey \
     -e LIVEKIT_API_SECRET=secret \
     livekit/livekit-server \
     --dev \
     --config /etc/livekit.yaml
   ```

3. **Update `.env`:**
   ```env
   LIVEKIT_API_KEY=devkey
   LIVEKIT_SECRET=secret
   LIVEKIT_URL=ws://localhost:7880
   ```

---

## 📦 What Changed

### **Removed:**
- ❌ PeerJS (peer-to-peer mesh networking)
- ❌ PeerJS server at `/peerjs` endpoint
- ❌ P2P signaling via Socket.IO `peer-join` events
- ❌ Manual peer connection management

### **Added:**
- ✅ Livekit client SDK (livekit-client)
- ✅ Livekit server SDK (livekit-server-sdk)
- ✅ `/api/voice/token` endpoint for token generation
- ✅ Livekit SFU (Selective Forwarding Unit) architecture
- ✅ Cloud-hosted or self-hosted options

---

## 🎯 Why Livekit is Better

| Feature | PeerJS | Livekit |
|---------|--------|---------|
| **Architecture** | P2P Mesh | SFU (Server-forwarded) |
| **Scalability** | ⚠️ Limited (bandwidth doubles) | ✅ Excellent (fixed server) |
| **Setup** | Complex path routing | Simple token-based |
| **Bandwidth** | High (each peer → all peers) | Lower (server forwards) |
| **Reliability** | Depends on peers | ✅ Cloud SLA 99.9% |
| **Production** | Not recommended | ✅ Battle-tested |
| **Cost** | Free (but limited) | Free cloud tier + pay-as-you-go |

---

## 🔧 How It Works

### **Flow:**
```
1. Player A joins Lobby
   ↓
2. Browser requests token from `/api/voice/token`
   ↓
3. Backend generates JWT token (signed with API secret)
   ↓
4. Browser connects to Livekit server with token
   ↓
5. Livekit server establishes WebRTC connection
   ↓
6. Audio published to Livekit
   ↓
7. Livekit forwards audio to Player B
   ↓
8. Player B receives audio stream
```

---

## 📁 Files Changed

- ✅ `server/package.json` — Added `livekit-server-sdk`
- ✅ `client/package.json` — Replaced `peerjs` with `livekit-client`
- ✅ `server/routes/voiceRoutes.js` — NEW: Token generation endpoint
- ✅ `server/server.js` — Removed PeerJS, added voice routes
- ✅ `server/socket/chat.js` — Removed peer-join handler
- ✅ `client/src/voice/Voice.jsx` — Complete Livekit refactor
- ✅ `client/index.html` — Removed PeerJS CDN script
- ✅ `server/.env.example` — Added Livekit config
- ✅ `package.json` files — Updated dependencies

---

## 🎤 Voice Widget Features

- **🎤 Mute/Unmute** — Toggle local microphone
- **🔊 Deafen** — Mute incoming audio
- **👥 Participant Count** — Shows connected players
- **❌ Error Handling** — Clear error messages
- **🔗 Auto-Connect** — Joins Livekit room automatically

---

## 🚨 Troubleshooting

### **"Token fetch failed"**
- Check backend is running: `npm run dev` in `server/`
- Verify `.env` has `LIVEKIT_API_KEY` and `LIVEKIT_SECRET`

### **"Connection failed"**
- Verify Livekit instance is accessible
- Check firewall/port settings
- Try different `LIVEKIT_URL` (e.g., `wss://` vs `ws://`)

### **"Microphone permission denied"**
- Allow microphone in browser settings
- Check browser console for permission errors

### **No audio from others**
- Verify both players have microphone enabled
- Check Livekit dashboard to see if tracks are published
- Try deafen toggle off (in case enabled)

---

## 📚 Resources

- **Livekit Docs**: https://docs.livekit.io
- **Livekit Cloud**: https://cloud.livekit.com
- **GitHub**: https://github.com/livekit/livekit
- **Client SDK**: https://www.npmjs.com/package/livekit-client

---

## 🎮 Next Steps

1. Deploy Livekit (cloud or self-hosted)
2. Add Livekit credentials to `.env`
3. Run `npm install` in both `server/` and `client/`
4. Start dev server: `npm run dev`
5. Test voice in-game and in lobby

**Good luck! 🚀**
