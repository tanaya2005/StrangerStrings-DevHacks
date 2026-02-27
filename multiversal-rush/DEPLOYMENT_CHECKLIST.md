# Quick Deployment Checklist

## ✅ Pre-Deployment (Already Done)
- [x] Added build script to server package.json
- [x] Added Render URL to CORS allowedOrigins
- [x] Client uses environment variable for server URL
- [x] Fixed player model texture fallback

## 🚀 Deploy Server to Render

1. **Create Web Service on Render**
   - Go to: https://dashboard.render.com/
   - Click "New +" → "Web Service"
   - Connect your GitHub repo

2. **Configure Service**
   ```
   Name: multiversal-rush-server
   Root Directory: multiversal-rush/server
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Add Environment Variables** (IMPORTANT!)
   ```
   PORT=5000
   MONGO_URI=mongodb+srv://rahatgaonkarvarun_db_user:wak5QIfxStImCFnN@devhacks.c1uim4v.mongodb.net/?appName=DevHacks
   MONGODB_URI=mongodb+srv://rahatgaonkarvarun_db_user:wak5QIfxStImCFnN@devhacks.c1uim4v.mongodb.net/?appName=DevHacks
   JWT_SECRET=multiversal_jwt_super_secret_key_2024
   CLIENT_URL=https://YOUR-FRONTEND-URL.vercel.app
   LIVEKIT_API_KEY=APIAxQpVMdkEsTg
   LIVEKIT_SECRET=FavuSppcaVcUYbemv54gt9KaTqa67oVKgjJMdo8rAPO
   LIVEKIT_URL=https://multiversal-dash-kghg7hd6.livekit.cloud
   ```

4. **Deploy!**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your server URL: `https://strangerstrings-devhacks.onrender.com`

## 🌐 Deploy Client to Vercel

1. **Create Project on Vercel**
   - Go to: https://vercel.com/new
   - Import your GitHub repo

2. **Configure Project**
   ```
   Framework Preset: Vite
   Root Directory: multiversal-rush/client
   Build Command: npm run build
   Output Directory: dist
   ```

3. **Add Environment Variable**
   ```
   VITE_SERVER_URL=https://strangerstrings-devhacks.onrender.com
   ```

4. **Deploy!**
   - Click "Deploy"
   - Wait for deployment (2-5 minutes)

5. **Update Server CLIENT_URL**
   - Copy your Vercel URL (e.g., `https://multiversal-rush.vercel.app`)
   - Go back to Render dashboard
   - Update `CLIENT_URL` environment variable with your Vercel URL
   - Redeploy server

## 🧪 Test Your Deployment

1. Visit your Vercel URL
2. Create an account
3. Login
4. Open another browser window/tab
5. Login with different account
6. Test multiplayer and voice chat

## ⚠️ Common Issues

### Server takes long to respond (first request)
- **Cause**: Render free tier has cold starts
- **Solution**: Wait 30-60 seconds for first request

### CORS errors in browser console
- **Cause**: CLIENT_URL not set correctly
- **Solution**: Update CLIENT_URL on Render with your Vercel URL

### Socket connection fails
- **Cause**: Wrong server URL in client
- **Solution**: Verify VITE_SERVER_URL matches your Render URL

### MongoDB connection fails
- **Cause**: IP whitelist in MongoDB Atlas
- **Solution**: Allow all IPs (0.0.0.0/0) in MongoDB Atlas Network Access

## 📝 Your URLs

After deployment, save these:

```
Server (Render): https://strangerstrings-devhacks.onrender.com
Client (Vercel): https://YOUR-APP.vercel.app
MongoDB: Already configured
LiveKit: Already configured
```

## 🎉 Done!

Your game is now live and ready for multiplayer!
