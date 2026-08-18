import pool from "../config/db.js";
import cloudinary from "../config/cloudinary.js";
import stripe from "../utils/stripeClient.js";
import * as jazzcash from "../utils/jazzcashClient.js";
import * as easypaisa from "../utils/easypaisaClient.js";
import { finalizeOrder, InsufficientStockError } from "./orderController.js";
import {
    sendRefundEmail, sendPaymentSuccessfulEmail, sendPaymentFailedEmail,
    sendAdminFailedPaymentEmail, sendAdminRefundIssuedEmail,
} from "../utils/emailService.js";
import { createNotification } from "../utils/notificationService.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Creates a Stripe-hosted checkout page for an already-created (pending) order.
export const createStripeSession = async (req, res) => {
    try {
        const { order_id } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, message: "order_id is required." });
        }

        const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [order_id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        const order = orderResult.rows[0];
        if (order.finalized_at) {
            return res.status(409).json({ success: false, message: "This order has already been paid." });
        }

        const itemsResult = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [order_id]);

        // IMPORTANT: line_items must sum to order.total, or the customer gets charged
        // something different from what's on record. Itemized product lines alone only
        // cover subtotal — shipping and discount have to be added explicitly.
        const line_items = itemsResult.rows.map(item => ({
            price_data: {
                currency: "pkr",
                product_data: { name: item.product_name },
                unit_amount: Math.round(Number(item.price) * 100), // Stripe wants the smallest currency unit
            },
            quantity: item.quantity,
        }));

        const shippingFee = Number(order.shipping_fee) || 0;
        if (shippingFee > 0) {
            line_items.push({
                price_data: {
                    currency: "pkr",
                    product_data: { name: "Shipping" },
                    unit_amount: Math.round(shippingFee * 100),
                },
                quantity: 1,
            });
        }

        // Stripe Checkout doesn't accept a negative line item, so a discount has to be
        // applied as a one-off coupon rather than baked into unit_amount.
        let discounts;
        const discountAmount = Number(order.discount) || 0;
        if (discountAmount > 0) {
            const coupon = await stripe.coupons.create({
                amount_off: Math.round(discountAmount * 100),
                currency: "pkr",
                duration: "once",
                name: `Discount for ${order.order_number}`,
            });
            discounts = [{ coupon: coupon.id }];
        }

        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            payment_method_types: ["card"],
            line_items,
            ...(discounts && { discounts }),
            customer_email: order.customer_email,
            // order_number + email let the /order-success page use the existing public
            // track-order endpoint to confirm payment — no new customer-facing route needed.
            success_url: `${FRONTEND_URL}/order-success?order_number=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.customer_email)}`,
            cancel_url: `${FRONTEND_URL}/order-cancel?order_number=${encodeURIComponent(order.order_number)}`,
            metadata: { order_id: order.id },
        });

        res.status(200).json({ success: true, url: session.url });
    } catch (error) {
        console.error("Stripe session creation failed:", error.message);
        res.status(500).json({ success: false, message: "We couldn't start your card payment. Please try again, or choose Cash on Delivery." });
    }
};

// A Stripe payment succeeded, but the item(s) sold out before finalizeOrder() could
// reserve the stock (the customer sat on Stripe's checkout page long enough for someone
// else to buy the last units). The charge already went through, so this refunds it,
// marks the order accordingly, and notifies the customer + admin — rather than leaving
// stock negative or silently keeping money for an order that can't be fulfilled.
//
// NOTE: confirm `orders.payment_status` accepts 'refunded' (migrate if it's a
// CHECK constraint/enum limited to 'unpaid'/'paid' today) before relying on this.
async function refundOversoldOrder(orderId, paymentIntentId, productName) {
    try {
        if (paymentIntentId) {
            await stripe.refunds.create({ payment_intent: paymentIntentId });
        }

        const result = await pool.query(
            `UPDATE orders SET payment_status = 'refunded', order_status = 'cancelled' WHERE id = $1 RETURNING *`,
            [orderId]
        );
        const order = result.rows[0];
        if (!order) return;

        await pool.query(
            `INSERT INTO order_timeline (order_id, status, note) VALUES ($1, 'cancelled', $2)`,
            [orderId, `Payment automatically refunded — ${productName} sold out before the order could be confirmed.`]
        );

        const reason = `${productName} sold out before it could be confirmed`;
        sendRefundEmail(order, { reason });
        sendAdminRefundIssuedEmail(order, reason);

        createNotification({
            userId: null,
            title: "Order auto-refunded — out of stock",
            message: `Order ${order.order_number} was refunded: ${productName} sold out before payment could be confirmed.`,
            type: "admin_order",
            link: "/admin/orders",
        });
    } catch (refundError) {
        // The refund itself failed — this needs a human, not another silent retry.
        console.error(`CRITICAL: failed to auto-refund oversold order ${orderId}:`, refundError.message);
        createNotification({
            userId: null,
            title: "URGENT: refund failed for oversold order",
            message: `Order ${orderId} sold out but the automatic Stripe refund failed. Refund manually in the Stripe dashboard.`,
            type: "admin_order",
            link: "/admin/orders",
        });
    }
}


// IMPORTANT: this route must receive the RAW request body, not JSON-parsed —
// see the server.js instructions below. Signature verification fails otherwise.
export const stripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
        console.error("Stripe webhook signature verification failed:", error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        if (orderId) {
            try {
                // finalizeOrder() itself is idempotent (guarded by finalized_at), so even if
                // Stripe redelivers this event, stock/emails/notifications only fire once.
                await pool.query(
                    "UPDATE orders SET payment_status = 'paid' WHERE id = $1 AND payment_status != 'paid'",
                    [orderId]
                );
                const order = await finalizeOrder(orderId);
                // Separate from the order-confirmation email finalizeOrder() already sends —
                // this one is specifically the "Payment Received" receipt (Part 2, item 7).
                sendPaymentSuccessfulEmail(order, {
                    paymentId: session.payment_intent,
                    amount: order.total,
                    method: "Credit/Debit Card",
                });
            } catch (error) {
                if (error instanceof InsufficientStockError) {
                    // Payment already succeeded at this point (Stripe only sends this event
                    // after capture), so we can't just fail the order — the customer needs
                    // their money back.
                    await refundOversoldOrder(orderId, session.payment_intent, error.productName);
                } else {
                    // Payment was already captured by Stripe, but finalization (stock
                    // deduction / confirmation email / notifications) failed for a
                    // non-stock reason. We still return 200 below so Stripe won't retry
                    // (retrying wouldn't help — the order/session itself is fine), so
                    // without this alert a paid-but-unfinalized order would otherwise
                    // sit silently forever with only a console log no one sees.
                    console.error(`Failed to finalize order ${orderId} after Stripe payment:`, error.message);
                    createNotification({
                        userId: null,
                        title: "URGENT: paid order failed to finalize",
                        message: `Order ${orderId} was paid via Stripe but finalization failed (${error.message}). Stock was not deducted and the customer was not emailed — check and finalize this order manually.`,
                        type: "admin_order",
                        link: "/admin/orders",
                    });
                }
            }
        }
    } else if (event.type === "checkout.session.expired") {
        // Customer abandoned the Stripe checkout page — nothing to finalize,
        // order simply stays pending/unpaid and can be retried from /order-cancel.
        // This is the closest "payment failed" signal Stripe's default webhook config
        // gives us. If you also enable payment_intent.payment_failed in your Stripe
        // Dashboard webhook settings, add a matching `else if` branch here for it too.
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        console.log(`Stripe checkout session expired for order ${orderId || "unknown"}.`);
        if (orderId) {
            const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [orderId]);
            const order = orderResult.rows[0];
            if (order && !order.finalized_at) {
                sendPaymentFailedEmail(order, { reason: "checkout session expired" });
                sendAdminFailedPaymentEmail(order, "Stripe checkout session expired");
            }
        }
    }

    res.status(200).json({ received: true });
};

// ==========================================
// PAYMENT CONFIG — lets the frontend know which gateways are actually usable
// (credentials configured) so it can grey out an option instead of failing
// silently when the customer clicks "Proceed to Payment".
// ==========================================
export const getPaymentConfig = async (req, res) => {
    res.status(200).json({
        success: true,
        gateways: {
            stripe: Boolean(process.env.STRIPE_SECRET_KEY),
            // JazzCash/Easypaisa now run in manual-verification mode (customer sends
            // payment + uploads a screenshot, admin approves) instead of needing real
            // merchant API credentials — always available regardless of jazzcash/
            // easypaisa.isConfigured(), which stays unused unless real API access
            // is set up later.
            jazzcash: true,
            easypaisa: true,
            cod: true,
        },
    });
};

// Shared helper: records a payment_transactions row (the replay/duplicate guard),
// stamps the order as paid + provider + transaction_id, and runs finalizeOrder().
// Returns { alreadyProcessed: true } if this (provider, transactionId) was seen before,
// instead of reprocessing (stock deduction, emails, notifications are NOT idempotent
// across a second call the way finalizeOrder()'s own finalized_at guard protects against
// duplicate provider callbacks specifically keyed by transaction id). Returns the
// finalized order row too, so callers can send the Payment Successful email off it.
async function recordPaymentAndFinalize({ orderId, provider, transactionId, rawPayload }) {
    const existing = await pool.query(
        "SELECT id FROM payment_transactions WHERE provider = $1 AND transaction_id = $2",
        [provider, transactionId]
    );
    if (existing.rows.length > 0) {
        return { alreadyProcessed: true };
    }

    try {
        await pool.query(
            `INSERT INTO payment_transactions (order_id, provider, transaction_id, status, raw_payload)
             VALUES ($1, $2, $3, 'paid', $4)`,
            [orderId, provider, transactionId, rawPayload]
        );
    } catch (error) {
        // UNIQUE (provider, transaction_id) violation — another concurrent callback beat
        // us to it. Treat exactly like the "already processed" branch above.
        if (error.code === "23505") {
            return { alreadyProcessed: true };
        }
        throw error;
    }

    await pool.query(
        `UPDATE orders
         SET payment_status = 'paid', payment_provider = $1, transaction_id = $2,
             paid_at = NOW(), gateway_callback = $3
         WHERE id = $4 AND payment_status != 'paid'`,
        [provider, transactionId, rawPayload, orderId]
    );

    const order = await finalizeOrder(orderId);
    return { alreadyProcessed: false, order };
}

// ==========================================
// JAZZCASH
// ==========================================
export const createJazzCashSession = async (req, res) => {
    try {
        const { order_id } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, message: "order_id is required." });
        }
        if (!jazzcash.isConfigured()) {
            return res.status(503).json({
                success: false,
                message: "JazzCash payments aren't configured yet — please choose another payment method.",
            });
        }

        const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [order_id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        const order = orderResult.rows[0];
        if (order.finalized_at) {
            return res.status(409).json({ success: false, message: "This order has already been paid." });
        }

        const { url, fields } = jazzcash.buildCheckoutFields({ order });
        res.status(200).json({ success: true, url, fields });
    } catch (error) {
        console.error("JazzCash session creation failed:", error.message);
        res.status(500).json({ success: false, message: "We couldn't start your JazzCash payment. Please try again, or choose another method." });
    }
};

// JazzCash POSTs the result back to pp_ReturnURL (this route). We verify the signature,
// look the order up by pp_BillReference (= our order_number), guard against
// replay/duplicate callbacks, finalize on success, and redirect the customer's browser
// back to the frontend — mirroring Stripe's success_url/cancel_url pattern, just via a
// server-side redirect instead of a client-side one since this is a POST callback, not a
// page the customer was already on.
export const jazzcashCallback = async (req, res) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    try {
        const result = jazzcash.verifyCallback(req.body);
        const orderResult = await pool.query("SELECT * FROM orders WHERE order_number = $1", [req.body.pp_BillReference]);
        const order = orderResult.rows[0];

        if (!order) {
            console.error("JazzCash callback for unknown order:", req.body.pp_BillReference);
            return res.redirect(`${FRONTEND_URL}/order-cancel`);
        }

        if (!result.valid) {
            console.error(`JazzCash callback signature invalid for order ${order.order_number}.`);
            await pool.query(
                `INSERT INTO payment_transactions (order_id, provider, transaction_id, status, raw_payload)
                 VALUES ($1, 'jazzcash', $2, 'signature_invalid', $3)
                 ON CONFLICT (provider, transaction_id) DO NOTHING`,
                [order.id, result.txnRefNo || `invalid-${Date.now()}`, req.body]
            );
            return res.redirect(`${FRONTEND_URL}/order-cancel?order_number=${encodeURIComponent(order.order_number)}`);
        }

        if (!result.isSuccess) {
            // Customer cancelled, or the bank/wallet declined — not an error on our end.
            await pool.query(
                `INSERT INTO payment_transactions (order_id, provider, transaction_id, status, raw_payload)
                 VALUES ($1, 'jazzcash', $2, 'failed', $3)
                 ON CONFLICT (provider, transaction_id) DO NOTHING`,
                [order.id, result.txnRefNo, req.body]
            );
            sendPaymentFailedEmail(order, { reason: result.responseMessage || "declined by JazzCash" });
            sendAdminFailedPaymentEmail(order, `JazzCash: ${result.responseMessage || result.responseCode}`);
            return res.redirect(`${FRONTEND_URL}/order-cancel?order_number=${encodeURIComponent(order.order_number)}`);
        }

        try {
            const { order: finalizedOrder } = await recordPaymentAndFinalize({
                orderId: order.id,
                provider: "jazzcash",
                transactionId: result.txnRefNo,
                rawPayload: req.body,
            });
            if (finalizedOrder) {
                sendPaymentSuccessfulEmail(finalizedOrder, { paymentId: result.txnRefNo, amount: finalizedOrder.total, method: "JazzCash" });
            }
        } catch (error) {
            if (error instanceof InsufficientStockError) {
                // JazzCash doesn't expose a customer-facing refund API to us the way
                // Stripe does — mark it plainly for a human to refund manually via the
                // JazzCash Merchant Portal.
                await pool.query(
                    `UPDATE orders SET payment_status = 'paid', order_status = 'cancelled' WHERE id = $1`,
                    [order.id]
                );
                createNotification({
                    userId: null,
                    title: "URGENT: JazzCash order oversold — manual refund needed",
                    message: `Order ${order.order_number} was paid via JazzCash but ${error.productName} sold out before it could be confirmed. Refund manually via the JazzCash Merchant Portal.`,
                    type: "admin_order",
                    link: "/admin/orders",
                });
            } else {
                console.error(`Failed to finalize JazzCash order ${order.order_number}:`, error.message);
                createNotification({
                    userId: null,
                    title: "URGENT: paid JazzCash order failed to finalize",
                    message: `Order ${order.order_number} was paid via JazzCash but finalization failed (${error.message}). Check and finalize manually.`,
                    type: "admin_order",
                    link: "/admin/orders",
                });
            }
        }

        return res.redirect(`${FRONTEND_URL}/order-success?order_number=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.customer_email)}`);
    } catch (error) {
        console.error("JazzCash callback handling failed:", error.message);
        return res.redirect(`${FRONTEND_URL}/order-cancel`);
    }
};

// ==========================================
// EASYPAISA
// ==========================================
export const createEasypaisaSession = async (req, res) => {
    try {
        const { order_id } = req.body;
        if (!order_id) {
            return res.status(400).json({ success: false, message: "order_id is required." });
        }
        if (!easypaisa.isConfigured()) {
            return res.status(503).json({
                success: false,
                message: "Easypaisa payments aren't configured yet — please choose another payment method.",
            });
        }

        const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [order_id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        const order = orderResult.rows[0];
        if (order.finalized_at) {
            return res.status(409).json({ success: false, message: "This order has already been paid." });
        }

        const { url, fields } = easypaisa.buildCheckoutFields({ order });
        res.status(200).json({ success: true, url, fields });
    } catch (error) {
        console.error("Easypaisa session creation failed:", error.message);
        res.status(500).json({ success: false, message: "We couldn't start your Easypaisa payment. Please try again, or choose another method." });
    }
};

// Easypaisa posts back to postBackURL with orderRefNum + its own status fields.
// Same shape as the JazzCash callback above: verify (best-effort — see easypaisaClient.js
// header), guard duplicates, finalize, redirect.
export const easypaisaCallback = async (req, res) => {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    try {
        const result = easypaisa.parseCallback(req.body);

        // orderRefNum was generated fresh per attempt (EP<timestamp>) — it isn't stored
        // directly on the order row, so we match via payment_transactions if this is a
        // retry, otherwise fall back to matching the most recent pending order this
        // customer/session created. Simplest reliable approach: also accept an
        // order_number/order_id passed straight through as an optional query param on the
        // postBackURL itself (recommended), since Easypaisa echoes back whatever query
        // string is on the postBackURL you registered.
        const orderNumber = req.query.order_number;
        if (!orderNumber) {
            console.error("Easypaisa callback missing order_number on postBackURL query string.");
            return res.redirect(`${FRONTEND_URL}/order-cancel`);
        }

        const orderResult = await pool.query("SELECT * FROM orders WHERE order_number = $1", [orderNumber]);
        const order = orderResult.rows[0];
        if (!order) {
            console.error("Easypaisa callback for unknown order:", orderNumber);
            return res.redirect(`${FRONTEND_URL}/order-cancel`);
        }

        if (!result.isSuccess) {
            await pool.query(
                `INSERT INTO payment_transactions (order_id, provider, transaction_id, status, raw_payload)
                 VALUES ($1, 'easypaisa', $2, 'failed', $3)
                 ON CONFLICT (provider, transaction_id) DO NOTHING`,
                [order.id, result.orderRefNum || `failed-${Date.now()}`, req.body]
            );
            sendPaymentFailedEmail(order, { reason: result.status ? `declined by Easypaisa (${result.status})` : "declined by Easypaisa" });
            sendAdminFailedPaymentEmail(order, `Easypaisa: ${result.status || "unknown"}`);
            return res.redirect(`${FRONTEND_URL}/order-cancel?order_number=${encodeURIComponent(order.order_number)}`);
        }

        try {
            const { order: finalizedOrder } = await recordPaymentAndFinalize({
                orderId: order.id,
                provider: "easypaisa",
                transactionId: result.transactionId || result.orderRefNum,
                rawPayload: req.body,
            });
            if (finalizedOrder) {
                sendPaymentSuccessfulEmail(finalizedOrder, { paymentId: result.transactionId || result.orderRefNum, amount: finalizedOrder.total, method: "Easypaisa" });
            }
        } catch (error) {
            if (error instanceof InsufficientStockError) {
                await pool.query(
                    `UPDATE orders SET payment_status = 'paid', order_status = 'cancelled' WHERE id = $1`,
                    [order.id]
                );
                createNotification({
                    userId: null,
                    title: "URGENT: Easypaisa order oversold — manual refund needed",
                    message: `Order ${order.order_number} was paid via Easypaisa but ${error.productName} sold out before it could be confirmed. Refund manually via the Easypaisa Merchant Portal.`,
                    type: "admin_order",
                    link: "/admin/orders",
                });
            } else {
                console.error(`Failed to finalize Easypaisa order ${order.order_number}:`, error.message);
                createNotification({
                    userId: null,
                    title: "URGENT: paid Easypaisa order failed to finalize",
                    message: `Order ${order.order_number} was paid via Easypaisa but finalization failed (${error.message}). Check and finalize manually.`,
                    type: "admin_order",
                    link: "/admin/orders",
                });
            }
        }

        return res.redirect(`${FRONTEND_URL}/order-success?order_number=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(order.customer_email)}`);
    } catch (error) {
        console.error("Easypaisa callback handling failed:", error.message);
        return res.redirect(`${FRONTEND_URL}/order-cancel`);
    }
};
// ==========================================
// MANUAL PAYMENT VERIFICATION (JazzCash / Easypaisa)
// ==========================================
// Customer sends money to our JazzCash/Easypaisa number directly, then uploads
// a screenshot + reference here. Order sits as 'pending_verification' until an
// admin reviews the screenshot and approves or rejects it below.
export const submitManualPaymentProof = async (req, res) => {
    try {
        const { id } = req.params;
        const { reference } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a screenshot of your payment." });
        }

        const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        const order = orderResult.rows[0];
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        if (!["jazzcash", "easypaisa"].includes(order.payment_method)) {
            return res.status(400).json({ success: false, message: "This order isn't set up for manual payment verification." });
        }

        const uploadResult = await cloudinary.uploader.upload(req.file.path, { folder: "arwa-payment-proofs" });

        await pool.query(
            `UPDATE orders SET payment_proof_url = $1, payment_reference = $2, payment_status = 'pending_verification' WHERE id = $3`,
            [uploadResult.secure_url, reference || null, id]
        );

        createNotification({
            userId: null,
            title: "Payment proof submitted",
            message: `${order.customer_name} submitted a ${order.payment_method === "jazzcash" ? "JazzCash" : "Easypaisa"} payment screenshot for order ${order.order_number}. Please verify.`,
            type: "admin_order",
            link: "/admin/orders",
        });

        res.status(200).json({ success: true, message: "Payment proof submitted. We'll verify and confirm your order shortly." });
    } catch (error) {
        console.error("submitManualPaymentProof failed:", error.message);
        res.status(500).json({ success: false, message: "Couldn't submit payment proof. Please try again." });
    }
};

// Admin approves or rejects a manually-submitted JazzCash/Easypaisa payment.
// Reuses recordPaymentAndFinalize() — the same helper the real JazzCash/Stripe
// webhooks use — so stock deduction, emails, and notifications stay identical
// to every other payment path instead of duplicating that logic here.
export const verifyManualPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { approve } = req.body;

        const orderResult = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
        const order = orderResult.rows[0];
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        if (approve) {
            const { order: finalizedOrder, alreadyProcessed } = await recordPaymentAndFinalize({
                orderId: order.id,
                provider: order.payment_method,
                transactionId: order.payment_reference || `manual-${order.id}`,
                rawPayload: { proof_url: order.payment_proof_url, verified_by_admin: true },
            });
            if (!alreadyProcessed && finalizedOrder) {
                sendPaymentSuccessfulEmail(finalizedOrder, {
                    paymentId: order.payment_reference || "manual",
                    amount: finalizedOrder.total,
                    method: order.payment_method === "jazzcash" ? "JazzCash" : "Easypaisa",
                });
            }
            return res.status(200).json({ success: true, message: "Payment approved and order confirmed." });
        } else {
            await pool.query(
                `UPDATE orders SET payment_status = 'failed', order_status = 'cancelled' WHERE id = $1`,
                [id]
            );
            sendPaymentFailedEmail(order, { reason: "payment could not be verified" });
            return res.status(200).json({ success: true, message: "Payment rejected. Customer has been notified." });
        }
    } catch (error) {
        if (error instanceof InsufficientStockError) {
            await pool.query(`UPDATE orders SET payment_status = 'paid', order_status = 'cancelled' WHERE id = $1`, [req.params.id]);
            return res.status(409).json({ success: false, message: `Approved, but ${error.productName} sold out — order cancelled, please refund manually and inform the customer.` });
        }
        console.error("verifyManualPayment failed:", error.message);
        res.status(500).json({ success: false, message: "Couldn't process verification." });
    }
};