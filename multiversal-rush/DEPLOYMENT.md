# Multiversal Rush - Render Deployment Guide

## Server Deployment (Backend)

### 1. Deploy Server on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `multiversal-rush-server`
   - **Root Directory**: `multiversal-rush/server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 2. Set Environment Variables on Render

Go to your service → Environment tab and add:

```
PORT=5000
MONGO_URI=mongodb+srv://rahatgaonkarvarun_db_user:wak5QIfxStImCFnN@devhacks.c1uim4v.mongodb.net/?appName=DevHacks
MONGODB_URI=mongodb+srv://rahatgaonkarvarun_db_user:wak5QIfxStImCFnN@devhacks.c1uim4v.mongodb.net/?appName=DevHacks
JWT_SECRET=multiversal_jwt_super_secret_key_2024
CLIENT_URL=https://YOUR-CLIENT-URL.vercel.app
LIVEKIT_API_KEY=APIAxQpVMdkEsTg
LIVEKIT_SECRET=FavuSppcaVcUYbemv54gt9KaTqa67oVKgjJMdo8rAPO
LIVEKIT_URL=https://multiversal-dash-kghg7hd6.livekit.cloud
```

### 3. Your Server URL
After deployment, your server will be at:
```
https://multiversal-rush.onrender.com
```

---

## Client Deployment (Frontend)

### Option A: Deploy on Vercel (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `multiversal-rush/client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variable:
   ```
   VITE_SERVER_URL=https://multiversal-rush.onrender.com
   ```

6. Deploy!

### Option B: Deploy on Netlify

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure:
   - **Base directory**: `multiversal-rush/client`
   - **Build command**: `npm run build`
   - **Publish directory**: `multiversal-rush/client/dist`

5. Add Environment Variable:
   ```
   VITE_SERVER_URL=https://multiversal-rush.onrender.com
   ```

6. Deploy!

---

## Important Notes

### CORS Configuration
The server is already configured to accept requests from:
- `http://localhost:5173` (local dev)
- `https://multiversal-rush.onrender.com` (production)
- Any URL set in `CLIENT_URL` environment variable

If you deploy the client to a different URL, update the `CLIENT_URL` environment variable on Render.

### WebSocket Configuration
Socket.io is configured to work with CORS. No additional configuration needed.

### MongoDB Atlas
Your MongoDB connection is already configured. Make sure:
1. Your MongoDB Atlas cluster allows connections from anywhere (0.0.0.0/0) for Render
2. Or add Render's IP addresses to the whitelist

### LiveKit Voice Chat
LiveKit is using cloud SFU, so no additional server setup is needed. The credentials are already configured.

---

## Testing Deployment

1. After both deployments are complete, visit your client URL
2. Create an account and login
3. Test multiplayer by opening two browser windows
4. Test voice chat in the lobby

---

## Troubleshooting

### Server won't start on Render
- Check the logs in Render dashboard
- Verify all environment variables are set correctly
- Make sure MongoDB Atlas allows connections from Render

### Client can't connect to server
- Check browser console for CORS errors
- Verify `VITE_SERVER_URL` is set correctly
- Make sure server is running (check Render dashboard)

### WebSocket connection fails
- Render free tier may have cold starts (first request takes 30-60 seconds)
- Check if server URL in client matches the deployed server URL
- Verify CORS settings in server.js

### Voice chat not working
- Check LiveKit credentials are set correctly
- Verify browser has microphone permissions
- Check browser console for LiveKit errors

---

## Local Development

To run locally after deployment:

**Server:**
```bash
cd multiversal-rush/server
npm install
npm run dev
```

**Client:**
```bash
cd multiversal-rush/client
npm install
npm run dev
```

Make sure to use local environment variables (.env files) for local development.
