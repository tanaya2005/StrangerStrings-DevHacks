// ============================================================
//  components/UI/MatchResultsOverlay.jsx
//  Shows match results for 10 seconds after game ends
// ============================================================
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/store';
import './MatchResultsOverlay.css';

export default function MatchResultsOverlay() {
    const navigate = useNavigate();
    const matchResults = useStore((s) => s.matchResults);
    const showMatchResults = useStore((s) => s.showMatchResults);
    const hideMatchResults = useStore((s) => s.hideMatchResults);
    const playerName = useStore((s) => s.playerName);

    useEffect(() => {
        if (showMatchResults) {
            // After 10 seconds, hide results and return to home
            const timer = setTimeout(() => {
                hideMatchResults();
                navigate('/home');
            }, 10000);

            return () => clearTimeout(timer);
        }
    }, [showMatchResults, hideMatchResults, navigate]);

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

    const getPlaceText = (place) => {
        if (place === 0) return 'Eliminated';
        return `${place}${getOrdinalSuffix(place)} Place`;
    };

    const getOrdinalSuffix = (num) => {
        const j = num % 10;
        const k = num % 100;
        if (j === 1 && k !== 11) return 'st';
        if (j === 2 && k !== 12) return 'nd';
        if (j === 3 && k !== 13) return 'rd';
        return 'th';
    };

    return (
        <div className="match-results-overlay">
            <div className="match-results-container">
                <h1 className="match-results-title">🏆 Match Results 🏆</h1>
                
                <div className="results-table">
                    <div className="results-header">
                        <div className="col-place">Place</div>
                        <div className="col-player">Player</div>
                        <div className="col-trophies">Trophies Earned</div>
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
                                    <span className="place-text">{getPlaceText(result.place)}</span>
                                </div>
                                <div className="col-player">
                                    {result.username}
                                    {isMe && <span className="you-badge">YOU</span>}
                                </div>
                                <div className="col-trophies">
                                    {result.trophiesEarned > 0 ? (
                                        <span className="trophies-positive">+{result.trophiesEarned} 🏆</span>
                                    ) : (
                                        <span className="trophies-zero">0 🏆</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="return-message">
                    Returning to home in 10 seconds...
                </div>
            </div>
        </div>
    );
}
