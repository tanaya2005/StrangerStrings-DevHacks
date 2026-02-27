import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Stage, OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import useStore from "../store/store";
import "./ShopOverlay.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const ALL_CHARACTERS = [
    { id: "penguin", name: "Penguin", path: "/models/penguin/scene.gltf", price: 0 },
    { id: "red-panda", name: "Red Panda", path: "/models/red-panda/scene.gltf", price: 0 },
    { id: "shark", name: "Sharky", path: "/models/shark/scene.gltf", price: 20 },
    { id: "zoro", name: "Zoro", path: "/models/zoro/scene.gltf", price: 20 },
];

function ModelViewer({ path }) {
    const { scene } = useGLTF(path);
    // Clone the scene so multiple instances don't fight over the same primitive
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    return <primitive object={clonedScene} />;
}

export default function ShopOverlay({ onClose }) {
    const gems = useStore((s) => s.gems);
    const setGems = useStore((s) => s.setGems);
    const ownedAvatars = useStore((s) => s.ownedAvatars);
    const setOwnedAvatars = useStore((s) => s.setOwnedAvatars);
    const activeAvatar = useStore((s) => s.avatar);
    const setAvatar = useStore((s) => s.setAvatar);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const filteredCharacters = useMemo(() => {
        return ALL_CHARACTERS.filter((char) => {
            const isOwned = ownedAvatars.includes(char.path);
            if (filter === "owned") return isOwned;
            if (filter === "unowned") return !isOwned;
            return true;
        });
    }, [filter, ownedAvatars]);

    const currentChar = filteredCharacters[currentIndex];

    const handleNext = useCallback(() => {
        if (filteredCharacters.length === 0) return;
        setCurrentIndex((prev) => (prev + 1) % filteredCharacters.length);
        setMessage("");
    }, [filteredCharacters.length]);

    const handlePrev = useCallback(() => {
        if (filteredCharacters.length === 0) return;
        setCurrentIndex((prev) => (prev - 1 + filteredCharacters.length) % filteredCharacters.length);
        setMessage("");
    }, [filteredCharacters.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "ArrowLeft") handlePrev();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleNext, handlePrev]);

    useEffect(() => {
        setCurrentIndex(0);
        setMessage("");
    }, [filter]);

    const handlePurchase = async () => {
        if (!currentChar) return;
        setLoading(true);
        setMessage("");

        try {
            const token = localStorage.getItem("mr_token");
            const res = await fetch(`${SERVER_URL}/api/shop/purchase`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ avatarPath: currentChar.path, price: currentChar.price }),
            });

            const data = await res.json();
            if (res.ok) {
                setGems(data.gems);
                setOwnedAvatars(data.ownedAvatars);
                setMessage("Avatar Unlocked!");
            } else {
                setMessage(data.error || "Gems needed!");
            }
        } catch (err) {
            setMessage("Connection Lost");
        } finally {
            setLoading(false);
        }
    };

    const handleEquip = async () => {
        if (!currentChar) return;
        setLoading(true);
        setMessage("");

        try {
            const token = localStorage.getItem("mr_token");
            const res = await fetch(`${SERVER_URL}/api/shop/equip`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ avatarPath: currentChar.path }),
            });

            const data = await res.json();
            if (res.ok) {
                setAvatar(data.selectedAvatar);
                setMessage(`${currentChar.name} Selected`);
            } else {
                setMessage(data.error || "Equip failed");
            }
        } catch (err) {
            setMessage("Connection Lost");
        } finally {
            setLoading(false);
        }
    };

    const isOwned = useMemo(() => {
        if (!currentChar) return false;
        // Starter characters with price 0 are auto-owned
        return currentChar.price === 0 || ownedAvatars.includes(currentChar.path);
    }, [currentChar, ownedAvatars]);

    const isEquipped = currentChar ? activeAvatar === currentChar.path : false;

    return (
        <div className="shop-overlay-backdrop" onClick={onClose}>
            <div className="shop-overlay-card" onClick={(e) => e.stopPropagation()}>

                <header className="shop-header">
                    <div className="shop-title-group">
                        <div className="shop-logo-icon">🛒</div>
                        <div className="shop-text-group">
                            <h2 className="shop-title">CHARACTER SHOP</h2>
                            <p className="shop-subtitle">Unlock New Runners</p>
                        </div>
                    </div>
                    <div className="shop-stats">
                        <div className="shop-gems">
                            <span className="gem-val">{gems.toLocaleString()}</span>
                            <span className="gem-icon">💎</span>
                        </div>
                        <button className="btn-close-shop" onClick={onClose}>✕</button>
                    </div>
                </header>

                <nav className="shop-filters">
                    <button className={filter === "all" ? "active" : ""} data-filter="all" onClick={() => setFilter("all")}>ALL</button>
                    <button className={filter === "owned" ? "active" : ""} data-filter="owned" onClick={() => setFilter("owned")}>OWNED</button>
                    <button className={filter === "unowned" ? "active" : ""} data-filter="unowned" onClick={() => setFilter("unowned")}>UNOWNED</button>
                </nav>

                <div className="shop-main-content">
                    <div className="shop-display">
                        <button className="nav-arrow nav-prev" onClick={handlePrev} disabled={filteredCharacters.length <= 1}>‹</button>

                        <div className="avatar-preview-box">
                            <div className="preview-glow"></div>

                            {/* Locked Indicator Overlay - Only for Unowned */}
                            {!isOwned && currentChar && (
                                <div className="locked-badge-overlay">
                                    <div className="locked-icon">🔒</div>
                                    <span>LOCKED</span>
                                </div>
                            )}

                            {currentChar && (
                                <Canvas shadows dpr={[1, 2]} key={currentChar.id}>
                                    <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
                                    <React.Suspense fallback={null}>
                                        <Stage environment="city" intensity={0.6} contactShadow={{ opacity: 0.5, blur: 2 }} adjustCamera={true}>
                                            <ModelViewer path={currentChar.path} />
                                        </Stage>
                                    </React.Suspense>
                                    <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
                                </Canvas>
                            )}
                        </div>

                        <button className="nav-arrow nav-next" onClick={handleNext} disabled={filteredCharacters.length <= 1}>›</button>
                    </div>

                    <div className="shop-info">
                        {currentChar ? (
                            <div className="char-detail-card">
                                <div className="detail-top-tags">
                                    <div className="rarity-tag">PREMIUM RUNNER</div>
                                    {!isOwned && (
                                        <div className="price-badge">
                                            <span>💎</span> {currentChar.price}
                                        </div>
                                    )}
                                </div>

                                <h3 className="char-name">{currentChar.name}</h3>

                                <div className="char-status">
                                    {message ? <p className="shop-message active">{message}</p> : <p className="shop-message">Choose your avatar</p>}
                                </div>

                                <div className="shop-controls">
                                    {isOwned ? (
                                        <button
                                            className={`btn-shop-action ${isEquipped ? 'equipped' : 'equip'}`}
                                            onClick={handleEquip}
                                            disabled={isEquipped || loading}
                                        >
                                            {isEquipped ? "CURRENTLY ACTIVE" : "SELECT CHARACTER"}
                                        </button>
                                    ) : (
                                        <button
                                            className="btn-shop-action buy"
                                            onClick={handlePurchase}
                                            disabled={loading || gems < currentChar.price}
                                        >
                                            {loading ? "UNLOCKING..." : `BUY FOR ${currentChar.price} GEMS`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="no-chars-msg">
                                <div className="no-chars-icon">✨</div>
                                <h3>COLLECTION COMPLETE</h3>
                                <p>You have unlocked all available characters in this category!</p>
                                <button className="btn-hud" style={{ marginTop: '20px' }} onClick={() => setFilter("all")}>VIEW ALL</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
