# Multiplayer Debug Guide

## Issue: Both players controlling same character

### Possible Causes:
1. Socket IDs not being properly assigned
2. Players not being filtered correctly in RemotePlayers
3. World tracking not synchronized

### How to Debug:

1. **Open Browser Console** (F12) on both browser windows

2. **Check Socket IDs:**
   - Look for `[Socket] ✅ Connected with id: XXXXX`
   - Each window should have a DIFFERENT socket ID
   - If they're the same, there's a connection issue

3. **Check Player Store:**
   In console, type:
   ```javascript
   // Check your own ID
   console.log('My ID:', window.socket?.id);
   
   // Check all players in store
   console.log('All players:', useStore.getState().players);
   
   // Check current world
   console.log('Current world:', useStore.getState().currentWorld);
   ```

4. **Check if players are being added correctly:**
   - When second player joins, first player should see "playerJoined" event
   - Check Network tab → WS (WebSocket) → Messages

### Expected Behavior:
- Player 1 controls their own Player component
- Player 1 sees Player 2 as a RemotePlayer (red panda model with name tag)
- Player 2 controls their own Player component
- Player 2 sees Player 1 as a RemotePlayer

### Common Issues:

#### Issue: Same socket ID on both clients
**Solution:** Make sure you're using different browser windows/tabs, not just refreshing the same one

#### Issue: Players not appearing
**Solution:** Check that both players are in the same room and same world

#### Issue: Player appears but doesn't move
**Solution:** Check that `move` events are being emitted (throttled to 50ms)

### Quick Test:
1. Open two browser windows side by side
2. Login with different accounts in each
3. Join the SAME room code
4. Both click "Ready"
5. You should see:
   - Your own character (controllable with WASD)
   - Other player's character (moving when they move)
   - Different name tags above each character

### Files Changed:
- ✅ RemotePlayers.jsx - Now uses 3D models instead of cubes
- ✅ Game.jsx - Added world tracking on portal entry
- ✅ Player.jsx - Using red-panda model from new path

### Next Steps if Still Not Working:
1. Check server logs for "playerJoined" events
2. Verify socket.emit("move") is being called
3. Check that players object in store has multiple entries
4. Verify currentWorld is being set correctly (0 for hub, 1 for cyberverse, etc.)
