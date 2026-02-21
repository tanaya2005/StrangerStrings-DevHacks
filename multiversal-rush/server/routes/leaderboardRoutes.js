// ============================================================
//  routes/leaderboardRoutes.js
// ============================================================
import express from "express";
import { getLeaderboard, updateTrophies } from "../controllers/leaderboardController.js";

const router = express.Router();

// GET  /api/leaderboard       → top 20 players
router.get("/", getLeaderboard);

// POST /api/leaderboard/update → update player trophies after match
router.post("/update", updateTrophies);

export default router;
