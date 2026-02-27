// ============================================================
//  controllers/leaderboardController.js
//  Uses merged User schema (email + username + trophies)
// ============================================================
import User from "../models/User.js";

/**
 * GET /api/leaderboard
 * Returns top 20 players sorted by trophies descending.
 */
export async function getLeaderboard(req, res) {
    try {
        const players = await User.find()
            .sort({ trophies: -1 })
            .limit(20)
            .select("username email trophies wins gamesPlayed level");
        res.json(players);
    } catch (err) {
        console.error("[Leaderboard GET]", err);
        res.status(500).json({ error: "Server error" });
    }
}

/**
 * POST /api/leaderboard/update
 * Body: { username, trophiesToAdd, win: boolean }
 * Updates player stats after a match.
 */
export async function updateTrophies(req, res) {
    try {
        const { username, trophiesToAdd = 0, win = false } = req.body;
        if (!username) return res.status(400).json({ error: "username is required" });

        const user = await User.findOneAndUpdate(
            { username: { $regex: new RegExp(`^${username}$`, "i") } },
            {
                $inc: {
                    trophies: trophiesToAdd,
                    gamesPlayed: 1,
                    ...(win ? { wins: 1 } : {}),
                },
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("[Leaderboard POST]", err);
        res.status(500).json({ error: "Server error" });
    }
}
