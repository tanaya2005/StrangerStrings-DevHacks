// ============================================================
//  pages/Lobby.jsx — Waiting Room
//  Member 2 (Multiplayer)
//
//  Features:
//   • Text input to pick a room ID
//   • Join / create a room via socket
//   • Show connected players + their ready status
//   • Ready button
//   • Waiting-room text chat
//   • Countdown display before game starts
// ============================================================
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket/socket";
import useStore from "../store/store";
import "./Lobby.css";

export default function Lobby() {
    const navigate = useNavigate();

    // ---- Zustand state ----
    const playerName = useStore((s) => s.playerName);
    const setPlayerId = useStore((s) => s.setPlayerId);
    const setRoomId = useStore((s) => s.setRoomId);
    const setPlayers = useStore((s) => s.setPlayers);
    const setGameState = useStore((s) => s.setGameState);
    const setStartTime = useStore((s) => s.setStartTime);
    const setChatMessages = useStore((s) => s.setChatMessages);
    const addChatMessage = useStore((s) => s.addChatMessage);

    const players = useStore((s) => s.players);
    const chatMessages = useStore((s) => s.chatMessages);
    const gameState = useStore((s) => s.gameState);

    // ---- Local UI state ----
    const [inputRoom, setInputRoom] = useState("");
    const [joined, setJoined] = useState(false);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState(null);
    const [chatInput, setChatInput] = useState("");
    const [isReady, setIsReady] = useState(false);

    const chatEndRef = useRef(null);
    const mySocketId = socket.id;

    // ---- Auto-scroll chat ----
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    // ---- Socket setup ----
    useEffect(() => {
        // Connect socket when entering lobby
        if (!socket.connected) socket.connect();

        // ---- Incoming events ----

        // Successfully joined room
        socket.on("roomJoined", ({ roomId, playerId, players, chatHistory }) => {
            setPlayerId(playerId);
            setRoomId(roomId);
            setPlayers(players);
            setChatMessages(chatHistory || []);
            setJoined(true);
            setError("");
        });

        // Room was full or error
        socket.on("roomFull", ({ message }) => setError(message));
        socket.on("roomError", ({ message }) => setError(message));

        // Another player joined
        socket.on("playerJoined", ({ players }) => setPlayers(players));

        // A player's ready state changed
        socket.on("playersUpdated", ({ players }) => setPlayers(players));

        // A player left
        socket.on("playerLeft", ({ players }) => setPlayers(players));

        // Countdown started
        socket.on("countdownStarted", ({ seconds }) => {
            setGameState("countdown");
            setCountdown(seconds);
            // Decrement every second
            let remaining = seconds;
            const interval = setInterval(() => {
                remaining -= 1;
                setCountdown(remaining);
                if (remaining <= 0) clearInterval(interval);
            }, 1000);
        });

        // Countdown cancelled (someone left)
        socket.on("countdownCancelled", ({ reason }) => {
            setGameState("waiting");
            setCountdown(null);
            setError(`Countdown cancelled: ${reason}`);
        });

        // Game started → navigate to Game page
        socket.on("gameStarted", ({ startTime, players }) => {
            setGameState("playing");
            setStartTime(startTime);
            setPlayers(players);
            navigate("/game");
        });

        // Chat message received
        socket.on("chatUpdate", ({ message }) => addChatMessage(message));

        return () => {
            socket.off("roomJoined");
            socket.off("roomFull");
            socket.off("roomError");
            socket.off("playerJoined");
            socket.off("playersUpdated");
            socket.off("playerLeft");
            socket.off("countdownStarted");
            socket.off("countdownCancelled");
            socket.off("gameStarted");
            socket.off("chatUpdate");
        };
    }, []);

    // ---- Handlers ----

    function handleJoin() {
        if (!inputRoom.trim()) { setError("Enter a room code"); return; }
        if (!playerName) { setError("Go back and set your name first"); return; }
        setError("");
        socket.emit("joinRoom", {
            roomId: inputRoom.trim().toUpperCase(),
            playerName,
        });
    }

    function handleReady() {
        socket.emit("playerReady");
        setIsReady((prev) => !prev);
    }

    function handleSendChat(e) {
        e.preventDefault();
        if (!chatInput.trim()) return;
        socket.emit("chatMessage", { text: chatInput.trim() });
        setChatInput("");
    }

    // ---- Render ----
    const playerList = Object.values(players);

    return (
        <div className="lobby-page">
            <div className="lobby-bg-anim" />

            <div className="lobby-container">
                {/* ---- Header ---- */}
                <h1 className="lobby-title">
                    🌌 <span>Multiversal Rush</span>
                </h1>
                <p className="lobby-subtitle">Waiting Room</p>

                {/* ---- Join Panel ---- */}
                {!joined ? (
                    <div className="join-panel">
                        <p className="panel-label">Welcome, <strong>{playerName || "Stranger"}</strong></p>
                        <div className="join-row">
                            <input
                                className="room-input"
                                placeholder="Room code (e.g. RUSH1)"
                                value={inputRoom}
                                onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                maxLength={10}
                                id="room-code-input"
                            />
                            <button className="btn-join" onClick={handleJoin} id="btn-join-room">
                                Join / Create
                            </button>
                        </div>
                        {error && <p className="lobby-error">{error}</p>}
                    </div>
                ) : (
                    /* ---- In-Room Panel ---- */
                    <div className="room-panel">

                        {/* Countdown overlay */}
                        {countdown !== null && countdown > 0 && (
                            <div className="countdown-overlay">
                                <span>{countdown}</span>
                            </div>
                        )}
                        {countdown === 0 && (
                            <div className="countdown-overlay go">GO!</div>
                        )}

                        <div className="room-layout">

                            {/* === Players sidebar === */}
                            <div className="players-sidebar">
                                <h2 className="sidebar-title">Players ({playerList.length}/5)</h2>
                                <ul className="player-list">
                                    {playerList.map((p) => (
                                        <li key={p.id} className={`player-item ${p.id === socket.id ? "self" : ""}`}>
                                            <span className="player-avatar">
                                                {p.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span className="player-name">
                                                {p.name}
                                                {p.id === socket.id && " (you)"}
                                            </span>
                                            <span className={`ready-badge ${p.ready ? "ready" : "not-ready"}`}>
                                                {p.ready ? "✓ Ready" : "Waiting"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    id="btn-ready"
                                    className={`btn-ready ${isReady ? "active" : ""}`}
                                    onClick={handleReady}
                                    disabled={gameState === "countdown"}
                                >
                                    {isReady ? "✅ Ready!" : "Click to Ready"}
                                </button>

                                {error && <p className="lobby-error">{error}</p>}

                                <p className="start-hint">
                                    {gameState === "countdown"
                                        ? "🚀 Starting…"
                                        : "Need 2+ players all ready to start"}
                                </p>
                            </div>

                            {/* === Chat panel === */}
                            <div className="chat-panel">
                                <h2 className="sidebar-title">💬 Room Chat</h2>

                                <div className="chat-messages" id="chat-messages">
                                    {chatMessages.length === 0 && (
                                        <p className="chat-empty">No messages yet. Say hi! 👋</p>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`chat-msg ${msg.senderId === socket.id ? "mine" : "theirs"}`}
                                        >
                                            <span className="chat-sender">{msg.sender}</span>
                                            <span className="chat-text">{msg.text}</span>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                <form className="chat-form" onSubmit={handleSendChat} id="chat-form">
                                    <input
                                        id="chat-input"
                                        className="chat-input"
                                        placeholder="Type a message…"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        maxLength={300}
                                    />
                                    <button type="submit" className="btn-send" id="btn-send-chat">
                                        Send
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
