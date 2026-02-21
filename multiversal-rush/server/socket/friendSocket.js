// ============================================================
//  socket/friendSocket.js
//  Real-time layer for the friends system:
//    • online presence (who's online)
//    • friend-to-friend DMs
//    • "invite to my room" push notification
// ============================================================
import Message from "../models/Message.js";
import User from "../models/User.js";

//  Map: userId (string) → Set of socketIds (one user may have multiple tabs)
const onlineUsers = new Map();

function addOnline(userId, socketId) {
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socketId);
}
function removeOnline(userId, socketId) {
    const set = onlineUsers.get(userId);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) onlineUsers.delete(userId);
}
function isOnline(userId) {
    return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}
function getSocketIds(userId) {
    return [...(onlineUsers.get(userId) || [])];
}

export function attachFriendSocket(io) {
    // Dedicated namespace keeps friend events separate from the game namespace
    const ns = io.of("/friends");

    ns.on("connection", async (socket) => {
        // ---- Authenticate socket via JWT token sent in handshake ----
        const token = socket.handshake.auth?.token;
        if (!token) { socket.disconnect(true); return; }

        let decoded;
        try {
            const jwt = await import("jsonwebtoken");
            const JWT_SECRET = process.env.JWT_SECRET || "multiversal_secret_change_me";
            decoded = jwt.default.verify(token, JWT_SECRET);
        } catch {
            socket.disconnect(true);
            return;
        }

        const myId = decoded.id;
        const myUsername = decoded.username;
        socket.data.userId = myId;
        socket.data.username = myUsername;

        addOnline(myId, socket.id);
        console.log(`[FriendSocket] ${myUsername} connected (${socket.id})`);

        // ── Tell all my friends I came online ──
        try {
            const me = await User.findById(myId).select("friends");
            const friendIds = me.friends.map(f => f.toString());
            friendIds.forEach(fid => {
                getSocketIds(fid).forEach(sid => {
                    ns.to(sid).emit("friendOnline", { userId: myId, username: myUsername });
                });
            });

            // Send caller the online status of each friend RIGHT NOW
            const onlineNow = friendIds.filter(fid => isOnline(fid));
            socket.emit("friendsOnlineStatus", { online: onlineNow });
        } catch { /* DB might be down — not fatal */ }

        // ---- DM: send a message to a friend ----
        // Payload: { toUserId, text }
        socket.on("dm:send", async ({ toUserId, text }) => {
            if (!toUserId || !text?.trim()) return;

            try {
                // Verify they are actually friends
                const me = await User.findById(myId).select("friends");
                if (!me.friends.some(id => id.toString() === toUserId)) {
                    socket.emit("dm:error", { error: "Not friends" });
                    return;
                }

                const participants = [myId, toUserId].sort();
                const msg = await Message.create({
                    participants,
                    sender: myId,
                    text: text.trim().slice(0, 500),
                });

                const payload = {
                    _id: msg._id,
                    sender: myId,
                    senderUsername: myUsername,
                    text: msg.text,
                    createdAt: msg.createdAt,
                    read: false,
                };

                // Echo back to sender (all their tabs)
                getSocketIds(myId).forEach(sid => ns.to(sid).emit("dm:message", payload));

                // Deliver to recipient if online
                getSocketIds(toUserId).forEach(sid => ns.to(sid).emit("dm:message", payload));

            } catch (err) {
                console.error("[FriendSocket] dm:send error", err);
                socket.emit("dm:error", { error: "Could not send message" });
            }
        });

        // ---- Invite friend to join your game room ----
        // Payload: { toUserId, roomId }
        socket.on("friend:invite", ({ toUserId, roomId }) => {
            if (!toUserId || !roomId) return;
            const targetSockets = getSocketIds(toUserId);
            if (targetSockets.length === 0) {
                socket.emit("friend:inviteOffline", { toUserId });
                return;
            }
            targetSockets.forEach(sid => {
                ns.to(sid).emit("friend:inviteReceived", {
                    fromUserId: myId,
                    fromUsername: myUsername,
                    roomId,
                });
            });
        });

        // ---- Send a friend request in real-time ----
        // Payload: { toUsername }  (name is what we know in the lobby)
        socket.on("friend:request", async ({ toUsername }) => {
            if (!toUsername || toUsername === myUsername) return;

            try {
                const target = await User.findOne({ username: toUsername }).select("_id username friendRequests friends");
                if (!target) { socket.emit("friend:requestError", { error: "User not found" }); return; }

                const targetId = target._id.toString();

                // Duplicate or already friends guard
                const alreadyFriends = target.friends.some(id => id.toString() === myId);
                const alreadyPending = target.friendRequests.some(
                    r => r.from.toString() === myId && r.status === "pending"
                );
                if (alreadyFriends || alreadyPending) {
                    socket.emit("friend:requestSent", { toUsername, status: "already" });
                    return;
                }

                // Persist to DB
                target.friendRequests.push({ from: myId });
                await target.save();

                // Ack the sender
                socket.emit("friend:requestSent", { toUsername, status: "ok" });

                // ── Push live notification to the receiver (if online) ──
                getSocketIds(targetId).forEach(sid => {
                    ns.to(sid).emit("friend:requestReceived", {
                        fromUserId: myId,
                        fromUsername: myUsername,
                    });
                });

                console.log(`[FriendSocket] ${myUsername} → friend request → ${toUsername}`);
            } catch (err) {
                console.error("[FriendSocket] friend:request error", err);
                socket.emit("friend:requestError", { error: "Server error" });
            }
        });

        // ---- Accept a friend request ----
        // Payload: { fromUserId }
        socket.on("friend:accept", async ({ fromUserId }) => {
            if (!fromUserId) return;
            try {
                const me = await User.findById(myId);
                const them = await User.findById(fromUserId);
                if (!me || !them) return;

                // Move request to "accepted"
                const req = me.friendRequests.find(
                    r => r.from.toString() === fromUserId && r.status === "pending"
                );
                if (!req) return;
                req.status = "accepted";

                // Add each other as friends (guard duplicates)
                if (!me.friends.some(id => id.toString() === fromUserId)) me.friends.push(fromUserId);
                if (!them.friends.some(id => id.toString() === myId)) them.friends.push(myId);

                await me.save();
                await them.save();

                // Notify acceptor (me) — so UI can update
                socket.emit("friend:accepted", {
                    friendId: fromUserId,
                    friendUsername: them.username,
                });

                // Notify the original requester (them) — if online
                getSocketIds(fromUserId).forEach(sid => {
                    ns.to(sid).emit("friend:accepted", {
                        friendId: myId,
                        friendUsername: myUsername,
                    });
                });

                console.log(`[FriendSocket] ${myUsername} accepted request from ${them.username}`);
            } catch (err) {
                console.error("[FriendSocket] friend:accept error", err);
            }
        });

        // ---- Decline a friend request ----
        // Payload: { fromUserId }
        socket.on("friend:decline", async ({ fromUserId }) => {
            if (!fromUserId) return;
            try {
                await User.findByIdAndUpdate(myId, {
                    $set: { "friendRequests.$[r].status": "declined" },
                }, {
                    arrayFilters: [{ "r.from": fromUserId, "r.status": "pending" }],
                });
                socket.emit("friend:declined", { fromUserId });
                console.log(`[FriendSocket] ${myUsername} declined request from ${fromUserId}`);
            } catch (err) {
                console.error("[FriendSocket] friend:decline error", err);
            }
        });

        // ---- Mark DMs as read (called when chat window is opened) ----
        // Payload: { withUserId }
        socket.on("dm:markRead", async ({ withUserId }) => {
            try {
                const participants = [myId, withUserId].sort();
                await Message.updateMany(
                    { participants, sender: withUserId, read: false },
                    { $set: { read: true } }
                );
            } catch { /* non-critical */ }
        });

        // ---- Disconnect ----
        socket.on("disconnect", async () => {
            removeOnline(myId, socket.id);
            console.log(`[FriendSocket] ${myUsername} disconnected`);
            if (!isOnline(myId)) {
                // Tell friends I went offline
                try {
                    const me = await User.findById(myId).select("friends");
                    me.friends.forEach(fid => {
                        getSocketIds(fid.toString()).forEach(sid => {
                            ns.to(sid).emit("friendOffline", { userId: myId });
                        });
                    });
                } catch { /* non-critical */ }
            }
        });
    });
}
