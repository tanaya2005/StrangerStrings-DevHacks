// ============================================================
//  models/Message.js — Direct Messages between friends
// ============================================================
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
    {
        // The two participants — always stored in sorted order so
        // we can find a conversation by [userA, userB] regardless of direction.
        participants: [
            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        ],

        sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

        text: {
            type: String,
            required: true,
            maxlength: 500,
            trim: true,
        },

        // Whether the recipient has seen this message
        read: { type: Boolean, default: false },
    },
    { timestamps: true }   // gives us createdAt / updatedAt
);

// Index so fetching a conversation is fast
MessageSchema.index({ participants: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);
export default Message;
