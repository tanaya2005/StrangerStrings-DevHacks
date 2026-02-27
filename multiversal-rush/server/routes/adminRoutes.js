// ============================================================
//  routes/adminRoutes.js
// ============================================================
import express from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import {
    adminLogin,
    getOverview,
    getGames,
    getUsers,
    setBanStatus,
    resetStats,
    kickPlayer,
    forceEndRoom,
    broadcastMessage,
    deleteGame,
} from "../controllers/adminController.js";

const router = express.Router();

// Public — only the login route, everything else requires admin token
router.post("/login", adminLogin);

// Protected — all routes below need a valid admin JWT
router.use(requireAdmin);

router.get("/overview", getOverview);
router.get("/games", getGames);
router.get("/users", getUsers);
router.post("/users/:userId/ban", setBanStatus);
router.post("/users/:userId/reset-stats", resetStats);
router.post("/rooms/:roomId/kick", kickPlayer);
router.post("/rooms/:roomId/force-end", forceEndRoom);
router.post("/broadcast", broadcastMessage);
router.delete("/games/:gameId", deleteGame);

export default router;
