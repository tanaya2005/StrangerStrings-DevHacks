// ============================================================
//  components/UI/MatchResultsOverlay.jsx
//  Shows match results, leveling progress, and action buttons
// ============================================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import socket from '../../socket/socket';
import './MatchResultsOverlay.css';

export default function MatchResultsOverlay() {
    const navigate = useNavigate();
    const matchResults = useStore((s) => s.matchResults);
    const showMatchResults = useStore((s) => s.showMatchResults);
    const hideMatchResults = useStore((s) => s.hideMatchResults);
    const playerName = useStore((s) => s.playerName);
    const setXP = useStore((s) => s.setXP);
    const setLevel = useStore((s) => s.setLevel);
    const setGems = useStore((s) => s.setGems);

    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        if (!showMatchResults) return;

        // Auto-update local state if "ME" is in results
        const myResult = matchResults.find(r => r.username === playerName);
        if (myResult) {
            if (myResult.newXP !== undefined) setXP(myResult.newXP);
            if (myResult.level !== undefined) setLevel(myResult.level);
            // Gems are updated in distributeTrophies on server, 
            // but we might want to fetch new gem count here or trust results
            // Note: user.gems incremented by gemsEarned. we add to current.
            if (myResult.gemsEarned > 0) {
                setGems(useStore.getState().gems + myResult.gemsEarned);
            }
        }

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleExit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showMatchResults, matchResults, playerName, setXP, setLevel, setGems]);

    useEffect(() => {
        const onRematchAccepted = () => {
            hideMatchResults();
            useStore.getState().setGameState("waiting");
            useStore.getState().setCurrentWorld(0);
            useStore.getState().setMyFinishResult(null);
            navigate('/lobby');
        };
        socket.on('rematchAccepted', onRematchAccepted);
        return () => socket.off('rematchAccepted', onRematchAccepted);
    }, [hideMatchResults, navigate]);

    const handleExit = () => {
        socket.emit('leaveRoom');
        hideMatchResults();
        navigate('/home');
    };

    const handlePlayAgain = () => {
        socket.emit('playAgain');
    };

    if (!showMatchResults || matchResults.length === 0) return null;

    // Sort results by place
    const sortedResults = [...matchResults].sort((a, b) => {
        if (a.place === 0) return 1; // Eliminated go last
        if (b.place === 0) return -1;
        return a.place - b.place;
    });

    const getMedalEmoji = (place) => {
        switch (place) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '';
        }
    };

    return (
        <div className="match-results-overlay">
            <div className="match-results-container">
                <h1 className="match-results-title">🏆 Match Results 🏆</h1>

                <div className="results-table">
                    <div className="results-header">
                        <div className="col-place">Rank</div>
                        <div className="col-player">Player</div>
                        <div className="col-xp">XP Gained</div>
                        <div className="col-rewards">Rewards</div>
                    </div>

                    {sortedResults.map((result, idx) => {
                        const isMe = result.username === playerName;
                        return (
                            <div
                                key={idx}
                                className={`result-row ${isMe ? 'highlight-me' : ''} ${result.place === 0 ? 'eliminated' : ''}`}
                            >
                                <div className="col-place">
                                    <span className="medal">{getMedalEmoji(result.place)}</span>
                                    <span>{result.place === 0 ? 'ELIM' : `#${result.place}`}</span>
                                </div>
                                <div className="col-player">
                                    <span className="player-name-text">{result.username}</span>
                                    {isMe && <span className="you-badge">YOU</span>}
                                    <div className="lvl-tag">LVL {result.level || 1}</div>
                                </div>
                                <div className="col-xp">
                                    <span style={{ color: '#00ffe0' }}>+{result.xpEarned || 100} XP</span>
                                </div>
                                <div className="col-rewards">
                                    <div className="reward-pill">+{result.trophiesEarned || 0} 🏆</div>
                                    {result.gemsEarned > 0 && (
                                        <div className="reward-pill gems">+{result.gemsEarned} 💎</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="match-actions">
                    <button className="btn-play-again" onClick={handlePlayAgain}>
                        Play Again
                    </button>
                    <button className="btn-exit" onClick={handleExit}>
                        Exit Room
                    </button>
                </div>

                <div className="return-message">
                    Auto-exiting in {countdown} seconds...
                </div>
            </div>
        </div>
    );
}
