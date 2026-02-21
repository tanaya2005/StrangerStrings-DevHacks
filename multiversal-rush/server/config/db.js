// ============================================================
//  config/db.js — MongoDB Atlas connection
//  Used by Member 3's leaderboard routes.
//  Member 2 calls this in server.js so routes work.
// ============================================================
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

/**
 * Connect to MongoDB Atlas.
 * Returns a promise so server.js can .catch() gracefully
 * if the URI isn't set yet during development.
 */
async function connectDB() {
    const uri = process.env.MONGO_URI;

    if (!uri || uri.includes("<username>")) {
        console.warn("⚠️  MONGO_URI not set – skipping DB connection");
        return;
    }

    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
}

export default connectDB;
