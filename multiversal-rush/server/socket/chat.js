// ============================================================
//  socket/chat.js — Chat message handlers
//  Source: archit2 (Task 4)
//  Attached to io in server.js
//  Voice now handled via Livekit (see /api/voice/token endpoint)
// ============================================================

/**
 * attachChat(io)
 * Handles text chat only:
 *   - 'join'     → player joins a named room for chat
 *   - 'message'  → broadcast text chat to room
 *   - 'disconnect' → cleanup room state
 */
export function attachChat(io) {
    // Map: roomId → Map(socketId → { name })
    const rooms = new Map();

    function ensureRoom(room) {
        if (!rooms.has(room)) rooms.set(room, new Map());
        return rooms.get(room);
    }

    io.on('connection', (socket) => {

        // join({ name, room }) or join(name, room)
        socket.on('join', (a, b) => {
            let name = null, room = null;
            if (typeof a === 'object') { name = a.name; room = a.room; }
            else { name = a; room = b; }
            room = room || 'lobby';
            socket.join(room);
            const roomMap = ensureRoom(room);
            const info = roomMap.get(socket.id) || {};
            info.name = name || 'Anonymous';
            roomMap.set(socket.id, info);
            io.to(room).emit('players', Array.from(roomMap.values()).map((p) => p.name));
        });

        // chat message: { text, room }
        socket.on('message', (m) => {
            let text = '', room = 'lobby';
            if (typeof m === 'string') text = m;
            else { text = m.text; room = m.room || room; }
            const roomMap = rooms.get(room) || new Map();
            const info = roomMap.get(socket.id) || {};
            const payload = { from: info.name || 'Anonymous', text: String(text), time: Date.now() };
            io.to(room).emit('message', payload);
        });

        socket.on('disconnect', () => {
            rooms.forEach((roomMap, room) => {
                if (roomMap.has(socket.id)) {
                    roomMap.delete(socket.id);
                    io.to(room).emit('players', Array.from(roomMap.values()).map((p) => p.name));
                }
            });
        });
    });
}
