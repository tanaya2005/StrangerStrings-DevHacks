// ============================================================
//  middleware/auth.js — JWT verification middleware
//  Attach to any route that requires a logged-in user.
// ============================================================
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "multiversal_secret_change_me";

export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided. Please log in." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.username = decoded.username;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Token invalid or expired. Please log in again." });
    }
}
