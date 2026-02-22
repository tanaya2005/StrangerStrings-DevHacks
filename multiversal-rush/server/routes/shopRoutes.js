// ============================================================
//  routes/shopRoutes.js
//  Routes for gem-based avatar shop
// ============================================================
import express from "express";
import { getInventory, purchaseAvatar, equipAvatar } from "../controllers/shopController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// requireAuth middleware ensures we have req.user from JWT
router.get("/me", requireAuth, getInventory);
router.post("/purchase", requireAuth, purchaseAvatar);
router.post("/equip", requireAuth, equipAvatar);

export default router;
