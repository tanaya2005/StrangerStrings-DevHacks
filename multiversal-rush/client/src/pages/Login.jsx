// ============================================================
//  pages/Login.jsx — Sign Up + Login (custom auth, no Firebase)
//
//  Sign Up requires:
//    • Unique username (3-20 chars, letters/numbers/underscore)
//    • Password (min 6 chars)
//    • Date of Birth → user must be 13+ years old
//
//  Login requires:
//    • Username + Password
//
//  On success → saves JWT to localStorage → navigates to /lobby
// ============================================================
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useStore from "../store/store";
import "./Login.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

// ---- Age validation helper (must be older than 12 = at least 13) ----
function calculateAge(dobString) {
    if (!dobString) return 0;
    const today = new Date();
    const birth = new Date(dobString);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// ---- Max allowed DOB (must be 13+ today) ----
function maxDOBString() {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

export default function Login() {
    const navigate = useNavigate();
    const setPlayerName = useStore((s) => s.setPlayerName);
    const setUser = useStore((s) => s.setUser);

    // ---- Tab state ----
    const [tab, setTab] = useState("login"); // "login" | "signup"

    // ---- Form fields ----
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [dob, setDob] = useState("");
    const [showPass, setShowPass] = useState(false);

    // ---- UI state ----
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ---- Reset form when switching tabs ----
    function switchTab(t) {
        setTab(t);
        setError("");
        setSuccess("");
        setUsername("");
        setPassword("");
        setDob("");
    }

    // ====================================================
    //  Sign Up handler
    // ====================================================
    async function handleSignup(e) {
        e.preventDefault();
        setError(""); setSuccess("");

        // --- Client-side validation ---
        if (!username.trim() || !password || !dob) {
            return setError("All fields are required.");
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
            const res = await fetch(`${SERVER_URL}/api/auth/signup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password, dateOfBirth: dob }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Signup failed. Try again.");
            } else {
                // ---- Success: save token + enter lobby ----
                localStorage.setItem("mr_token", data.token);
                localStorage.setItem("mr_user", JSON.stringify(data.user));
                setUser(data.user);
                setPlayerName(data.user.username);
                setSuccess("Account created! Entering the multiverse… 🚀");
                setTimeout(() => navigate("/lobby"), 800);
            }
        } catch (err) {
            setError("Cannot reach server. Is the backend running?");
        } finally {
            setLoading(false);
        }
    }

    // ====================================================
    //  Login handler
    // ====================================================
    async function handleLogin(e) {
        e.preventDefault();
        setError(""); setSuccess("");

        if (!username.trim() || !password) {
            return setError("Username and password are required.");
        }

        setLoading(true);
        try {
            const res = await fetch(`${SERVER_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim(), password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed. Check your credentials.");
            } else {
                localStorage.setItem("mr_token", data.token);
                localStorage.setItem("mr_user", JSON.stringify(data.user));
                setUser(data.user);
                setPlayerName(data.user.username);
                setSuccess("Welcome back! Entering the multiverse… 🚀");
                setTimeout(() => navigate("/lobby"), 800);
            }
        } catch (err) {
            setError("Cannot reach server. Is the backend running?");
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

                {/* ---- Logo + Title ---- */}
                <div className="login-logo">🌌</div>
                <h1 className="login-title">Multiversal Rush</h1>
                <p className="login-tagline">Race through dimensions. Survive. Win.</p>

                {/* ---- Tab Switcher ---- */}
                <div className="tab-bar" role="tablist">
                    <button
                        role="tab"
                        id="tab-login"
                        aria-selected={tab === "login"}
                        className={`tab-btn ${tab === "login" ? "active" : ""}`}
                        onClick={() => switchTab("login")}
                    >
                        Sign In
                    </button>
                    <button
                        role="tab"
                        id="tab-signup"
                        aria-selected={tab === "signup"}
                        className={`tab-btn ${tab === "signup" ? "active" : ""}`}
                        onClick={() => switchTab("signup")}
                    >
                        Sign Up
                    </button>
                    <div className={`tab-indicator ${tab === "signup" ? "right" : "left"}`} />
                </div>

                {/* ---- Form ---- */}
                <form
                    id={tab === "login" ? "login-form" : "signup-form"}
                    className="login-form"
                    onSubmit={tab === "login" ? handleLogin : handleSignup}
                    noValidate
                >

                    {/* Username */}
                    <div className="field-group">
                        <label className="field-label" htmlFor="input-username">Username</label>
                        <input
                            id="input-username"
                            className="login-input"
                            type="text"
                            placeholder="your_username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            maxLength={20}
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    {/* Password */}
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
                                type="button"
                                id="btn-toggle-pass"
                                className="toggle-pass"
                                onClick={() => setShowPass((v) => !v)}
                                aria-label={showPass ? "Hide password" : "Show password"}
                            >
                                {showPass ? "🙈" : "👁️"}
                            </button>
                        </div>
                    </div>

                    {/* Date of Birth — only on Sign Up */}
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
                                max={maxDOBString()}   /* browser can't pick a date that makes user under 13 */
                            />
                            {/* Live age preview */}
                            {dob && (
                                <span className={`age-preview ${calculateAge(dob) < 13 ? "age-fail" : "age-ok"}`}>
                                    {calculateAge(dob) < 13
                                        ? `❌ Too young (${calculateAge(dob)} yrs) — must be 13+`
                                        : `✅ Age ${calculateAge(dob)} — you're good!`}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Error / Success messages */}
                    {error && <p className="login-error" role="alert">{error}</p>}
                    {success && <p className="login-success" role="status">{success}</p>}

                    {/* Submit button */}
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

                {/* Footer hint */}
                <p className="login-hint">
                    {tab === "login"
                        ? "Don't have an account? Click Sign Up above."
                        : "Already have an account? Click Sign In above."}
                </p>

            </div>
        </div>
    );
}
