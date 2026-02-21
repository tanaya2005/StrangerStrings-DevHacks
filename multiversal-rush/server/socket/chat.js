// ============================================================
//  socket/chat.js — Chat + PeerJS peer-signaling handlers
//  Source: archit2 (Task 4), converted to ESM
//  Attached to io in server.js
// ============================================================

/**
 * attachChat(io)
 * Handles:
 *   - 'join'     → player joins a named room for chat
 *   - 'message'  → broadcast text chat to room
 *   - 'peer-join' → broadcast PeerJS peer list for voice auto-connect
 *   - 'disconnect' → cleanup room state
 */
export function attachChat(io) {
    // Map: roomId → Map(socketId → { name, peerId })
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

        // PeerJS: { peerId, name, room }
        socket.on('peer-join', ({ peerId, name, room = 'lobby' } = {}) => {
            socket.join(room);
            const roomMap = ensureRoom(room);
            roomMap.set(socket.id, { name: name || 'Anonymous', peerId });
            const list = Array.from(roomMap.entries()).map(([id, info]) => ({
                socketId: id,
                name: info.name,
                peerId: info.peerId,
            }));
            io.to(room).emit('peers', list);
        });

        socket.on('disconnect', () => {
            rooms.forEach((roomMap, room) => {
                if (roomMap.has(socket.id)) {
                    roomMap.delete(socket.id);
                    io.to(room).emit('players', Array.from(roomMap.values()).map((p) => p.name));
                    const list = Array.from(roomMap.entries()).map(([id, info]) => ({
                        socketId: id,
                        name: info.name,
                        peerId: info.peerId,
                    }));
                    io.to(room).emit('peers', list);
                }
            });
        });
    });
}
