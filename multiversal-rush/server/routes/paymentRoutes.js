import express from "express";
import { createCheckoutSession, handlePaymentSuccess } from "../controllers/paymentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// POST /api/payments/create-checkout-session (Razorpay Order)
router.post("/create-checkout-session", requireAuth, createCheckoutSession);

// POST /api/payments/verify (Razorpay Signature Verification)
router.post("/verify", requireAuth, handlePaymentSuccess);

export default router;
