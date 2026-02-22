import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Point to LOCAL server during dev. Change back to Render URL before deploying:
// const SERVER_TARGET = "https://strangerstrings-devhacks.onrender.com";
const SERVER_TARGET = "http://localhost:5000";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,  // Error loudly instead of silently bumping to 5174
        // Proxy /api/* and /socket.io/* to the Render server.
        // This is needed because Login.jsx uses relative URLs like /api/auth/login.
        proxy: {
            "/api": {
                target: SERVER_TARGET,
                changeOrigin: true,
            },
            "/socket.io": {
                target: SERVER_TARGET,
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
