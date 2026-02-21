// ============================================================
//  main.jsx — React entry point
// ============================================================
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import Long from 'long';
import * as protobuf from 'protobufjs/minimal';

// Global fix for protobufjs "util.Long is not a constructor" error
if (typeof window !== 'undefined') {
    window.Long = Long;
}
if (protobuf && protobuf.util) {
    protobuf.util.Long = Long;
    if (typeof protobuf.configure === 'function') {
        protobuf.configure();
    }
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
