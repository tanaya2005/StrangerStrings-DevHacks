// ============================================================
//  routes/authRoutes.js
// ============================================================
import express from "express";
import { signup, login, getMe } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// POST /api/auth/signup  — create account
router.post("/signup", signup);

// POST /api/auth/login   — sign in
router.post("/login", login);

// GET  /api/auth/me      — get logged-in user (requires token)
router.get("/me", requireAuth, getMe);

export default router;
