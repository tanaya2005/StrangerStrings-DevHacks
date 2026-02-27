// ============================================================
//  routes/achievementRoutes.js
// ============================================================
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getAchievements } from "../controllers/achievementController.js";

const router = Router();

// GET /api/achievements — requires JWT
router.get("/", requireAuth, getAchievements);

export default router;
