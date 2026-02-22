// ============================================================
//  App.jsx — React Router + auth guard
//  FIX: isLoggedIn() was called at mount time only (not reactive).
//  Now uses useState so the guard updates immediately after login.
// ============================================================
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";
import WorldTest from "./pages/WorldTest";
import Achievements from "./pages/Achievements";

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
  return (
    <BrowserRouter>
      <Routes>
        {/* Login — redirect to /home if already authenticated */}
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

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
