// ============================================================
//  services/achievementService.js — Achievement tracking engine
//  Refactored to match requested signatures and sequential logic.
// ============================================================
import User from "../models/User.js";

// ---- Tier thresholds for each achievement ----
const THRESHOLDS = {
    jumpMaster: { bronze: 50, silver: 100, gold: 200 },
    raceFinisher: { bronze: 10, silver: 25, gold: 50 },
    podiumChampion: { bronze: 5, silver: 15, gold: 30 },
    trophyCollector: { bronze: 50, silver: 200, gold: 500 },
    survivorSpirit: { bronze: 5, silver: 15, gold: 30 },
    speedDemon: { bronze: 3, silver: 10, gold: 25 },
    unstoppableMomentum: { bronze: 500, silver: 1500, gold: 3000 },
    laserDodger: { bronze: 25, silver: 75, gold: 150 },
    untouchableRun: { bronze: 2, silver: 5, gold: 15 },
    comebackKing: { bronze: 2, silver: 5, gold: 12 },
};

// Tier order
const TIER_ORDER = ['none', 'bronze', 'silver', 'gold'];

// Human-readable names
export const ACHIEVEMENT_NAMES = {
    jumpMaster: "Jump Master",
    raceFinisher: "Race Finisher",
    podiumChampion: "Podium Champion",
    trophyCollector: "Trophy Collector",
    survivorSpirit: "Survivor Spirit",
    speedDemon: "Speed Demon",
    unstoppableMomentum: "Unstoppable Momentum",
    laserDodger: "Laser Dodger",
    untouchableRun: "Untouchable Run",
    comebackKing: "Comeback King",
};

/**
 * 1. checkTierUpgrade(type, count)
 * Returns the highest tier the current count qualifies for.
 */
export function checkTierUpgrade(type, count) {
    const t = THRESHOLDS[type];
    if (!t) return 'none';
    if (count >= t.gold) return 'gold';
    if (count >= t.silver) return 'silver';
    if (count >= t.bronze) return 'bronze';
    return 'none';
}

/**
 * 2. awardMedalIfEligible(username, type, count, currentTier)
 * Logic to upgrade tier sequentially (cannot skip tiers).
 * Returns the new tier if upgraded, otherwise null.
 */
export async function awardMedalIfEligible(username, type, count, currentTier) {
    const highestEligibleTier = checkTierUpgrade(type, count);

    // Check if highest eligible is better than current
    const currentIndex = TIER_ORDER.indexOf(currentTier || 'none');
    const highestIndex = TIER_ORDER.indexOf(highestEligibleTier);

    if (highestIndex > currentIndex) {
        // SEQUENTIAL UPGRADE: only move to the NEXT tier
        const nextTier = TIER_ORDER[currentIndex + 1];

        const tierPath = `achievements.${type}.tier`;
        await User.updateOne(
            { username },
            { $set: { [tierPath]: nextTier } }
        );

        console.log(`[Achievements] ${username} upgraded ${type}: ${currentTier} -> ${nextTier}`);
        return nextTier;
    }

    return null;
}

/**
 * 3. updateAchievement(username, type, incrementValue)
 * Main entry point called by sockets/controllers.
 */
export async function updateAchievement(username, type, incrementValue = 1) {
    if (!THRESHOLDS[type]) return null;

    try {
        const updatePath = `achievements.${type}.count`;

        // Atomically increment the achievement counter
        const user = await User.findOneAndUpdate(
            { username },
            { $inc: { [updatePath]: incrementValue } },
            { new: true }
        );

        if (!user) return null;

        const ach = user.achievements[type];

        // SPECIAL CASE: trophyCollector should always mirror the total trophies
        let currentCount = ach.count;
        if (type === 'trophyCollector') {
            currentCount = user.trophies;
        }

        const newTier = await awardMedalIfEligible(username, type, currentCount, ach.tier);

        if (newTier) {
            return {
                achievement: ACHIEVEMENT_NAMES[type],
                achievementKey: type,
                newTier: newTier,
                count: ach.count
            };
        }
        return null;
    } catch (err) {
        console.error(`[AchievementService] Error:`, err);
        return null;
    }
}

export function getThresholds() { return THRESHOLDS; }

export default {
    updateAchievement,
    checkTierUpgrade,
    awardMedalIfEligible,
    getThresholds,
    ACHIEVEMENT_NAMES
};
