// ============================================================
//  App.jsx — React Router + auth guard + Loading Screen
//  FIX: isLoggedIn() was called at mount time only (not reactive).
//  Now uses useState so the guard updates immediately after login.
// ============================================================
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import Friends from "./pages/Friends";
import WorldTest from "./pages/WorldTest";
import Achievements from "./pages/Achievements";
import LoadingScreen from "./components/LoadingScreen";

/** Read token from localStorage — called on every render */
function isLoggedIn() {
  return !!localStorage.getItem("mr_token");
}

/**
 * PrivateRoute — re-checks token on every render.
 * If not logged in, redirects to /
 */
function PrivateRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/" replace />;
  return children;
}

/**
 * PublicRoute — if already logged in, skip Login and go to Home.
 */
function PublicRoute({ children }) {
  if (isLoggedIn()) return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /** 
     * Show loading screen for 1.5 seconds minimum 
     * even if the auth check is instant.
     */
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login — redirect to /home if already authenticated via PublicRoute */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Protected pages */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/lobby"
          element={
            <PrivateRoute>
              <Lobby />
            </PrivateRoute>
          }
        />
        <Route
          path="/game"
          element={
            <PrivateRoute>
              <Game />
            </PrivateRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <PrivateRoute>
              <Leaderboard />
            </PrivateRoute>
          }
        />
        <Route path="/test/:worldId" element={<WorldTest />} />
        <Route
          path="/achievements"
          element={
            <PrivateRoute>
              <Achievements />
            </PrivateRoute>
          }
        />

        <Route
          path="/friends"
          element={
            <PrivateRoute>
              <Friends />
            </PrivateRoute>
          }
        />

        {/* Catch-all: redirects to root, which then handles auth check */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
