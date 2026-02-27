// Re-export Voice.jsx so both `voice.js` and `Voice.jsx` case variants resolve correctly.
// This fixes Windows case-insensitive file system + Vite HMR cache issues.
export { default } from "./Voice.jsx";
