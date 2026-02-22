// ============================================================
//  pages/Home.jsx — Home page with profile and leaderboard
// ============================================================
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/store";
import socket from "../socket/socket";
import "./Home.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function Home() {
    const navigate = useNavigate();
    const user = useStore((s) => s.user);
    const logout = useStore((s) => s.logout);
    const setLeaderboard = useStore((s) => s.setLeaderboard);
    const leaderboard = useStore((s) => s.leaderboard);

    const [userStats, setUserStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Fetch user stats and leaderboard
    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch leaderboard
                const lbRes = await fetch(`${SERVER_URL}/api/leaderboard`);
                const lbData = await lbRes.json();
                setLeaderboard(lbData);

                // Find current user in leaderboard
                const myStats = lbData.find(p => p.username === user?.username);
                if (myStats) {
                    setUserStats(myStats);
                }
            } catch (err) {
                console.error("Failed to fetch data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, setLeaderboard]);

    // Listen for real-time leaderboard updates
    useEffect(() => {
        socket.on("leaderboardUpdate", ({ leaderboard: lb }) => {
            setLeaderboard(lb);
            const myStats = lb.find(p => p.username === user?.username);
            if (myStats) setUserStats(myStats);
        });
        return () => socket.off("leaderboardUpdate");
    }, [user, setLeaderboard]);

    function handleLogout() {
        if (socket.connected) socket.disconnect();
        logout();
        navigate("/");
    }

    function handlePlayNow() {
        navigate("/lobby");
    }

    const userRank = leaderboard.findIndex(p => p.username === user?.username) + 1;

    return (
        <div className="home-page">
            <div className="home-bg-anim" />

            {/* Sidebar Toggle Button (Mobile) */}
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? "✕" : "🏆"}
            </button>

            {/* Sidebar - Global Leaderboard */}
            <aside className={`home-sidebar ${sidebarOpen ? "open" : ""}`}>
                <div className="sidebar-header">
                    <h2>🏆 Global Leaderboard</h2>
                    <p className="sidebar-subtitle">Top 20 Players</p>
                </div>

                <div className="sidebar-content">
                    {loading ? (
                        <p className="sidebar-loading">Loading...</p>
                    ) : leaderboard.length === 0 ? (
                        <p className="sidebar-empty">No players yet</p>
                    ) : (
                        <div className="leaderboard-list">
                            {leaderboard.map((player, idx) => (
                                <div
                                    key={player._id}
                                    className={`lb-item ${player.username === user?.username ? "me" : ""}`}
                                >
                                    <span className="lb-rank">#{idx + 1}</span>
                                    <span className="lb-name">{player.username}</span>
                                    <span className="lb-trophies">🏆 {player.trophies}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="home-main">
                {/* Header */}
                <header className="home-header">
                    <div className="header-left">
                        <h1 className="home-title">🌌 Multiversal Rush</h1>
                    </div>
                    <button className="btn-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </header>

                {/* Profile Section */}
                <section className="profile-section">
                    <div className="profile-card">
                        <div className="profile-avatar">
                            {user?.username?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div className="profile-info">
                            <h2 className="profile-name">{user?.username || "Player"}</h2>
                            <p className="profile-email">{user?.email}</p>
                            {userRank > 0 && (
                                <p className="profile-rank">Global Rank: #{userRank}</p>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">🏆</div>
                            <div className="stat-value">{userStats?.trophies || 0}</div>
                            <div className="stat-label">Trophies</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">👑</div>
                            <div className="stat-value">{userStats?.wins || 0}</div>
                            <div className="stat-label">Wins</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">🎮</div>
                            <div className="stat-value">{userStats?.gamesPlayed || 0}</div>
                            <div className="stat-label">Games Played</div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon">📊</div>
                            <div className="stat-value">
                                {userStats?.gamesPlayed > 0
                                    ? `${((userStats.wins / userStats.gamesPlayed) * 100).toFixed(1)}%`
                                    : "0%"}
                            </div>
                            <div className="stat-label">Win Rate</div>
                        </div>
                    </div>
                </section>

                {/* Action Buttons */}
                <section className="actions-section">
                    <button className="btn-play" onClick={handlePlayNow}>
                        <span className="btn-icon">🚀</span>
                        <span className="btn-text">Play Now</span>
                    </button>

                    <button className="btn-secondary" onClick={() => navigate("/leaderboard")}>
                        <span className="btn-icon">🏆</span>
                        <span className="btn-text">View Full Leaderboard</span>
                    </button>

                    <button className="btn-secondary" onClick={() => navigate("/achievements")}>
                        <span className="btn-icon">🎖️</span>
                        <span className="btn-text">Achievements</span>
                    </button>
                </section>

                {/* Quick Stats */}
                {userStats && (
                    <section className="quick-stats">
                        <h3>Your Performance</h3>
                        <div className="progress-bars">
                            <div className="progress-item">
                                <div className="progress-label">
                                    <span>Trophies Progress</span>
                                    <span>{userStats.trophies} / 1000</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${Math.min((userStats.trophies / 1000) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="progress-item">
                                <div className="progress-label">
                                    <span>Games Played</span>
                                    <span>{userStats.gamesPlayed} / 100</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${Math.min((userStats.gamesPlayed / 100) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
