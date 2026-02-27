// ============================================================
//  models/Game.js — Persistent record of every completed match
//  Stored in MongoDB for admin analytics + history.
// ============================================================
import mongoose from "mongoose";

const PlayerResultSchema = new mongoose.Schema({
    socketId: { type: String },
    username: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    place: { type: Number },           // 1st, 2nd, 3rd … or null if eliminated
    eliminated: { type: Boolean, default: false },
    finishTime: { type: Number },           // ms from startTime, null if eliminated
    trophiesEarned: { type: Number, default: 0 },
}, { _id: false });

const GameSchema = new mongoose.Schema({
    roomId: { type: String, required: true, index: true },
    map: { type: String, required: true },
    status: { type: String, enum: ["in_progress", "completed", "aborted"], default: "in_progress" },
    players: [PlayerResultSchema],
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationMs: { type: Number },           // endedAt - startedAt
    winnerUsername: { type: String },       // convenience field for queries
}, { timestamps: true });

// Indexes for the admin dashboard queries
GameSchema.index({ map: 1 });
GameSchema.index({ status: 1 });
GameSchema.index({ startedAt: -1 });

const Game = mongoose.model("Game", GameSchema);
export default Game;
