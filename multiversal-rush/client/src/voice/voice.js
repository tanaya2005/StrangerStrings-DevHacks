// ============================================================
//  voice/voice.js — PeerJS voice chat stub
//  Member 4 fills this in with the full PeerJS implementation.
//  We export empty stubs here so the rest of the app compiles.
// ============================================================

/**
 * initVoiceChat(roomId, myPeerId)
 * - connects to PeerJS cloud server
 * - calls all existing peers in the room
 * - handles mute / deafen toggles
 */
export function initVoiceChat(roomId, myPeerId) {
    console.log("[Voice] initVoiceChat called – to be implemented by Member 4");
    // Member 4: import Peer from 'peerjs'
    // const peer = new Peer(myPeerId, { ... })
    // peer.on('call', ...) etc.
}

export function muteVoice() {
    console.log("[Voice] muteVoice – to be implemented by Member 4");
}

export function unmuteVoice() {
    console.log("[Voice] unmuteVoice – to be implemented by Member 4");
}

export function destroyVoiceChat() {
    console.log("[Voice] destroyVoiceChat – to be implemented by Member 4");
}
