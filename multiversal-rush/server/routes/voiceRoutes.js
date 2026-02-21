// ============================================================
//  routes/voiceRoutes.js — LiveKit voice token generation
//  Source: archit2 (Task 4)
//  POST /api/voice/token → { token, url }
// ============================================================
import express from "express";
import { AccessToken } from "livekit-server-sdk";

const router = express.Router();

router.post("/token", async (req, res) => {
    try {
        const { playerName, roomId } = req.body;
        if (!playerName || !roomId) {
            return res.status(400).json({ error: "Missing playerName or roomId" });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_SECRET;
        const url = process.env.LIVEKIT_URL || "ws://localhost:7880";

        if (!apiKey || !apiSecret) {
            console.error("⚠️  LIVEKIT_API_KEY / LIVEKIT_SECRET not set in .env");
            return res.status(500).json({ error: "Voice service not configured" });
        }

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

        const token = await at.toJwt();
        res.json({ token, url });
    } catch (err) {
        console.error("[Voice Token Error]", err.message);
        res.status(500).json({ error: "Failed to generate voice token" });
    }
});

export default router;
