// ============================================================
//  App.jsx — React Router setup
//  If user is already logged in (token in localStorage), skip
//  Login page and go straight to Lobby.
// ============================================================
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";

/** Check if a stored JWT token exists (user already logged in) */
function isLoggedIn() {
    return !!localStorage.getItem("mr_token");
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* If already logged in, / redirects to /lobby */}
                <Route
                    path="/"
                    element={isLoggedIn() ? <Navigate to="/lobby" replace /> : <Login />}
                />
                <Route
                    path="/lobby"
                    element={isLoggedIn() ? <Lobby /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/game"
                    element={isLoggedIn() ? <Game /> : <Navigate to="/" replace />}
                />
                <Route
                    path="/leaderboard"
                    element={isLoggedIn() ? <Leaderboard /> : <Navigate to="/" replace />}
                />
                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
