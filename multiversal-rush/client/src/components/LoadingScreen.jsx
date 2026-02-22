import React from "react";
import "./LoadingScreen.css";

/**
 * LoadingScreen component
 * Displays a centered logo/portal, a spinner, and an animated message.
 */
const LoadingScreen = () => {
    return (
        <div className="loading-container" id="splash-screen">
            <div className="loading-content">
                {/* Modern CSS-based Portal Logo */}
                <div className="loading-logo-container">
                    <div className="logo-portal"></div>
                    <span className="logo-text">MR</span>
                </div>

                {/* Spinner and Text */}
                <div className="spinner-wrapper">
                    <div className="spinner" id="loading-spinner"></div>
                    <p className="loading-phrase">Syncing Universes...</p>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
