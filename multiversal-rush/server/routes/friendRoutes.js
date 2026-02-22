// ============================================================
//  routes/friendRoutes.js
// ============================================================
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
    searchUsers,
    sendRequest,
    respondRequest,
    listFriends,
    removeFriend,
    getMessages,
} from "../controllers/friendController.js";

const router = express.Router();

// All friend routes require a valid JWT
router.use(requireAuth);

router.get("/search", searchUsers);    // ?q=username
router.get("/", listFriends);    // my friends + pending
router.post("/request", sendRequest);    // { toUsername }
router.post("/respond", respondRequest); // { fromUserId, action }
router.delete("/:friendId", removeFriend);
router.get("/:friendId/messages", getMessages);   // ?page=0

export default router;
