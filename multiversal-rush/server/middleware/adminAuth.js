// ============================================================
//  middleware/adminAuth.js — Admin-only JWT verification
//  Only tokens issued with isAdmin:true pass this middleware.
//
//  Admin secret is set via ADMIN_SECRET env var.
//  POST /api/admin/login { secret } → returns an admin JWT.
// ============================================================
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "multiversal_secret_change_me";

/**
 * requireAdmin
 *  — verifies bearer token
 *  — checks decoded.isAdmin === true
 *  — attaches req.adminId to the request
 */
export function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Admin token missing" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: "Admin access required" });
        }
        req.adminId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ error: "Admin token invalid or expired" });
    }
}
