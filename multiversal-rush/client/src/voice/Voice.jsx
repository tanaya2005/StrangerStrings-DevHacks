// ============================================================
//  voice/Voice.jsx — WebRTC voice chat via LiveKit SFU
//  Source: archit2 (Task 4) — replaced PeerJS with LiveKit
//  Default: MUTED + DEAFENED — player must manually enable
//  Controls: Mic (unmute) + Deafen toggles
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';

export default function Voice({ name, room }) {
    // ---- Default: muted AND deafened ----
    const [muted, setMuted] = useState(true);   // mic off by default
    const [deafened, setDeafened] = useState(true);   // ears off by default
    const [connectedCount, setConnectedCount] = useState(0);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState('');

    const roomRef = useRef(null);
    const deafenedRef = useRef(true); // ref stays in sync for async callbacks

    useEffect(() => { deafenedRef.current = deafened; }, [deafened]);

    useEffect(() => {
        if (!name || !room) return;
        let isMounted = true;
        let lkRoom = null;

        async function connect() {
            try {
                setConnecting(true);
                const res = await fetch('/api/voice/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ playerName: name, roomId: room }),
                });
                if (!res.ok) throw new Error(`Token error ${res.status}`);
                const { token, url } = await res.json();
                if (!isMounted) return;

                lkRoom = new Room();
                await lkRoom.connect(url, token);

                // Start with mic DISABLED (user is muted by default)
                await lkRoom.localParticipant.setMicrophoneEnabled(false);

                if (!isMounted) { lkRoom.disconnect(); return; }
                roomRef.current = lkRoom;

                lkRoom.on(RoomEvent.ParticipantConnected, () => updateCount(lkRoom));
                lkRoom.on(RoomEvent.ParticipantDisconnected, () => updateCount(lkRoom));
                lkRoom.on(RoomEvent.Disconnected, () => { if (isMounted) setConnectedCount(0); });
                lkRoom.on(RoomEvent.TrackSubscribed, (track, pub) => {
                    if (track.kind === 'audio') {
                        track.attach().style.display = 'none';
                        // If currently deafened, mute new track immediately
                        if (deafenedRef.current && typeof pub.setEnabled === 'function') {
                            pub.setEnabled(false);
                        }
                    }
                });
                lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());

                setError('');
                setConnecting(false);
                updateCount(lkRoom);
            } catch (err) {
                if (isMounted) {
                    setError(`Voice: ${err.message}`);
                    setConnecting(false);
                }
            }
        }

        connect();
        return () => {
            isMounted = false;
            try { lkRoom?.disconnect(); } catch (_) { }
        };
    }, [name, room]);

    function updateCount(lkRoom) {
        try { setConnectedCount((lkRoom.remoteParticipants?.size ?? 0) + 1); } catch (_) { }
    }

    async function toggleMute() {
        try {
            const lk = roomRef.current;
            if (!lk) return;
            const next = !muted;
            await lk.localParticipant.setMicrophoneEnabled(!next); // enabled = NOT muted
            setMuted(next);
        } catch (err) { console.warn('[Voice] mute:', err.message); }
    }

    function toggleDeafen() {
        try {
            const lk = roomRef.current;
            if (!lk) return;
            const next = !deafened;
            const remote = lk.remoteParticipants || lk.participants;
            remote?.forEach((p) => {
                if (p.isLocal) return;
                (p.trackPublications || p.audioTracks)?.forEach((pub) => {
                    const kind = pub.kind || pub.track?.kind;
                    if (kind === 'audio') {
                        if (typeof pub.setEnabled === 'function') pub.setEnabled(!next);
                        else if (pub.track?.mediaStreamTrack) pub.track.mediaStreamTrack.enabled = !next;
                    }
                });
            });
            setDeafened(next);
        } catch (err) { console.warn('[Voice] deafen:', err.message); }
    }

    return (
        <div style={S.wrap}>
            <div style={S.header}>
                <span>🎙 Voice</span>
                <span style={connecting ? S.yellow : S.green}>
                    {connecting ? '⏳ …' : `👥 ${connectedCount}`}
                </span>
            </div>

            {error && <div style={S.err}>{error}</div>}

            <div style={S.row}>
                {/* MIC button — red when muted */}
                <button
                    onClick={toggleMute}
                    title={muted ? 'Unmute mic' : 'Mute mic'}
                    style={{ ...S.btn, background: muted ? '#c0392b' : '#27ae60' }}
                >
                    {muted ? '🔇 Muted' : '🎤 Live'}
                </button>

                {/* DEAFEN button — red when deafened */}
                <button
                    onClick={toggleDeafen}
                    title={deafened ? 'Undeafen' : 'Deafen'}
                    style={{ ...S.btn, background: deafened ? '#c0392b' : '#2980b9' }}
                >
                    {deafened ? '🔕 Deaf' : '🔊 Hearing'}
                </button>
            </div>

            <div style={S.hint}>
                {connectedCount <= 1 ? 'No others yet' : `${connectedCount - 1} player${connectedCount > 2 ? 's' : ''}`}
            </div>
        </div>
    );
}

const S = {
    wrap: { background: 'rgba(10,10,30,0.92)', border: '1.5px solid #00ff88', borderRadius: 8, padding: '10px 12px', color: '#00ff88', fontFamily: "'Courier New',monospace", fontSize: 12, minWidth: 200, boxShadow: '0 0 12px rgba(0,255,136,0.25)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #00ff88', paddingBottom: 6, fontWeight: 'bold', fontSize: 13 },
    green: { color: '#00ff88', fontWeight: 'bold' },
    yellow: { color: '#ffaa00' },
    err: { background: '#c0392b', color: '#fff', padding: '6px 8px', borderRadius: 4, marginBottom: 8, fontSize: 11 },
    row: { display: 'flex', gap: 8, marginBottom: 8 },
    btn: { flex: 1, padding: '7px 4px', border: '1px solid #00ff88', borderRadius: 4, color: '#fff', fontFamily: "'Courier New',monospace", fontSize: 11, fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' },
    hint: { textAlign: 'center', fontSize: 10, opacity: 0.6 },
};
