# Local Testing Guide

## Setup for Local Testing

### 1. Start Backend Server (Terminal 1)
```bash
cd multiversal-rush/server
npm run dev
```

Server will start on: `http://localhost:5000`

### 2. Start Frontend Client (Terminal 2)
```bash
cd multiversal-rush/client
npm run dev
```

Client will start on: `http://localhost:5173`

### 3. Test with Multiple Players

**Option A: Same Computer (2 Browser Windows)**
1. Open `http://localhost:5173` in Chrome
2. Open `http://localhost:5173` in Chrome Incognito (or another browser)
3. Login with different accounts in each
4. Join the same room code
5. Test multiplayer

**Option B: Different Computers (Same Network)**
1. Find your local IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
   
2. On Computer 1 (your laptop):
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:5173`

3. On Computer 2 (Tanaya's laptop):
   - Update her `.env` file:
     ```
     VITE_SERVER_URL=http://YOUR_IP:5000
     ```
   - Example: `VITE_SERVER_URL=http://192.168.1.100:5000`
   - Start her client: `npm run dev`
   - Access: `http://localhost:5173` on her laptop

### 4. Check Everything Works

Test these features:
- ✅ Can see each other in the game
- ✅ Movement syncs between players
- ✅ Finish race → Wait for others
- ✅ All finish → See match results
- ✅ Trophies awarded correctly
- ✅ Eliminated in Honeycomb → See match results
- ✅ Return to lobby after 10 seconds

### 5. Check Console Logs

Open browser console (F12) and look for:
- `[RemotePlayers]` - Shows other players
- `[Game]` - Shows socket events
- `[Match Results]` - Shows trophy distribution

### 6. When Ready to Deploy

After testing locally and everything works:

1. **Update client .env for production:**
   ```bash
   # In multiversal-rush/client/.env
   VITE_SERVER_URL=https://strangerstrings-devhacks.onrender.com
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Trophy system and match results"
   git push
   ```

3. **Render will auto-deploy** (if connected to GitHub)

---

## Quick Commands

**Start both servers at once (Windows):**
```bash
# Terminal 1
cd multiversal-rush/server && npm run dev

# Terminal 2  
cd multiversal-rush/client && npm run dev
```

**Stop servers:**
- Press `Ctrl + C` in each terminal

---

## Troubleshooting

**Backend won't start:**
- Check MongoDB connection in `.env`
- Make sure port 5000 is not in use

**Frontend can't connect:**
- Check `VITE_SERVER_URL` in client `.env`
- Make sure backend is running
- Check browser console for errors

**Can't see other player:**
- Check console logs for world numbers
- Make sure both players are in same room
- Check socket connection status

**Match results don't show:**
- Check browser console for `matchResults` event
- Make sure game actually ended (all players finished or eliminated)
- Check if eliminated overlay is blocking (should hide now)

---

## Current Configuration

✅ Client `.env` set to `http://localhost:5000` for local testing
✅ Server runs on port 5000
✅ Client runs on port 5173
✅ All changes are local (not pushed to Git yet)

Test everything locally, then update `.env` and push when ready!
