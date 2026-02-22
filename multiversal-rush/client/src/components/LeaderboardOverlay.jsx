import React from "react";
import "./LeaderboardOverlay.css";
import useStore from "../store/store";

/**
 * LeaderboardOverlay component
 * Displays the top players in a stylized race-results layout.
 */
export default function LeaderboardOverlay({ onClose }) {
    const leaderboard = useStore((s) => s.leaderboard);
    const currentUser = useStore((s) => s.user);

    // Prevent click propagation to the backdrop
    const handleCardClick = (e) => e.stopPropagation();

    return (
        <div className="leaderboard-overlay-backdrop" onClick={onClose}>
            <div className="leaderboard-card" onClick={handleCardClick}>

                <header className="leaderboard-header">
                    <div className="leaderboard-title-group">
                        <h2>LEADERBOARD</h2>
                        <p>Global Rankings</p>
                    </div>
                    <button className="btn-close-leaderboard" onClick={onClose}>✕</button>
                </header>

                <div className="leaderboard-list">
                    <div className="lb-table-header">
                        <div className="col-rank">Rank</div>
                        <div className="col-player">Player</div>
                        <div className="col-trophies">Trophies</div>
                    </div>

                    <div className="lb-scroll-area">
                        {leaderboard && leaderboard.length > 0 ? (
                            leaderboard.map((player, index) => {
                                const isMe = player.username === currentUser?.username;
                                const place = index + 1;
                                const getMedalEmoji = (p) => {
                                    if (p === 1) return '🥇';
                                    if (p === 2) return '🥈';
                                    if (p === 3) return '🥉';
                                    return '';
                                };
                                return (
                                    <div key={player._id || player.username} className={`lb-row ${isMe ? "is-me" : ""}`}>
                                        <div className="col-rank">
                                            <span className="medal">{getMedalEmoji(place)}</span>
                                            <span className="rank-text">#{place}</span>
                                        </div>

                                        <div className="col-player">
                                            <div className="player-avatar-circle">
                                                {player.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="player-name-text">
                                                {player.username} {isMe && <span className="you-tag">YOU</span>}
                                            </span>
                                        </div>

                                        <div className="col-trophies">
                                            <span className="trophy-val">{player.trophies.toLocaleString()}</span>
                                            <span className="trophy-icon">🏆</span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="lb-loading">Syncing with Multiverse...</div>
                        )}
                    </div>
                </div>

                <div className="lb-footer">
                    <p>Rankings update after every race</p>
                </div>

            </div>
        </div>
    );
}
