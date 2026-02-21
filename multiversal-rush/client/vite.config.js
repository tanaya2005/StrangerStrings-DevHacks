import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The deployed Render server URL
const RENDER_URL = "https://strangerstrings-devhacks.onrender.com";

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        strictPort: true,  // Error loudly instead of silently bumping to 5174
        // Proxy /api/* and /socket.io/* to the Render server.
        // This is needed because Login.jsx uses relative URLs like /api/auth/login.
        proxy: {
            "/api": {
                target: RENDER_URL,
                changeOrigin: true,
            },
            "/socket.io": {
                target: RENDER_URL,
                ws: true,
                changeOrigin: true,
            },
        },
    },
});
