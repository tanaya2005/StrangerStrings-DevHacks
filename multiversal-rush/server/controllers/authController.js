// ============================================================
//  controllers/authController.js
//  Merged: Atharva's email-based auth + Varun's DOB age check
//  Login: email + password
//  Signup: email + username + password + dateOfBirth (13+)
// ============================================================
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "multiversal_rush_secret_key";
const JWT_EXPIRES = "30d";   // Atharva's preference

// ---- Helper: generate JWT ----
function generateToken(id, username) {
    return jwt.sign({ id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ---- Helper: calculate age ----
function calculateAge(dob) {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

// ============================================================
//  POST /api/auth/signup
//  Body: { email, username, password, dateOfBirth }
// ============================================================
export async function signup(req, res) {
    try {
        const { email, username, password, dateOfBirth } = req.body;

        // --- Required fields ---
        if (!email || !username || !password || !dateOfBirth) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // --- Username format ---
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({
                error: "Username must be 3-20 characters (letters, numbers, underscore only)",
            });
        }

        // --- Password length ---
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        // --- Age check: 13+ ---
        const age = calculateAge(dateOfBirth);
        if (isNaN(age) || age < 13) {
            return res.status(400).json({
                error: "You must be at least 13 years old to play Multiversal Rush",
            });
        }

        // --- Check email already taken ---
        const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (emailExists) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }

        // --- Check username already taken ---
        const usernameExists = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, "i") },
        });
        if (usernameExists) {
            return res.status(409).json({ error: "Username is already taken" });
        }

        // --- Create user (password hashed by pre-save hook) ---
        const user = await User.create({
            email: email.toLowerCase().trim(),
            username: username.trim(),
            password,                   // pre-save hook will hash this
            dateOfBirth: new Date(dateOfBirth),
        });

        const token = generateToken(user._id, user.username);

        res.status(201).json({
            message: "Account created successfully!",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                trophies: user.trophies,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
                xp: user.xp || 0,
                level: user.level || 1,
            },
        });
    } catch (err) {
        console.error("[signup error]", err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[0];
            return res.status(409).json({ error: `${field} is already taken` });
        }
        res.status(500).json({ error: "Server error. Please try again." });
    }
}

// ============================================================
//  POST /api/auth/login
//  Body: { email, password }
//  (Atharva's pattern: login by email)
// ============================================================
export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = generateToken(user._id, user.username);

        res.json({
            message: "Logged in successfully!",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                trophies: user.trophies,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
                xp: user.xp || 0,
                level: user.level || 1,
            },
        });
    } catch (err) {
        console.error("[login error]", err);
        res.status(500).json({ error: "Server error. Please try again." });
    }
}

// ============================================================
//  GET /api/auth/me — current user profile (requires JWT)
// ============================================================
export async function getMe(req, res) {
    try {
        const user = await User.findById(req.userId).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
}
