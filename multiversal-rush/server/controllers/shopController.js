// ============================================================
//  controllers/shopController.js
//  Handles avatar purchases and inventory
// ============================================================
import User from "../models/User.js";

/**
 * GET /api/shop/me
 * Returns current user's gems and owned avatars.
 */
export async function getInventory(req, res) {
    try {
        const user = await User.findById(req.userId).select("gems xp level ownedAvatars selectedAvatar");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        console.error("[Shop GET]", err);
        res.status(500).json({ error: "Server error" });
    }
}

/**
 * POST /api/shop/equip
 * Body: { avatarPath }
 */
export async function equipAvatar(req, res) {
    try {
        const { avatarPath } = req.body;
        const user = await User.findById(req.userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        // Check if owned
        if (!user.ownedAvatars.includes(avatarPath)) {
            // Check if it's a default/free avatar not in the list yet
            const defaultAvatars = ["/models/penguin/scene.gltf", "/models/red-panda/scene.gltf"];
            if (!defaultAvatars.includes(avatarPath)) {
                return res.status(400).json({ error: "You don't own this avatar" });
            }
        }

        user.selectedAvatar = avatarPath;
        await user.save();

        res.json({
            message: "Avatar equipped!",
            selectedAvatar: user.selectedAvatar
        });
    } catch (err) {
        console.error("[Shop EQUIP]", err);
        res.status(500).json({ error: "Server error" });
    }
}

/**
 * POST /api/shop/purchase
 * Body: { avatarPath, price }
 */
export async function purchaseAvatar(req, res) {
    try {
        const { avatarPath, price = 20 } = req.body;
        const user = await User.findById(req.userId);

        if (!user) return res.status(404).json({ error: "User not found" });

        // Check if already owned
        if (user.ownedAvatars.includes(avatarPath)) {
            return res.status(400).json({ error: "You already own this avatar" });
        }

        // Check gems
        if (user.gems < price) {
            return res.status(400).json({ error: "Not enough gems" });
        }

        // Deduct gems and add avatar
        user.gems -= price;
        user.ownedAvatars.push(avatarPath);
        await user.save();

        res.json({
            message: "Purchase successful!",
            gems: user.gems,
            ownedAvatars: user.ownedAvatars
        });
    } catch (err) {
        console.error("[Shop PURCHASE]", err);
        res.status(500).json({ error: "Server error" });
    }
}
