// ============================================================
//  components/UI/AchievementPopup.jsx
//  Animated popup when an achievement tier is unlocked.
//  Auto-dismisses after 4 seconds.
// ============================================================
import React, { useEffect, useState } from "react";
import useStore from "../../store/store";

const TIER_COLORS = {
    bronze: { bg: "rgba(205,127,50,0.25)", border: "#cd7f32", text: "#cd7f32", emoji: "🥉" },
    silver: { bg: "rgba(192,192,192,0.25)", border: "#c0c0c0", text: "#c0c0c0", emoji: "🥈" },
    gold: { bg: "rgba(255,215,0,0.25)", border: "#ffd700", text: "#ffd700", emoji: "🥇" },
};

export default function AchievementPopup() {
    const popup = useStore((s) => s.achievementPopup);
    const dismiss = useStore((s) => s.dismissAchievementPopup);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (popup) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(dismiss, 400); // wait for slide-out animation
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [popup, dismiss]);

    if (!popup) return null;

    const tier = TIER_COLORS[popup.newTier] || TIER_COLORS.bronze;

    return (
        <div style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 9999,
            background: tier.bg,
            border: `2px solid ${tier.border}`,
            borderRadius: 16,
            padding: "16px 24px",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            minWidth: 280,
            boxShadow: `0 0 30px ${tier.border}40`,
            transform: visible ? "translateX(0)" : "translateX(120%)",
            opacity: visible ? 1 : 0,
            transition: "all 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55)",
            fontFamily: "'Exo 2', 'Segoe UI', sans-serif",
            pointerEvents: "none",
        }}>
            {/* Medal icon */}
            <div style={{ fontSize: 42, lineHeight: 1 }}>
                {tier.emoji}
            </div>

            <div>
                <div style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    color: "#ffffffaa",
                    marginBottom: 2,
                }}>
                    Achievement Unlocked!
                </div>
                <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#fff",
                }}>
                    {popup.achievement}
                </div>
                <div style={{
                    fontSize: 13,
                    color: tier.text,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    marginTop: 2,
                }}>
                    {popup.newTier} Medal
                </div>
            </div>
        </div>
    );
}
