// ============================================================
//  models/User.js — MongoDB User schema (custom auth, no Firebase)
// ============================================================
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        // ---- Auth fields ----
        username: {
            type: String,
            required: true,
            unique: true,        // enforced at DB level
            trim: true,
            minlength: 3,
            maxlength: 20,
            match: /^[a-zA-Z0-9_]+$/,  // alphanumeric + underscore only
        },
        password: {
            type: String,
            required: true,       // stored as bcrypt hash — never plaintext
        },
        dateOfBirth: {
            type: Date,
            required: true,
        },

        // ---- Game stats ----
        trophies: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
