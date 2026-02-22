import User from "../models/User.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

const razorpay = (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) ? new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
}) : null;

/**
 * Creates a Razorpay Order.
 * If credentials missing, returns a mock order for demo.
 */
export async function createCheckoutSession(req, res) {
    try {
        const { gems, price } = req.body;
        const userId = req.userId;

        if (!gems || !price) {
            return res.status(400).json({ error: "Gems and price are required" });
        }

        if (!razorpay) {
            console.log("No RAZORPAY credentials found. Using Mock Order flow.");
            return res.json({
                mock: true,
                order_id: "order_mock_" + Date.now(),
                amount: price * 100,
                currency: "INR",
                key_id: "rzp_test_mock_key"
            });
        }

        const options = {
            amount: price * 100, // amount in smallest currency unit (paisa)
            currency: "INR",
            receipt: `receipt_gem_${Date.now()}`,
            notes: {
                userId: userId.toString(),
                gems: gems.toString(),
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error("[Razorpay Order Error]", err);
        res.status(500).json({ error: "Failed to create payment order" });
    }
}

/**
 * Verifies Razorpay Payment Signature and adds gems.
 */
export async function handlePaymentSuccess(req, res) {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            gems
        } = req.body;

        const userId = req.userId;

        // 1. Signature Verification
        if (razorpay) {
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ error: "Invalid payment signature" });
            }
        } else {
            console.log("Mock Payment Verification");
        }

        // 2. Add Gems
        const gemAmount = parseInt(gems);
        if (isNaN(gemAmount)) return res.status(400).json({ error: "Invalid gem count" });

        const user = await User.findByIdAndUpdate(
            userId,
            { $inc: { gems: gemAmount } },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "User not found" });

        console.log(`[Razorpay] Success: Added ${gemAmount} gems to ${user.username}`);
        res.json({ success: true, message: "Gems added successfully!", gems: user.gems });
    } catch (err) {
        console.error("[Razorpay Verification Error]", err);
        res.status(500).json({ error: "Server error fulfilling order" });
    }
}
