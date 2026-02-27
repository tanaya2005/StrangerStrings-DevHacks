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
        let user = await User.findById(req.userId).select("achievements trophies username");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Initialize achievements object if it doesn't exist (for legacy users)
        if (!user.achievements) {
            const defaultAchievements = {
                jumpMaster: { count: 0, tier: 'none' },
                raceFinisher: { count: 0, tier: 'none' },
                podiumChampion: { count: 0, tier: 'none' },
                trophyCollector: { count: 0, tier: 'none' },
                survivorSpirit: { count: 0, tier: 'none' },
                speedDemon: { count: 0, tier: 'none' },
                unstoppableMomentum: { count: 0, tier: 'none' },
                laserDodger: { count: 0, tier: 'none' },
                untouchableRun: { count: 0, tier: 'none' },
                comebackKing: { count: 0, tier: 'none' },
            };
            
            await User.updateOne(
                { _id: user._id },
                { $set: { achievements: defaultAchievements } }
            );
            
            user.achievements = defaultAchievements;
        }

        const thresholds = getThresholds();
        const achievements = {};

        for (const key in thresholds) {
            // Ensure the specific achievement exists
            if (!user.achievements[key]) {
                user.achievements[key] = { count: 0, tier: 'none' };
            }

            let userAch = user.achievements[key];
            let count = userAch.count || 0;
            let tier = userAch.tier || 'none';

            // Sync trophyCollector with the actual trophies field
            if (key === 'trophyCollector') {
                count = user.trophies || 0;
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
        console.error("[getAchievements] Stack:", err.stack);
        res.status(500).json({ error: "Failed to fetch achievements", details: err.message });
    }
}
