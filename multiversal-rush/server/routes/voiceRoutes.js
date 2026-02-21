// ============================================================
//  routes/voiceRoutes.js — Livekit voice token generation
//  Task 4 (archit2) — Replace PeerJS with Livekit
// ============================================================
import express from "express";
import { AccessToken } from "livekit-server-sdk";

const router = express.Router();

/**
 * POST /api/voice/token
 * Generate a Livekit access token for a player
 * 
 * Body: { playerName, roomId }
 * Response: { token, url }
 */
router.post("/token", async (req, res) => {
    try {
        const { playerName, roomId } = req.body;

        // Validate inputs
        if (!playerName || !roomId) {
            return res.status(400).json({
                error: "Missing playerName or roomId",
            });
        }

        // Get Livekit credentials from environment
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_SECRET;
        const liveKitUrl = process.env.LIVEKIT_URL || "ws://localhost:7880";

        if (!apiKey || !apiSecret) {
            console.error("⚠️ Livekit credentials missing in .env");
            return res.status(500).json({
                error: "Voice service not configured",
            });
        }

        // Create token with room grant
        const at = new AccessToken(apiKey, apiSecret, {
            identity: playerName,
            name: playerName,
        });
        at.addGrant({
            roomJoin: true,
            room: roomId,
            canPublish: true,
            canPublishData: true,
            canSubscribe: true,
        });

        // Return token and URL
        const token = await at.toJwt();
        res.json({
            token,
            url: liveKitUrl,
        });
    } catch (err) {
        console.error("[Voice Token] Error:", err.message);
        res.status(500).json({
            error: "Failed to generate voice token",
        });
    }
});

export default router;
