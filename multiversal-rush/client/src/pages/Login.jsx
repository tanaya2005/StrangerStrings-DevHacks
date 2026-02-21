// ============================================================
//  pages/Login.jsx — Sign Up + Sign In
//
//  Sign Up (Atharva's DB + Varun's DOB):
//    • Email (unique account identifier — Atharva)
//    • Username (3-20 chars, display name — both)
//    • Password (min 6 chars)
//    • Date of Birth (must be 13+) — Varun
//
//  Sign In (Atharva's pattern):
//    • Email + Password
//
//  Frontend: Varun's cyberpunk design (kept intact)
//  Backend : Atharva's User schema (email = login key)
// ============================================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/store";
import "./Login.css";

// Use relative URLs — handled by Vite proxy → http://localhost:5000
const API = "/api";

// ---- Age helper ----
function calculateAge(dobString) {
    if (!dobString) return 0;
    const today = new Date();
    const birth = new Date(dobString);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// Browsers can't pick a DOB that would make user < 13
function maxDOBString() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().split("T")[0];
}

export default function Login() {
    const navigate = useNavigate();
    const setPlayerName = useStore((s) => s.setPlayerName);
    const setUser = useStore((s) => s.setUser);

    // ---- Tab ----
    const [tab, setTab] = useState("login");

    // ---- Sign-up fields ----
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [dob, setDob] = useState("");
    const [showPass, setShowPass] = useState(false);

    // ---- Login fields (reuse email/password from above) ----

    // ---- UI ----
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    function switchTab(t) {
        setTab(t);
        setError(""); setSuccess("");
        setEmail(""); setUsername(""); setPassword(""); setDob("");
    }

    // ---- Receives the response user object and logs in ----
    function handleAuthSuccess(data) {
        localStorage.setItem("mr_token", data.token);
        localStorage.setItem("mr_user", JSON.stringify(data.user));
        setUser(data.user);
        setPlayerName(data.user.username);  // username shown in lobby / game
    }

    // ====================================================
    //  Sign Up
    // ====================================================
    async function handleSignup(e) {
        e.preventDefault();
        setError(""); setSuccess("");

        if (!email.trim() || !username.trim() || !password || !dob) {
            return setError("All fields are required.");
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return setError("Please enter a valid email address.");
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return setError("Username: 3-20 chars, letters/numbers/underscore only.");
        }
        if (password.length < 6) {
            return setError("Password must be at least 6 characters.");
        }
        const age = calculateAge(dob);
        if (age < 13) {
            return setError("You must be at least 13 years old to play Multiversal Rush. 🚫");
        }

        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    username: username.trim(),
                    password,
                    dateOfBirth: dob,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Signup failed. Try again.");
            } else {
                handleAuthSuccess(data);
                // Navigate immediately — token is in localStorage now
                navigate("/home", { replace: true });
            }
        } catch (err) {
            setError("Cannot reach server. Is the backend running?");
            console.error("[signup]:", err);
        } finally {
            setLoading(false);
        }
    }

    // ====================================================
    //  Sign In
    // ====================================================
    async function handleLogin(e) {
        e.preventDefault();
        setError(""); setSuccess("");

        if (!email.trim() || !password) {
            return setError("Email and password are required.");
        }

        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed. Check your credentials.");
            } else {
                handleAuthSuccess(data);
                // Navigate immediately — token is in localStorage now
                navigate("/home", { replace: true });
            }
        } catch (err) {
            setError("Cannot reach server. Is the backend running?");
            console.error("[login]:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-bg-anim" />

            {/* Floating particles */}
            <div className="particles">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="particle" style={{ "--i": i }} />
                ))}
            </div>

            <div className="login-card">

                {/* ---- Logo ---- */}
                <div className="login-logo">🌌</div>
                <h1 className="login-title">Multiversal Rush</h1>
                <p className="login-tagline">Race through dimensions. Survive. Win.</p>

                {/* ---- Tab switcher ---- */}
                <div className="tab-bar" role="tablist">
                    <button
                        role="tab" id="tab-login"
                        aria-selected={tab === "login"}
                        className={`tab-btn ${tab === "login" ? "active" : ""}`}
                        onClick={() => switchTab("login")}
                    >Sign In</button>
                    <button
                        role="tab" id="tab-signup"
                        aria-selected={tab === "signup"}
                        className={`tab-btn ${tab === "signup" ? "active" : ""}`}
                        onClick={() => switchTab("signup")}
                    >Sign Up</button>
                    <div className={`tab-indicator ${tab === "signup" ? "right" : "left"}`} />
                </div>

                {/* ---- Form ---- */}
                <form
                    id={tab === "login" ? "login-form" : "signup-form"}
                    className="login-form"
                    onSubmit={tab === "login" ? handleLogin : handleSignup}
                    noValidate
                >

                    {/* Email — always shown */}
                    <div className="field-group">
                        <label className="field-label" htmlFor="input-email">Email</label>
                        <input
                            id="input-email"
                            className="login-input"
                            type="email"
                            placeholder="you@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                        />
                    </div>

                    {/* Username — signup only */}
                    {tab === "signup" && (
                        <div className="field-group">
                            <label className="field-label" htmlFor="input-username">
                                Username
                                <span className="field-hint"> (shown in-game)</span>
                            </label>
                            <input
                                id="input-username"
                                className="login-input"
                                type="text"
                                placeholder="your_username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                maxLength={20}
                                autoComplete="username"
                            />
                        </div>
                    )}

                    {/* Password — always shown */}
                    <div className="field-group">
                        <label className="field-label" htmlFor="input-password">Password</label>
                        <div className="password-row">
                            <input
                                id="input-password"
                                className="login-input"
                                type={showPass ? "text" : "password"}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                autoComplete={tab === "login" ? "current-password" : "new-password"}
                            />
                            <button
                                type="button" id="btn-toggle-pass"
                                className="toggle-pass"
                                onClick={() => setShowPass((v) => !v)}
                                aria-label={showPass ? "Hide password" : "Show password"}
                            >
                                {showPass ? "🙈" : "👁️"}
                            </button>
                        </div>
                    </div>

                    {/* Date of Birth — signup only */}
                    {tab === "signup" && (
                        <div className="field-group">
                            <label className="field-label" htmlFor="input-dob">
                                Date of Birth
                                <span className="field-hint"> (must be 13+)</span>
                            </label>
                            <input
                                id="input-dob"
                                className="login-input"
                                type="date"
                                value={dob}
                                onChange={(e) => setDob(e.target.value)}
                                max={maxDOBString()}
                            />
                            {dob && (
                                <span className={`age-preview ${calculateAge(dob) < 13 ? "age-fail" : "age-ok"}`}>
                                    {calculateAge(dob) < 13
                                        ? `❌ Too young (${calculateAge(dob)} yrs) — must be 13+`
                                        : `✅ Age ${calculateAge(dob)} — you're good!`}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Feedback */}
                    {error && <p className="login-error" role="alert">{error}</p>}
                    {success && <p className="login-success" role="status">{success}</p>}

                    {/* Submit */}
                    <button
                        id={tab === "login" ? "btn-signin" : "btn-signup"}
                        className="btn-enter"
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Warping…"
                            : tab === "login"
                                ? "Enter the Multiverse →"
                                : "Create Account →"}
                    </button>
                </form>

                <p className="login-hint">
                    {tab === "login"
                        ? "Don't have an account? Click Sign Up above."
                        : "Already have an account? Click Sign In above."}
                </p>

            </div>
        </div>
    );
}
