// ============================================================
//  pages/Achievements.jsx — Achievement showcase page
//  Displays all 10 achievements with progress bars, medals,
//  and tier status. Fetches from GET /api/achievements.
// ============================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/store";
import "./Achievements.css";

const TIER_CONFIG = {
    none: { emoji: "🔒", label: "Locked", color: "#555" },
    bronze: { emoji: "🥉", label: "Bronze", color: "#cd7f32" },
    silver: { emoji: "🥈", label: "Silver", color: "#c0c0c0" },
    gold: { emoji: "🥇", label: "Gold", color: "#ffd700" },
};

const DESCRIPTIONS = {
    jumpMaster: "Total jumps across all matches",
    raceFinisher: "Total races completed",
    podiumChampion: "Top 3 finishes",
    trophyCollector: "Total trophies earned",
    survivorSpirit: "Survive avalanche / final pressure zone",
    speedDemon: "Total wins (1st place finishes)",
    unstoppableMomentum: "Total slide distance traveled (m)",
    laserDodger: "Lasers avoided successfully",
    untouchableRun: "Finish a race without being hit",
    comebackKing: "Win after being outside Top 3 at halfway",
};

const ICONS = {
    jumpMaster: "🦘",
    raceFinisher: "🏁",
    podiumChampion: "🏆",
    trophyCollector: "💎",
    survivorSpirit: "🛡️",
    speedDemon: "⚡",
    unstoppableMomentum: "🏄",
    laserDodger: "🔴",
    untouchableRun: "✨",
    comebackKing: "👑",
};

export default function Achievements() {
    const navigate = useNavigate();
    const achievements = useStore((s) => s.achievements);
    const setAchievements = useStore((s) => s.setAchievements);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeFilter, setActiveFilter] = useState("all"); // "all" | "complete" | "incomplete"

    useEffect(() => {
        async function fetchAchievements() {
            try {
                const token = localStorage.getItem("mr_token");
                const res = await fetch("/api/achievements", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok) {
                    setAchievements(data.achievements);
                } else {
                    setError(data.error || "Failed to load achievements");
                }
            } catch (err) {
                setError("Cannot reach server");
            } finally {
                setLoading(false);
            }
        }
        fetchAchievements();
    }, [setAchievements]);

    // Calculate progress percentage toward next tier
    function getProgress(ach) {
        if (!ach) return { percent: 0, label: "0 / 0" };
        const { count, thresholds, tier } = ach;

        let target;
        if (tier === "none") target = thresholds.bronze;
        else if (tier === "bronze") target = thresholds.silver;
        else if (tier === "silver") target = thresholds.gold;
        else target = thresholds.gold; // already gold — show 100%

        const percent = Math.min((count / target) * 100, 100);
        return { percent, label: `${count} / ${target}` };
    }

    if (loading) {
        return (
            <div className="ach-page">
                <div className="ach-loading">Loading achievements...</div>
            </div>
        );
    }

    return (
        <div className="ach-page">
            <div className="ach-bg-anim" />

            <div className="ach-container">
                <div className="ach-header">
                    <button className="ach-back-btn" onClick={() => navigate("/home")}>
                        ← Back
                    </button>
                    <h1 className="ach-title">🏆 Achievements</h1>
                    <p className="ach-subtitle">Track your progress across all matches</p>
                </div>

                {error && <p className="ach-error">{error}</p>}

                {/* Filter Tabs */}
                {(() => {
                    const entries = Object.entries(achievements);
                    const completeCount = entries.filter(([, a]) => a.tier !== "none").length;
                    const incompleteCount = entries.length - completeCount;

                    const filtered = entries.filter(([, ach]) => {
                        if (activeFilter === "complete") return ach.tier !== "none";
                        if (activeFilter === "incomplete") return ach.tier === "none";
                        return true;
                    });

                    return (
                        <>
                            <div className="ach-filter-tabs">
                                {[
                                    { id: "all", label: "All", count: entries.length },
                                    { id: "complete", label: "Complete", count: completeCount },
                                    { id: "incomplete", label: "Incomplete", count: incompleteCount },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        className={`ach-filter-tab ${activeFilter === tab.id ? "active" : ""}`}
                                        onClick={() => setActiveFilter(tab.id)}
                                    >
                                        {tab.label}
                                        <span className="ach-filter-count">{tab.count}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="ach-grid">
                                {filtered.map(([key, ach]) => {
                                    const tierCfg = TIER_CONFIG[ach.tier] || TIER_CONFIG.none;
                                    const progress = getProgress(ach);
                                    const isMaxed = ach.tier === "gold";

                                    return (
                                        <div
                                            key={key}
                                            className={`ach-card ${ach.tier !== "none" ? "unlocked" : "locked"} ${isMaxed ? "maxed" : ""}`}
                                            style={{ "--tier-color": tierCfg.color }}
                                        >
                                            <div className="ach-card-icon">{ICONS[key]}</div>
                                            <div className="ach-card-body">
                                                <div className="ach-card-name">{ach.name}</div>
                                                <div className="ach-card-desc">{DESCRIPTIONS[key]}</div>

                                                {/* Progress bar */}
                                                <div className="ach-progress-track">
                                                    <div
                                                        className="ach-progress-fill"
                                                        style={{
                                                            width: `${progress.percent}%`,
                                                            background: tierCfg.color,
                                                        }}
                                                    />
                                                </div>
                                                <div className="ach-progress-label">{progress.label}</div>

                                                {/* Tier badges */}
                                                <div className="ach-tiers">
                                                    {["bronze", "silver", "gold"].map((t) => {
                                                        const earned =
                                                            (t === "bronze" && ["bronze", "silver", "gold"].includes(ach.tier)) ||
                                                            (t === "silver" && ["silver", "gold"].includes(ach.tier)) ||
                                                            (t === "gold" && ach.tier === "gold");
                                                        return (
                                                            <span
                                                                key={t}
                                                                className={`ach-tier-badge ${earned ? "earned" : ""}`}
                                                                title={`${t}: ${ach.thresholds[t]}`}
                                                            >
                                                                {TIER_CONFIG[t].emoji}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Medal overlay */}
                                            <div className="ach-medal">{tierCfg.emoji}</div>
                                        </div>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <div className="ach-empty">
                                        {activeFilter === "complete"
                                            ? "No achievements completed yet — keep playing! 🎮"
                                            : "All achievements completed — you're a legend! 🏆"}
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}
