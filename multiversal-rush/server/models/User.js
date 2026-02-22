// ============================================================
//  models/User.js — MongoDB User schema
//  Merged: Atharva's email+username schema + Varun's DOB validation
//  Uses ESM (import/export) to match our server.js
// ============================================================
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
    {
        // ---- Auth fields (Atharva's pattern: email is the login key) ----
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,   // basic email format check
        },
        username: {
            type: String,
            required: true,
            unique: true,           // unique so it can be shown on leaderboard
            trim: true,
            minlength: 3,
            maxlength: 20,
            match: /^[a-zA-Z0-9_]+$/,   // alphanumeric + underscore only
        },
        password: {
            type: String,
            required: true,           // stored as bcrypt hash via pre-save hook
        },
        dateOfBirth: {
            type: Date,
            required: true,           // age validation done server-side (13+)
        },

        // ---- Game stats ----
        trophies: { type: Number, default: 0 },
        gems: { type: Number, default: 100 },
        ownedAvatars: {
            type: [String],
            default: ["/models/penguin/scene.gltf", "/models/red-panda/scene.gltf"]
        },
        selectedAvatar: {
            type: String,
            default: "/models/penguin/scene.gltf"
        },
        wins: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
        banned: { type: Boolean, default: false },

        // ---- Friends ----
        friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

        // Pending incoming friend requests
        // status: "pending" | "accepted" | "declined"
        friendRequests: [
            {
                from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
                createdAt: { type: Date, default: Date.now },
            },
        ],

        // ---- Achievements ----
        achievements: {
            jumpMaster: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            raceFinisher: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            podiumChampion: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            trophyCollector: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            survivorSpirit: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            speedDemon: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            unstoppableMomentum: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            laserDodger: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            untouchableRun: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
            comebackKing: { count: { type: Number, default: 0 }, tier: { type: String, enum: ['none', 'bronze', 'silver', 'gold'], default: 'none' } },
        },
    },
    { timestamps: true }
);

// ---- Pre-save hook: hash password before storing ----
// (Atharva's pattern — avoids manually calling bcrypt.hash everywhere)
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// ---- Instance method: verify password ----
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;
