// ============================================================
//  config/db.js — MongoDB connection
//  Supports both MONGO_URI (Varun) and MONGODB_URI (Atharva)
// ============================================================
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function connectDB() {
    // Support both naming conventions
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri || uri.includes("<username>")) {
        console.warn("⚠️  MongoDB URI not set – skipping DB connection");
        return;
    }

    try {
        const conn = await mongoose.connect(uri);
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`❌ MongoDB connection failed: ${err.message}`);
        // Don't exit — let the server run without DB (socket still works)
    }
}

export default connectDB;
