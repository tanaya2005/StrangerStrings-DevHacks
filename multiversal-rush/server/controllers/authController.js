// ============================================================
//  controllers/authController.js — Sign up & Login logic
//  Custom auth: username + password (bcrypt) + DOB (age 12+)
// ============================================================
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "multiversal_secret_change_me";
const JWT_EXPIRES = "7d"; // token valid for 7 days

// ---- Helper: calculate age from DOB ----
function calculateAge(dob) {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--; // haven't had birthday yet this year
    }
    return age;
}

// ---- Helper: sign a JWT ----
function signToken(userId, username) {
    return jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// ============================================================
//  POST /api/auth/signup
//  Body: { username, password, dateOfBirth }
// ============================================================
export async function signup(req, res) {
    try {
        const { username, password, dateOfBirth } = req.body;

        // --- Validate required fields ---
        if (!username || !password || !dateOfBirth) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // --- Username format: 3-20 chars, alphanumeric + underscore ---
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({
                error: "Username must be 3-20 characters (letters, numbers, underscore only)",
            });
        }

        // --- Password min length ---
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        // --- Age check: must be older than 12 ---
        const age = calculateAge(dateOfBirth);
        if (isNaN(age) || age < 13) {
            return res.status(400).json({
                error: "You must be at least 13 years old to play Multiversal Rush",
            });
        }

        // --- Check username is taken ---
        const existing = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, "i") }, // case-insensitive
        });
        if (existing) {
            return res.status(409).json({ error: "Username is already taken" });
        }

        // --- Hash password (salt rounds = 10) ---
        const hashedPassword = await bcrypt.hash(password, 10);

        // --- Save user ---
        const user = await User.create({
            username,
            password: hashedPassword,
            dateOfBirth: new Date(dateOfBirth),
        });

        // --- Return JWT ---
        const token = signToken(user._id, user.username);

        res.status(201).json({
            message: "Account created successfully!",
            token,
            user: {
                id: user._id,
                username: user.username,
                trophies: user.trophies,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
            },
        });
    } catch (err) {
        console.error("[signup error]", err);
        // Handle duplicate key from MongoDB as well
        if (err.code === 11000) {
            return res.status(409).json({ error: "Username is already taken" });
        }
        res.status(500).json({ error: "Server error. Please try again." });
    }
}

// ============================================================
//  POST /api/auth/login
//  Body: { username, password }
// ============================================================
export async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        // --- Find user (case-insensitive) ---
        const user = await User.findOne({
            username: { $regex: new RegExp(`^${username}$`, "i") },
        });
        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // --- Verify password ---
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        // --- Return JWT ---
        const token = signToken(user._id, user.username);

        res.json({
            message: "Logged in successfully!",
            token,
            user: {
                id: user._id,
                username: user.username,
                trophies: user.trophies,
                wins: user.wins,
                gamesPlayed: user.gamesPlayed,
            },
        });
    } catch (err) {
        console.error("[login error]", err);
        res.status(500).json({ error: "Server error. Please try again." });
    }
}

// ============================================================
//  GET /api/auth/me
//  Header: Authorization: Bearer <token>
//  Returns the currently logged-in user's profile.
// ============================================================
export async function getMe(req, res) {
    try {
        // req.userId is set by the auth middleware
        const user = await User.findById(req.userId).select("-password");
        if (!user) return res.status(404).json({ error: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
}
