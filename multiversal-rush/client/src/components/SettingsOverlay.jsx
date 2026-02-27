import React, { useState } from "react";
import "./SettingsOverlay.css";

/**
 * SettingsOverlay component
 * Provides volume controls and a logout option in a compact modal.
 */
export default function SettingsOverlay({ onClose, onLogout }) {
    const [musicVol, setMusicVol] = useState(80);
    const [gameVol, setGameVol] = useState(100);

    // Prevent click propagation to the backdrop
    const handleCardClick = (e) => e.stopPropagation();

    return (
        <div className="settings-overlay-backdrop" onClick={onClose}>
            <div className="settings-overlay-card" onClick={handleCardClick}>

                <header className="settings-header">
                    <h2 className="settings-title">SETTINGS</h2>
                    <button className="btn-close-settings" onClick={onClose}>✕</button>
                </header>

                <div className="settings-group">
                    {/* Music Volume Control */}
                    <div className="setting-item">
                        <div className="setting-label">
                            <span>MUSIC VOLUME</span>
                            <span>{musicVol}%</span>
                        </div>
                        <input
                            type="range"
                            className="settings-slider"
                            value={musicVol}
                            onChange={(e) => setMusicVol(e.target.value)}
                            min="0" max="100"
                        />
                    </div>

                    {/* Game/SFX Volume Control */}
                    <div className="setting-item">
                        <div className="setting-label">
                            <span>SFX VOLUME</span>
                            <span>{gameVol}%</span>
                        </div>
                        <input
                            type="range"
                            className="settings-slider"
                            value={gameVol}
                            onChange={(e) => setGameVol(e.target.value)}
                            min="0" max="100"
                        />
                    </div>
                </div>

                {/* System Actions */}
                <div className="settings-actions">
                    <button className="btn-logout-settings" onClick={onLogout}>
                        LOGOUT SESSION
                    </button>
                </div>

            </div>
        </div>
    );
}
