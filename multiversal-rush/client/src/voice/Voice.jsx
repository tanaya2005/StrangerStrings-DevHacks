// ============================================================
//  voice/Voice.jsx — WebRTC voice chat (Livekit SFU)
//  Member 4 (archit2) — Replaced PeerJS with Livekit
//  Auto-connects players in the same room. Max 5 users.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';

export default function Voice({ name, room }) {
    const [connectedCount, setConnectedCount] = useState(0);
    const [muted, setMuted] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [error, setError] = useState('');
    const [connecting, setConnecting] = useState(false);

    const roomRef = useRef(null);
    const deafenedRef = useRef(deafened);

    // Keep deafenedRef in sync with state
    useEffect(() => {
        deafenedRef.current = deafened;
    }, [deafened]);

    /**
     * Initialize Livekit connection
     */
    useEffect(() => {
        if (!name || !room) {
            console.log('[Voice] Missing name or room, skipping connection');
            return;
        }

        let isMounted = true;
        let liveKitRoom = null;

        async function connectToRoom() {
            try {
                setConnecting(true);
                console.log(`[Voice] Connecting to room: ${room} as ${name}`);

                // Fetch token from backend
                const tokenRes = await fetch('/api/voice/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerName: name, roomId: room }),
                });

                if (!tokenRes.ok) {
                    const errorText = await tokenRes.text();
                    throw new Error(`Token fetch failed (${tokenRes.status}): ${errorText}`);
                }

                const { token, url } = await tokenRes.json();

                if (!isMounted) return;

                // Connect to Livekit server
                liveKitRoom = new Room();
                await liveKitRoom.connect(url, token);

                // Publish local tracks
                await liveKitRoom.localParticipant.setMicrophoneEnabled(true);

                if (!isMounted) {
                    liveKitRoom.disconnect();
                    return;
                }

                roomRef.current = liveKitRoom;

                // ---- Room event handlers ----
                const onParticipantConnected = (participant) => {
                    console.log(`[Voice] Participant joined: ${participant.identity || participant.name}`);
                    updateParticipantCount(liveKitRoom);
                };

                const onParticipantDisconnected = (participant) => {
                    console.log(`[Voice] Participant left: ${participant.identity || participant.name}`);
                    updateParticipantCount(liveKitRoom);
                };

                const onRoomDisconnected = () => {
                    console.log('[Voice] Disconnected from Livekit');
                    if (isMounted) setConnectedCount(0);
                };

                const onTrackSubscribed = (track, pub) => {
                    if (track.kind === 'audio') {
                        console.log('[Voice] Audio track subscribed, attaching...');
                        const element = track.attach();
                        element.style.display = 'none';
                        // Respect existing deafen state using Ref
                        if (isMounted && deafenedRef.current) {
                            pub.setEnabled(false);
                            console.log('[Voice] New track muted due to Deafen');
                        }
                    }
                };

                const onTrackUnsubscribed = (track) => {
                    track.detach();
                };

                liveKitRoom.on(RoomEvent.ParticipantConnected, onParticipantConnected);
                liveKitRoom.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
                liveKitRoom.on(RoomEvent.Disconnected, onRoomDisconnected);
                liveKitRoom.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
                liveKitRoom.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);

                console.log('[Voice] Connected to Livekit');
                setError('');
                setConnecting(false);
                updateParticipantCount(liveKitRoom);

            } catch (err) {
                console.error('[Voice] Connection error:', err);
                if (isMounted) {
                    setError(`Connection failed: ${err.message || 'Check network or credentials'}`);
                    setConnecting(false);
                }
            }
        }

        connectToRoom();

        // Cleanup on unmount
        return () => {
            isMounted = false;
            if (liveKitRoom) {
                try {
                    liveKitRoom.disconnect();
                    console.log('[Voice] Room disconnected on unmount');
                } catch (err) {
                    console.warn('[Voice] Disconnect error:', err.message);
                }
            }
        };
    }, [name, room]); // Removed deafened from deps to avoid reconnect on toggle

    /**
     * Count participants and update state
     */
    function updateParticipantCount(liveKitRoom) {
        try {
            const participants = liveKitRoom.participants;
            const count = participants.size + 1; // +1 for self
            setConnectedCount(count);
            console.log(`[Voice] Participants: ${count}`);
        } catch (err) {
            console.error('[Voice] Count error:', err.message);
        }
    }

    /**
     * Toggle local mute
     */
    async function toggleMute() {
        try {
            const liveKitRoom = roomRef.current;
            if (liveKitRoom && liveKitRoom.localParticipant) {
                const nextMuted = !muted;
                // Microphone is "enabled" when NOT muted
                await liveKitRoom.localParticipant.setMicrophoneEnabled(!nextMuted);
                setMuted(nextMuted);
                console.log(`[Voice] Microphone ${nextMuted ? 'muted' : 'unmuted'}`);
            }
        } catch (err) {
            console.error('[Voice] Mute toggle failed:', err.message);
        }
    }

    /**
     * Toggle deafen (mute incoming audio)
     */
    function toggleDeafen() {
        try {
            const liveKitRoom = roomRef.current;
            if (!liveKitRoom) return;

            const newDeafened = !deafened;

            // Defensively handle different SDK structures
            const remoteParticipants = liveKitRoom.remoteParticipants || liveKitRoom.participants;

            if (remoteParticipants) {
                remoteParticipants.forEach((participant) => {
                    // Skip local participant if using 'participants' map
                    if (participant.isLocal) return;

                    const publications = participant.trackPublications || participant.audioTracks;
                    if (publications) {
                        publications.forEach((pub) => {
                            // Only affect audio tracks
                            const kind = pub.kind || (pub.track && pub.track.kind);
                            if (kind === 'audio') {
                                if (typeof pub.setEnabled === 'function') {
                                    pub.setEnabled(!newDeafened);
                                } else if (pub.track && pub.track.mediaStreamTrack) {
                                    pub.track.mediaStreamTrack.enabled = !newDeafened;
                                }
                            }
                        });
                    }
                });
            }

            setDeafened(newDeafened);
            console.log(`[Voice] Deafen ${newDeafened ? 'enabled' : 'disabled'}`);
        } catch (err) {
            console.error('[Voice] Deafen toggle failed:', err);
        }
    }

    // Render voice widget
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span>🎤 Voice Chat</span>
                <span style={styles.statusBadge}>
                    {connecting ? (
                        <span style={styles.connecting}>↻ Connecting...</span>
                    ) : (
                        <span style={styles.connected}>● {connectedCount}</span>
                    )}
                </span>
            </div>

            {error && (
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>{error}</p>
                </div>
            )}

            <div style={styles.buttonRow}>
                <button
                    onClick={toggleMute}
                    style={{
                        ...styles.button,
                        backgroundColor: muted ? '#ff3333' : '#33aa33',
                    }}
                    title={muted ? 'Click to unmute' : 'Click to mute'}
                >
                    {muted ? '🔇 Muted' : '🎤 Unmuted'}
                </button>

                <button
                    onClick={toggleDeafen}
                    style={{
                        ...styles.button,
                        backgroundColor: deafened ? '#ff3333' : '#3366ff',
                    }}
                    title={deafened ? 'Click to undeafen' : 'Click to deafen'}
                >
                    {deafened ? '🔊 Deafened' : '🔉 Hearing'}
                </button>
            </div>

            <div style={styles.infoText}>
                {connectedCount <= 1 && 'Waiting for others...'}
                {connectedCount === 2 && '1 other player'}
                {connectedCount > 2 && `${connectedCount - 1} other players`}
            </div>
        </div>
    );
}

// ============================================================
//  Cyberpunk styling
// ============================================================
const styles = {
    container: {
        backgroundColor: 'rgba(20, 20, 40, 0.95)',
        border: '2px solid #00ff88',
        borderRadius: '8px',
        padding: '12px',
        color: '#00ff88',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        maxWidth: '280px',
        boxShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #00ff88',
        paddingBottom: '8px',
        fontWeight: 'bold',
        fontSize: '14px',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
        fontSize: '11px',
    },
    connecting: {
        color: '#ffaa00',
    },
    connected: {
        color: '#00ff88',
        fontWeight: 'bold',
    },
    errorBox: {
        backgroundColor: '#ff3333',
        color: '#fff',
        padding: '8px',
        borderRadius: '4px',
        marginBottom: '8px',
        fontSize: '11px',
    },
    errorText: {
        margin: 0,
        lineHeight: '1.3',
    },
    buttonRow: {
        display: 'flex',
        gap: '8px',
        marginBottom: '10px',
    },
    button: {
        flex: 1,
        padding: '8px',
        border: '1px solid #00ff88',
        borderRadius: '4px',
        color: '#fff',
        fontFamily: "'Courier New', monospace",
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    infoText: {
        textAlign: 'center',
        fontSize: '10px',
        color: '#00ff88',
        opacity: 0.7,
    },
};
