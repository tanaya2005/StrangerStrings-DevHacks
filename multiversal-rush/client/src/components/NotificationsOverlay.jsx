import React, { useEffect } from "react";
import socket from "../socket/socket";
import { getFriendSocket } from "../socket/friendSocket";
import useStore from "../store/store";
import "./NotificationsOverlay.css";

export default function NotificationsOverlay({ onClose, onNavigateRoom }) {
    const notifications = useStore(s => s.notifications);
    const addNotification = useStore(s => s.addNotification);
    const removeNotification = useStore(s => s.removeNotification);

    useEffect(() => {
        const fs = getFriendSocket?.();

        const onReq = ({ fromUserId, fromUsername }) => {
            addNotification({
                type: "friend_request",
                userId: fromUserId,
                username: fromUsername,
                message: `${fromUsername} sent you a friend request!`
            });
        };

        const onAcc = ({ friendUsername }) => {
            addNotification({
                type: "friend_accepted",
                username: friendUsername,
                message: `You and ${friendUsername} are now friends!`
            });
        };

        const onRoom = ({ fromName, roomCode }) => {
            addNotification({
                type: "room_invite",
                roomCode,
                message: `${fromName} invited you to room: ${roomCode}`
            });
        };

        if (fs) {
            fs.on("friend:requestReceived", onReq);
            fs.on("friend:accepted", onAcc);
        }

        socket.on("roomInvite", onRoom);

        // System Broadcast
        const onBroadcast = (msg) => {
            addNotification({
                type: "broadcast",
                message: `[SYSTEM] ${msg}`
            });
        };
        socket.on("systemBroadcast", onBroadcast);

        return () => {
            if (fs) {
                fs.off("friend:requestReceived", onReq);
                fs.off("friend:accepted", onAcc);
            }
            socket.off("roomInvite", onRoom);
            socket.off("systemBroadcast", onBroadcast);
        };
    }, []);

    // Placeholder data if empty
    const displayList = notifications.length > 0 ? notifications : [
        { id: '1', type: 'info', message: 'Welcome to Multiversal Rush Dashboard!' },
        { id: '2', type: 'info', message: 'No new notifications right now.' }
    ];

    return (
        <div className="notifications-overlay-backdrop" onClick={onClose}>
            <div className="notifications-overlay-panel" onClick={(e) => e.stopPropagation()}>
                <div className="notif-header">
                    <h2>🔔 Notifications</h2>
                    <button className="btn-close-notif" onClick={onClose}>✕</button>
                </div>

                <div className="notif-list">
                    {displayList.map(n => (
                        <div key={n.id} className={`notif-card type-${n.type}`}>
                            <div className="notif-icon">
                                {n.type === 'friend_request' && '👤'}
                                {n.type === 'friend_accepted' && '🤝'}
                                {n.type === 'room_invite' && '🎮'}
                                {n.type === 'broadcast' && '📢'}
                                {n.type === 'info' && '💡'}
                            </div>
                            <div className="notif-content">
                                <p>{n.message}</p>
                            </div>
                            {n.type === 'room_invite' && (
                                <button
                                    className="btn-notif-action"
                                    onClick={() => {
                                        onNavigateRoom(n.roomCode);
                                        removeNotification(n.id);
                                    }}
                                >Join</button>
                            )}
                            <button className="btn-notif-dismiss" onClick={() => removeNotification(n.id)}>×</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
