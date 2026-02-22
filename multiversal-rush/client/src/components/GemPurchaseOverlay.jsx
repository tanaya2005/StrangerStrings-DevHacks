import React, { useState } from "react";
import "./GemPurchaseOverlay.css";
import useStore from "../store/store";

const API = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

const GEM_PACKS = [
    { gems: 20, price: 20, description: "Small pouch of gems", icon: "💎" },
    { gems: 50, price: 50, description: "Stack of gems", icon: "💎💎" },
    { gems: 100, price: 100, description: "Chest of gems", icon: "💰" },
];

export default function GemPurchaseOverlay({ onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const user = useStore(s => s.user);
    const setGems = useStore(s => s.setGems);

    const handlePurchase = async (pack) => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("mr_token");

            // 1. Create Order on Server
            const res = await fetch(`${API}/api/payments/create-checkout-session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    gems: pack.gems,
                    price: pack.price
                })
            });

            const orderData = await res.json();
            if (!res.ok) throw new Error(orderData.error || "Failed to create order");

            // 2. Open Razorpay Checkout
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "Multiversal Rush",
                description: `Purchase ${pack.gems} Gems`,
                image: "/logo192.png", // Or any logo path
                order_id: orderData.order_id,
                handler: async function (response) {
                    // 3. Verify Payment on Server
                    const verifyRes = await fetch(`${API}/api/payments/verify`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            gems: pack.gems
                        })
                    });

                    const verifyData = await verifyRes.json();
                    if (verifyRes.ok) {
                        setGems(verifyData.gems);
                        alert(`Success! ${pack.gems} gems added to your account.`);
                        onClose();
                    } else {
                        setError(verifyData.error || "Payment verification failed");
                    }
                },
                prefill: {
                    name: user?.username || "Player",
                    email: user?.email || "",
                },
                theme: {
                    color: "#00ffe0",
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err) {
            console.error("Purchase error:", err);
            setError(err.message || "Connection failed. Try again.");
            setLoading(false);
        }
    };

    return (
        <div className="gem-purchase-backdrop" onClick={onClose}>
            <div className="gem-purchase-card" onClick={(e) => e.stopPropagation()}>
                <header className="gem-purchase-header">
                    <div className="title-group">
                        <h2>TOP-UP GEMS (RAZORPAY)</h2>
                        <p>Get more 💎 via secure UPI/Cards!</p>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </header>

                <div className="gem-packs-grid">
                    {GEM_PACKS.map((pack) => (
                        <div key={pack.gems} className="gem-pack-item">
                            <div className="pack-icon">{pack.icon}</div>
                            <div className="pack-amount">{pack.gems} <span className="gem-text">GEMS</span></div>
                            <div className="pack-desc">{pack.description}</div>
                            <button
                                className="btn-buy"
                                onClick={() => handlePurchase(pack)}
                                disabled={loading}
                            >
                                {loading ? "..." : `₹${pack.price}`}
                            </button>
                        </div>
                    ))}
                </div>

                {error && <div className="purchase-error">{error}</div>}

                <footer className="gem-purchase-footer">
                    <p>Powered by Razorpay 🇮🇳</p>
                </footer>
            </div>
        </div>
    );
}
