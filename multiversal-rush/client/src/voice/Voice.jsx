// ============================================================
//  voice/Voice.jsx — WebRTC voice chat (PeerJS)
//  Source: archit2 (Task 4) — restyled for cyberpunk UI
//  Auto-connects players in the same room. Max 5 users.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket/socket';

// PeerJS is loaded from CDN in index.html to avoid bundling issues
// Make sure: <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
// is in public/index.html — we reference window.Peer below

export default function Voice({ name, room }) {
    const [connectedCount, setConnectedCount] = useState(0);
    const [muted, setMuted] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [error, setError] = useState('');

    const localStreamRef = useRef(null);
    const peerRef = useRef(null);
    const remoteAudioRefs = useRef(new Map());

    useEffect(() => {
        let mounted = true;

        async function start() {
            try {
                // Check PeerJS is available (loaded from CDN)
                if (typeof window.Peer === 'undefined') {
                    console.warn('[Voice] PeerJS not loaded — voice chat unavailable');
                    setError('Voice unavailable (PeerJS not loaded)');
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef.current = stream;

                const PEER_HOST = window.__PEER_HOST || window.location.hostname;
                const PEER_PORT = window.__PEER_PORT || 3000;
                const peer = new window.Peer(undefined, {
                    host: PEER_HOST,
                    port: PEER_PORT,
                    path: '/peerjs',
                });
                peerRef.current = peer;

                peer.on('open', (id) => {
                    socket.emit('peer-join', { peerId: id, name, room });
                });

                peer.on('call', (call) => {
                    call.answer(localStreamRef.current);
                    call.on('stream', (remoteStream) => {
                        if (mounted) attachRemoteStream(call.peer, remoteStream);
                    });
                });

                peer.on('error', (err) => {
                    console.warn('[Voice] PeerJS error:', err.type);
                    setError(`Voice error: ${err.type}`);
                });

                socket.on('peers', (list) => {
                    if (!mounted) return;
                    connectToPeers(list);
                });
            } catch (err) {
                if (err.name === 'NotAllowedError') {
                    setError('Microphone access denied');
                } else {
                    console.warn('[Voice] error:', err.message);
                }
            }
        }

        start();

        return () => {
            mounted = false;
            const peer = peerRef.current;
            if (peer && !peer.destroyed) peer.destroy();
            const stream = localStreamRef.current;
            if (stream) stream.getTracks().forEach((t) => t.stop());
            remoteAudioRefs.current.forEach((el) => {
                el.pause();
                el.srcObject = null;
                el.remove();
            });
            remoteAudioRefs.current.clear();
            socket.off('peers');
        };
    }, [name, room]);

    function attachRemoteStream(peerId, stream) {
        let audio = remoteAudioRefs.current.get(peerId);
        if (!audio) {
            audio = document.createElement('audio');
            audio.autoplay = true;
            audio.playsInline = true;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            remoteAudioRefs.current.set(peerId, audio);
        }
        audio.srcObject = stream;
        audio.muted = deafened;
        setConnectedCount(remoteAudioRefs.current.size);
    }

    function connectToPeers(list) {
        const peer = peerRef.current;
        if (!peer || !localStreamRef.current) return;

        const participants = list.filter((p) => p.peerId);
        if (participants.length > 5) return;

        participants.forEach((p) => {
            if (p.peerId === peer.id) return;
            if (remoteAudioRefs.current.has(p.peerId)) return;
            try {
                const call = peer.call(p.peerId, localStreamRef.current);
                call.on('stream', (remoteStream) => {
                    attachRemoteStream(call.peer, remoteStream);
                });
            } catch (e) {
                console.warn('[Voice] call failed:', e);
            }
        });
    }

    function toggleMute() {
        const stream = localStreamRef.current;
        if (!stream) return;
        const track = stream.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setMuted(!track.enabled);
    }

    function toggleDeafen() {
        const newDeaf = !deafened;
        remoteAudioRefs.current.forEach((audio) => { audio.muted = newDeaf; });
        setDeafened(newDeaf);
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>🎙️ Voice Chat</div>
            {error ? (
                <div style={styles.error}>{error}</div>
            ) : (
                <>
                    <div style={styles.status}>
                        Connected: {connectedCount} / 4 others
                    </div>
                    <div style={styles.btnRow}>
                        <button
                            style={{ ...styles.btn, ...(muted ? styles.btnActive : {}) }}
                            onClick={toggleMute}
                        >
                            {muted ? '🔇 Unmute' : '🎤 Mute'}
                        </button>
                        <button
                            style={{ ...styles.btn, ...(deafened ? styles.btnActive : {}) }}
                            onClick={toggleDeafen}
                        >
                            {deafened ? '🔊 Undeafen' : '🔈 Deafen'}
                        </button>
                    </div>
                    <div style={styles.hint}>Auto-connects players in room. Max 5.</div>
                </>
            )}
        </div>
    );
}

const styles = {
    container: {
        background: 'rgba(8,15,35,0.85)',
        border: '1px solid rgba(0,255,200,0.2)',
        borderRadius: '0.75rem',
        padding: '0.9rem 1rem',
        backdropFilter: 'blur(12px)',
        color: '#e0e8ff',
        fontFamily: '"Exo 2", sans-serif',
        fontSize: '0.85rem',
    },
    header: {
        fontWeight: 700,
        color: '#00ffe0',
        marginBottom: '0.5rem',
        letterSpacing: '0.05em',
    },
    status: {
        color: 'rgba(160,200,255,0.7)',
        marginBottom: '0.6rem',
        fontSize: '0.78rem',
    },
    btnRow: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.5rem',
    },
    btn: {
        flex: 1,
        padding: '0.4rem 0.6rem',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(0,255,200,0.2)',
        borderRadius: '0.4rem',
        color: '#c0d8ff',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontFamily: '"Exo 2", sans-serif',
        transition: 'all 0.15s',
    },
    btnActive: {
        background: 'rgba(255,80,80,0.15)',
        border: '1px solid rgba(255,80,80,0.4)',
        color: '#ff7070',
    },
    error: {
        color: '#ff7070',
        fontSize: '0.75rem',
        marginTop: '0.3rem',
    },
    hint: {
        color: 'rgba(160,200,255,0.35)',
        fontSize: '0.7rem',
    },
};
