// ============================================================
//  App.jsx — React Router setup
//  DEMO MODE: Auto-login without auth for testing
//  If user is already logged in (token in localStorage), skip
//  Login page and go straight to Lobby.
// ============================================================
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import useStore from "./store/store";

/** Check if a stored JWT token exists (user already logged in) */
function isLoggedIn() {
    return !!localStorage.getItem("mr_token");
}

/** Initialize demo session for testing (no auth required) */
function initializeDemoSession() {
    // Create a mock JWT token
    const mockToken = "demo_token_" + Date.now();
    localStorage.setItem("mr_token", mockToken);
    
    // ALWAYS ensure playerName is set (even if token already existed)
    const currentName = useStore.getState().playerName;
    if (!currentName) {
        const setPlayerName = useStore.getState().setPlayerName;
        setPlayerName("DemoPlayer_" + Math.floor(Math.random() * 1000));
    }
    
    console.log("✅ Demo session ready — player:", useStore.getState().playerName);
}

export default function App() {
    // Initialize demo session on app load
    useEffect(() => {
        initializeDemoSession();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                {/* Direct access to all routes — no auth guard for testing */}
                <Route path="/" element={isLoggedIn() ? <Navigate to="/lobby" replace /> : <Login />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="/game" element={<Game />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/lobby" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
