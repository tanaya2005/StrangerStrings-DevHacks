# Fix Render Deployment Errors

## Error 1: `sh: 1: nodemon: not found`

### Solution
Change Start Command from `npm run dev` to `npm start`

---

## Error 2: `Cannot find package 'express'`

### Cause
The build command is set to `npm run build` instead of `npm install`, so dependencies are never installed.

### Solution - Fix in Render Dashboard

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click on your service**: `strangerstrings-devhacks`
3. **Go to Settings tab**
4. **Find "Build Command"** and change it from `npm run build` to `npm install` ⚠️ CRITICAL
5. **Verify these settings**:
   - **Root Directory**: `multiversal-rush/server`
   - **Build Command**: `npm install` (NOT `npm run build`)
   - **Start Command**: `npm start`
6. **Click "Save Changes"**
7. **Manual Redeploy**: Click "Manual Deploy" → "Deploy latest commit"

### Why Root Directory Matters

Without setting the root directory, Render tries to:
- Install dependencies in the wrong location
- Run the server from the wrong path
- Can't find node_modules

With `multiversal-rush/server` as root directory:
- ✅ Runs `npm install` in the server folder
- ✅ Installs all dependencies correctly
- ✅ Runs `node server.js` from the right location

---

## Complete Render Configuration

Make sure your Render service has these exact settings:

```
Name: strangerstrings-devhacks
Environment: Node
Root Directory: multiversal-rush/server
Build Command: npm install (NOT npm run build!)
Start Command: npm start
```

### Environment Variables (also required):
```
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://rahatgaonkarvarun_db_user:wak5QIfxStImCFnN@devhacks.c1uim4v.mongodb.net/?appName=DevHacks
MONGODB_URI=mongodb+srv://rahatgaonkarvarun_db_user:wak5QIfxStImCFnN@devhacks.c1uim4v.mongodb.net/?appName=DevHacks
JWT_SECRET=multiversal_jwt_super_secret_key_2024
CLIENT_URL=https://YOUR-VERCEL-URL.vercel.app
LIVEKIT_API_KEY=APIAxQpVMdkEsTg
LIVEKIT_SECRET=FavuSppcaVcUYbemv54gt9KaTqa67oVKgjJMdo8rAPO
LIVEKIT_URL=https://multiversal-dash-kghg7hd6.livekit.cloud
```

---

## After Fixing

Your deployment logs should show:
```
==> Building...
==> Running 'npm install'
added 150 packages...
==> Build successful

==> Deploying...
==> Running 'npm start'
✅ Server running on http://localhost:5000
✅ MongoDB connected
✅ LiveKit voice enabled
```

---

## Quick Test

After successful deployment:
```bash
curl https://strangerstrings-devhacks.onrender.com
```

Expected response:
```
Multiversal Rush Server ✅
```

---

## Still Having Issues?

### Check Build Logs
1. Go to your service in Render
2. Click "Logs" tab
3. Look for errors in the build phase

### Common Issues:

**Issue**: "Cannot find module"
**Fix**: Make sure Root Directory is set to `multiversal-rush/server`

**Issue**: "Port already in use"
**Fix**: Make sure PORT environment variable is set to 5000

**Issue**: "MongoDB connection failed"
**Fix**: Check MONGO_URI is correct and MongoDB Atlas allows connections from 0.0.0.0/0
