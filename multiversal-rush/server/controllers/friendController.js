// ============================================================
//  controllers/friendController.js  — REWRITTEN v2
//
//  Bug fixes vs v1:
//   1. respondRequest used unreliable subdocument mutation
//      → now uses atomic $pull + $addToSet on both users
//   2. sendRequest didn't handle cross-request (A→B while B→A pending)
//      → now auto-accepts instead of creating a duplicate
//   3. All operations log errors to server console for visibility
// ============================================================
import User from "../models/User.js";
import Message from "../models/Message.js";

// ── helpers ──────────────────────────────────────────────────
function toStr(id) { return id?.toString(); }

// ── 1. Search users by username ──────────────────────────────
// GET /api/friends/search?q=<query>
export async function searchUsers(req, res) {
    try {
        const q = req.query.q?.trim();
        if (!q || q.length < 2) return res.json({ users: [] });

        const users = await User.find({
            username: { $regex: q, $options: "i" },
            _id: { $ne: req.userId },
        })
            .select("username trophies wins")
            .limit(10);

        res.json({ users });
    } catch (err) {
        console.error("[friendController.searchUsers]", err);
        res.status(500).json({ error: "Search failed" });
    }
}

// ── 2. Send a friend request ──────────────────────────────────
// POST /api/friends/request  { toUsername }
//
// Edge cases handled:
//  a) Already friends → 400
//  b) Sender already sent a request that's still pending → 400
//  c) TARGET already sent a request to SENDER (cross-request)
//     → auto-accept both sides instead of creating a second pending request
export async function sendRequest(req, res) {
    try {
        const { toUsername } = req.body;
        if (!toUsername) return res.status(400).json({ error: "toUsername is required" });

        const me = await User.findById(req.userId);
        const target = await User.findOne({ username: toUsername })
            .select("_id username friends friendRequests");

        if (!target) return res.status(404).json({ error: "User not found" });
        if (toStr(target._id) === toStr(req.userId)) {
            return res.status(400).json({ error: "Can't send a request to yourself" });
        }

        const myIdStr = toStr(req.userId);
        const targetIdStr = toStr(target._id);

        // (a) Already friends?
        const alreadyFriends = me.friends.some(id => toStr(id) === targetIdStr);
        if (alreadyFriends) return res.status(400).json({ error: "Already friends" });

        // (b) I already sent a pending request to them?
        const iAlreadySent = target.friendRequests.some(
            r => toStr(r.from) === myIdStr && r.status === "pending"
        );
        if (iAlreadySent) return res.status(400).json({ error: "Request already sent" });

        // (c) They already sent ME a pending request?
        //     → Auto-accept. No point creating a second pending request.
        const theyAlreadySent = me.friendRequests.some(
            r => toStr(r.from) === targetIdStr && r.status === "pending"
        );

        if (theyAlreadySent) {
            // Accept their request atomically
            await User.findByIdAndUpdate(req.userId, {
                $pull: { friendRequests: { from: target._id } },
                $addToSet: { friends: target._id },
            });
            await User.findByIdAndUpdate(target._id, {
                $addToSet: { friends: req.userId },
            });

            console.log(`[sendRequest] cross-request auto-accepted: ${me.username} ↔ ${target.username}`);
            return res.json({ message: "You were already in each other's requests — now friends!", autoAccepted: true });
        }

        // (d) Normal path — push request into target's friendRequests
        await User.findByIdAndUpdate(target._id, {
            $push: {
                friendRequests: { from: req.userId, status: "pending", createdAt: new Date() },
            },
        });

        console.log(`[sendRequest] ${me.username} → request → ${target.username}`);
        res.json({ message: "Friend request sent" });

    } catch (err) {
        console.error("[friendController.sendRequest]", err);
        res.status(500).json({ error: "Could not send request" });
    }
}

// ── 3. Accept OR Decline a friend request ───────────────────
// POST /api/friends/respond  { fromUserId, action: "accept"|"decline" }
//
// Rewrites v1 which used unreliable .findIndex() + subdoc mutation.
// Now uses two atomic findByIdAndUpdate calls so Mongoose doesn't
// have to track nested-object dirty state.
export async function respondRequest(req, res) {
    try {
        const { fromUserId, action } = req.body;

        if (!fromUserId) return res.status(400).json({ error: "fromUserId is required" });
        if (!["accept", "decline"].includes(action)) {
            return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
        }

        // Verify the request actually exists (pending) to give useful errors
        const me = await User.findById(req.userId).select("friendRequests username");
        if (!me) return res.status(404).json({ error: "User not found" });

        const requestExists = me.friendRequests.some(
            r => toStr(r.from) === toStr(fromUserId) && r.status === "pending"
        );
        if (!requestExists) {
            return res.status(404).json({ error: "No pending request found from that user" });
        }

        // ── ACCEPT ──
        if (action === "accept") {
            // Remove the pending request from ME, add them to my friends
            await User.findByIdAndUpdate(req.userId, {
                $pull: { friendRequests: { from: fromUserId } },
                $addToSet: { friends: fromUserId },
            });

            // Add ME to THEIR friends
            await User.findByIdAndUpdate(fromUserId, {
                $addToSet: { friends: req.userId },
            });

            console.log(`[respondRequest] ACCEPTED: ${me.username} ← ${fromUserId}`);
            return res.json({ message: "Request accepted — you are now friends!" });
        }

        // ── DECLINE ──
        await User.findByIdAndUpdate(req.userId, {
            $pull: { friendRequests: { from: fromUserId } },
        });

        console.log(`[respondRequest] DECLINED: ${me.username} ← ${fromUserId}`);
        return res.json({ message: "Request declined" });

    } catch (err) {
        console.error("[friendController.respondRequest]", err);
        res.status(500).json({ error: "Could not process request" });
    }
}

// ── 4. List friends + pending incoming requests ──────────────
// GET /api/friends
export async function listFriends(req, res) {
    try {
        const me = await User.findById(req.userId)
            .populate("friends", "username trophies wins gamesPlayed")
            .populate("friendRequests.from", "username trophies");

        if (!me) return res.status(404).json({ error: "User not found" });

        const pending = me.friendRequests
            .filter(r => r.status === "pending")
            .map(r => ({
                _id: r.from._id,
                username: r.from.username,
                trophies: r.from.trophies,
                requestId: r._id,
            }));

        res.json({ friends: me.friends, pending });

    } catch (err) {
        console.error("[friendController.listFriends]", err);
        res.status(500).json({ error: "Could not load friends" });
    }
}

// ── 5. Remove a friend ───────────────────────────────────────
// DELETE /api/friends/:friendId
export async function removeFriend(req, res) {
    try {
        const { friendId } = req.params;
        await User.findByIdAndUpdate(req.userId, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: req.userId } });
        res.json({ message: "Friend removed" });
    } catch (err) {
        console.error("[friendController.removeFriend]", err);
        res.status(500).json({ error: "Could not remove friend" });
    }
}

// ── 6. Get DM conversation history ──────────────────────────
// GET /api/friends/:friendId/messages?page=0
export async function getMessages(req, res) {
    try {
        const { friendId } = req.params;
        const page = parseInt(req.query.page) || 0;
        const limit = 40;

        const participants = [req.userId, friendId].sort();

        const messages = await Message.find({ participants })
            .sort({ createdAt: -1 })
            .skip(page * limit)
            .limit(limit)
            .select("sender text createdAt read");

        // Mark incoming messages as read
        await Message.updateMany(
            { participants, sender: friendId, read: false },
            { $set: { read: true } }
        );

        res.json({ messages: messages.reverse() });

    } catch (err) {
        console.error("[friendController.getMessages]", err);
        res.status(500).json({ error: "Could not load messages" });
    }
}
