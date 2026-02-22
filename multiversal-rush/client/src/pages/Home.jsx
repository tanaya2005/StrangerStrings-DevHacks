import React, { useEffect, useState, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import useStore from "../store/store";
import socket from "../socket/socket";
import HomeAvatar3D from "../components/HomeAvatar3D";
import SettingsOverlay from "../components/SettingsOverlay";
import LeaderboardOverlay from "../components/LeaderboardOverlay";
import ShopOverlay from "../components/ShopOverlay";
import "./Home.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function Home() {
    const navigate = useNavigate();
    const user = useStore((s) => s.user);
    const logout = useStore((s) => s.logout);
    const leaderboard = useStore((s) => s.leaderboard);
    const setLeaderboard = useStore((s) => s.setLeaderboard);

    // Shop state
    const gems = useStore((s) => s.gems);
    const setGems = useStore((s) => s.setGems);
    const setOwnedAvatars = useStore((s) => s.setOwnedAvatars);
    const setAvatar = useStore((s) => s.setAvatar);

    const avatar = useStore((s) => s.avatar);
    const [userRank, setUserRank] = useState(0);
    const [userTrophies, setUserTrophies] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showShop, setShowShop] = useState(false);
    const [showPlayModal, setShowPlayModal] = useState(false);

    useEffect(() => {
        async function fetchInitialData() {
            const token = localStorage.getItem("mr_token");
            try {
                // 1. Leaderboard & Stats
                const lbRes = await fetch(`${SERVER_URL}/api/leaderboard`);
                const lbData = await lbRes.json();
                setLeaderboard(lbData);

                const myData = lbData.find(p => p.username === user?.username);
                const myRank = lbData.findIndex(p => p.username === user?.username) + 1;

                setUserRank(myRank);
                setUserTrophies(myData?.trophies || 0);

                // 2. Shop & Inventory
                if (token) {
                    const shopRes = await fetch(`${SERVER_URL}/api/shop/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (shopRes.ok) {
                        const invData = await shopRes.json();
                        setGems(invData.gems);
                        setOwnedAvatars(invData.ownedAvatars);
                        if (invData.selectedAvatar) {
                            setAvatar(invData.selectedAvatar);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch initial home data:", err);
            }
        }
        fetchInitialData();
    }, [user, setLeaderboard, setGems, setOwnedAvatars, setAvatar]);

    const handlePlayNow = () => setShowPlayModal(true);
    const handleSoloPlay = () => { setShowPlayModal(false); navigate("/lobby"); };
    const handleTeamPlay = () => { setShowPlayModal(false); navigate("/team-join"); };
    const handleAchievements = () => navigate("/achievements");
    const handleFriends = () => navigate("/friends");
    const handleSettings = () => setShowSettings(true);
    const handleLeaderboard = () => setShowLeaderboard(true);
    const handleShop = () => setShowShop(true);

    const handleLogout = () => {
        if (socket.connected) socket.disconnect();
        logout();
        navigate("/");
    };

    return (
        <div className="home-page">
            {/* Dynamic Background */}
            <div className="home-bg-anim" />
            <div className="home-bg-grid" />

            {/* UI Overlay */}
            <div className="ui-overlay">

                {/* Top Section */}
                <div className="ui-top">
                    {/* Top Left: Name & Achievements */}
                    <div className="user-info-group">
                        <div className="player-name-card">
                            <div className="player-name">{user?.username || "PLAYER_X"}</div>
                            <div className="player-rank">
                                {userRank > 0 ? `RANK #${userRank}` : "UNRANKED"}
                            </div>
                        </div>
                        <button className="btn-hud btn-leaderboard" onClick={handleLeaderboard}>
                            <span>🏆</span> <span>LEADERBOARD</span>
                        </button>
                        <button className="btn-hud btn-achievements" onClick={handleAchievements}>
                            <span>🎖️</span> <span>ACHIEVEMENTS</span>
                        </button>
                    </div>

                    {/* Top Center: Game Title */}
                    <h1 className="game-title-main">
                        MULTIVERSAL RUSH
                    </h1>

                    {/* Top Right: Currency & Friends */}
                    <div className="top-right-group">
                        <div className="currency-container">
                            <div className="currency-item trophy-count" title="Trophies">
                                <span className="icon">🏆</span>
                                <span className="value">{userTrophies.toLocaleString()}</span>
                            </div>
                            <div className="currency-item gem-count" title="Gems">
                                <span className="icon">💎</span>
                                <span className="value">{gems.toLocaleString()}</span>
                                <button className="btn-gem-plus" onClick={handleShop}>+</button>
                            </div>
                        </div>
                        <button className="btn-hud btn-friends" onClick={handleFriends}>
                            <span>👥</span> <span>FRIENDS</span>
                        </button>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="ui-bottom">
                    {/* Bottom Left: Settings */}
                    <button className="btn-hud btn-settings" onClick={handleSettings}>
                        ⚙️
                    </button>

                    {/* Bottom Right: Shop */}
                    <button className="btn-hud btn-shop" onClick={handleShop}>
                        <span>🛒</span> <span>SHOP</span>
                    </button>
                </div>
            </div>

            {/* Center Section: 3D Avatar & Play Now */}
            <div className="home-center">
                <div className="center-avatar-container">
                    <div className="avatar-glow"></div>
                    <div className="avatar-main">
                        <Suspense fallback={<div className="avatar-loading">Loading 3D...</div>}>
                            <Canvas key={avatar} shadows dpr={[1, 2]} camera={{ position: [0, 0, 7], fov: 45 }}>
                                <HomeAvatar3D modelPath={avatar} />
                            </Canvas>
                        </Suspense>
                    </div>
                </div>

                <button className="btn-play-now" onClick={handlePlayNow}>
                    PLAY NOW
                </button>
            </div>

            {/* ── Play Mode Selection Modal ── */}
            {showPlayModal && (
                <div className="play-modal-backdrop" onClick={() => setShowPlayModal(false)}>
                    <div className="play-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="play-modal-close" onClick={() => setShowPlayModal(false)}>✕</button>
                        <h2 className="play-modal-title">CHOOSE YOUR MODE</h2>
                        <div className="play-modal-options">
                            <button className="play-mode-btn play-mode-solo" onClick={handleSoloPlay} id="btn-solo-mode">
                                <div className="play-mode-icon">🏃</div>
                                <div className="play-mode-label">SOLO</div>
                                <div className="play-mode-desc">Race through obstacle gauntlets</div>
                                <div className="play-mode-tag">Classic Mode</div>
                            </button>
                            <button className="play-mode-btn play-mode-team" onClick={handleTeamPlay} id="btn-team-mode">
                                <div className="play-mode-icon">🏁</div>
                                <div className="play-mode-label">TEAM</div>
                                <div className="play-mode-desc">Multiversal Relay — 3v3 team race</div>
                                <div className="play-mode-tag play-mode-tag-new">NEW</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlays */}
            {showSettings && (
                <SettingsOverlay
                    onClose={() => setShowSettings(false)}
                    onLogout={handleLogout}
                />
            )}
            {showLeaderboard && (
                <LeaderboardOverlay
                    onClose={() => setShowLeaderboard(false)}
                />
            )}
            {showShop && (
                <ShopOverlay
                    onClose={() => setShowShop(false)}
                />
            )}
        </div>
    );
}
