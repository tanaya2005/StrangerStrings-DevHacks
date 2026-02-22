// ============================================================
//  controllers/achievementController.js
//  GET /api/achievements — Return user's achievements + thresholds
// ============================================================
import User from "../models/User.js";
import { getThresholds, ACHIEVEMENT_NAMES, checkTierUpgrade } from "../services/achievementService.js";

/**
 * GET /api/achievements
 * Requires JWT auth (req.userId set by requireAuth middleware)
 */
export async function getAchievements(req, res) {
    try {
        const user = await User.findById(req.userId).select("achievements trophies username");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const thresholds = getThresholds();
        const achievements = {};

        for (const key in thresholds) {
            let userAch = user.achievements?.[key] || { count: 0, tier: 'none' };
            let count = userAch.count;
            let tier = userAch.tier || 'none';

            // Sync trophyCollector with the actual trophies field
            if (key === 'trophyCollector') {
                count = user.trophies;
                // If the stored tier is lower than what total trophies qualify for,
                // we sync it (background update)
                const eligibleTier = checkTierUpgrade(key, count);
                if (eligibleTier !== tier) {
                    const tierPath = `achievements.${key}.tier`;
                    await User.updateOne({ _id: user._id }, { $set: { [tierPath]: eligibleTier } });
                    tier = eligibleTier;
                }
            }

            achievements[key] = {
                name: ACHIEVEMENT_NAMES[key],
                count: count,
                tier: tier,
                thresholds: thresholds[key],
            };
        }

        res.json({ achievements });
    } catch (err) {
        console.error("[getAchievements] Error:", err);
        res.status(500).json({ error: "Failed to fetch achievements" });
    }
}
