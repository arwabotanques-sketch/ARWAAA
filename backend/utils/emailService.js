import { Resend } from "resend";

// Switched from Nodemailer/Gmail SMTP to Resend (HTTPS API) because Render
// (and most cloud hosts) block or heavily throttle outbound SMTP ports —
// this is what caused "Email send failed: Connection timeout" in production
// even though the exact same Gmail credentials worked fine locally. Resend
// sends over normal HTTPS, so it isn't affected by that class of block.
const resend = new Resend(process.env.RESEND_API_KEY);

// Using Resend's shared sandbox sender for now. IMPORTANT: onboarding@resend.dev
// can only deliver to the email address you signed up to Resend with — it
// will silently fail (or Resend's dashboard will show it as rejected) for
// any other recipient. This is fine for solo testing but NOT fine for real
// customers. Once you verify your own domain in Resend (Domains tab, add
// the DNS records they give you), change this to something like
// "ARWA Botaniqs <noreply@arwaa.pk>" and every recipient will work.
const SEND_FROM = "ARWA Botaniqs <onboarding@resend.dev>";

const BRAND_GREEN = "#1a3d2b";
const BRAND_GOLD = "#c9a84c";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function wrapper(bodyHtml) {
    return `
    <div style="font-family: Arial, sans-serif; background:#f5f0e8; padding:32px;">
      <div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5decf;">
        <div style="background:${BRAND_GREEN}; padding:24px; text-align:center;">
          <span style="color:${BRAND_GOLD}; font-size:22px; font-weight:bold; letter-spacing:2px;">ARWA BOTANIQS</span>
        </div>
        <div style="padding:32px; color:#2a2a2a; line-height:1.6;">
          ${bodyHtml}
        </div>
        <div style="padding:16px; text-align:center; font-size:12px; color:#999;">
          © ${new Date().getFullYear()} Arwa Botaniqs. All rights reserved.
        </div>
      </div>
    </div>`;
}

// Every send* function swallows its own errors — a failed email should
// never break registration, checkout, or a password change.
async function safeSend(mailOptions) {
    try {
        const { error } = await resend.emails.send({ from: SEND_FROM, ...mailOptions });
        if (error) console.error("Email send failed:", error.message || error);
    } catch (error) {
        console.error("Email send failed:", error.message);
    }
}

export async function sendWelcomeEmail(user) {
    await safeSend({
        to: user.email,
        subject: "Welcome to Arwa Botaniqs 🌿",
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Welcome, ${user.first_name}!</h2>
            <p>Thank you for creating an account with Arwa Botaniqs. We're so glad to have you.</p>
            <p>Explore our range of 100% botanical skincare, crafted with nature's finest ingredients.</p>
            <a href="${FRONTEND_URL}/auth/login" style="display:inline-block; margin-top:16px; padding:12px 28px; background:${BRAND_GREEN}; color:${BRAND_GOLD}; text-decoration:none; letter-spacing:1px;">SIGN IN</a>
        `),
    });
}

export async function sendOrderConfirmationEmail(order, items) {
    const itemRows = items.map(i =>
        `<tr>
            <td style="padding:8px 0; border-bottom:1px solid #eee;">${i.product_name} × ${i.quantity}</td>
            <td style="padding:8px 0; border-bottom:1px solid #eee; text-align:right;">Rs. ${Number(i.subtotal).toLocaleString()}</td>
        </tr>`
    ).join("");

    await safeSend({
        to: order.customer_email,
        subject: `Order Confirmed — ${order.order_number}`,
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Thank you, ${order.customer_name}!</h2>
            <p>Your order <strong>${order.order_number}</strong> has been placed successfully.</p>
            <table style="width:100%; border-collapse:collapse; margin:20px 0;">${itemRows}</table>
            <p><strong>Total: Rs. ${Number(order.total).toLocaleString()}</strong></p>
            <p style="margin-top:20px;">Shipping to:<br>${order.shipping_address}, ${order.shipping_city}, ${order.shipping_province}</p>
            <p>Estimated delivery: 2–4 business days.</p>
            <a href="${FRONTEND_URL}/track/${order.id}" style="display:inline-block; margin-top:16px; padding:12px 28px; background:${BRAND_GREEN}; color:${BRAND_GOLD}; text-decoration:none; letter-spacing:1px;">TRACK ORDER</a>
        `),
    });
}

const STATUS_LABELS = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

export async function sendOrderStatusEmail(order) {
    const label = STATUS_LABELS[order.order_status] || order.order_status;
    await safeSend({
        to: order.customer_email,
        subject: `Order ${order.order_number} — ${label}`,
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Your order is now: ${label}</h2>
            <p>Hi ${order.customer_name}, your order <strong>${order.order_number}</strong> status has been updated to <strong>${label}</strong>.</p>
            ${order.tracking_number ? `<p>Tracking number: <strong>${order.tracking_number}</strong>${order.courier ? ` (${order.courier})` : ""}</p>` : ""}
            <a href="${FRONTEND_URL}/track/${order.id}" style="display:inline-block; margin-top:16px; padding:12px 28px; background:${BRAND_GREEN}; color:${BRAND_GOLD}; text-decoration:none; letter-spacing:1px;">TRACK ORDER</a>
        `),
    });
}

// Sent when a payment is refunded — distinct from sendOrderStatusEmail("cancelled"),
// since a refund needs to clearly tell the customer their money is coming back,
// not just that the order was cancelled.
export async function sendRefundEmail(order, { reason } = {}) {
    await safeSend({
        to: order.customer_email,
        subject: `Refund Issued — Order ${order.order_number}`,
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Your payment has been refunded</h2>
            <p>Hi ${order.customer_name}, we're sorry — your order <strong>${order.order_number}</strong> could not be fulfilled${reason ? ` because ${reason}` : ""}, so it has been cancelled and your payment has been refunded in full.</p>
            <p><strong>Refund amount: Rs. ${Number(order.total).toLocaleString()}</strong></p>
            <p>The refund has been issued to your original payment method. Depending on your bank, it can take 5–10 business days to appear on your statement.</p>
            <p style="margin-top:20px;">We're genuinely sorry for the inconvenience — please feel free to reach out if you have any questions, or place a new order if the item comes back in stock.</p>
        `),
    });
}

export async function sendPasswordChangedEmail(user) {
    await safeSend({
        to: user.email,
        subject: "Your password was changed",
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Password changed</h2>
            <p>Hi ${user.first_name || ""}, this is a confirmation that your Arwa Botaniqs account password was just changed.</p>
            <p>If you didn't make this change, please contact us immediately.</p>
        `),
    });
}

// Sent on registration and on resend — carries BOTH the 6-digit OTP (for the
// OTPBoxes UI) and the verification link (secondary path, for people who'd
// rather click a button than type digits). Either one verifies the account.
export async function sendVerificationEmail(user, { token, otp }) {
    const verifyUrl = `${FRONTEND_URL}/auth/verify-email?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}`;
    await safeSend({
        to: user.email,
        subject: "Verify your email — Arwa Botaniqs",
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Verify your email</h2>
            <p>Hi ${user.first_name || ""}, welcome to Arwa Botaniqs! Use the code below to verify your account:</p>
            <div style="text-align:center; margin:28px 0;">
                <span style="display:inline-block; padding:14px 28px; background:#f5f0e8; border:1px solid #e5decf; font-size:28px; font-weight:bold; letter-spacing:8px; color:${BRAND_GREEN};">${otp}</span>
            </div>
            <p style="color:#777; font-size:13px;">This code expires in 10 minutes.</p>
            <p style="margin-top:20px;">Or click the button below instead:</p>
            <a href="${verifyUrl}" style="display:inline-block; margin-top:8px; padding:12px 28px; background:${BRAND_GREEN}; color:${BRAND_GOLD}; text-decoration:none; letter-spacing:1px;">VERIFY EMAIL</a>
            <p style="margin-top:20px; color:#777; font-size:13px;">If you didn't create this account, you can safely ignore this email.</p>
        `),
    });
}

// Shared by forgot-password and (optionally) login-verification OTP sends.
// `purpose` only changes the copy — the actual expiry/attempt logic lives in otpService.js.
export async function sendOtpEmail(user, otp, purpose = "reset") {
    const copy = purpose === "reset"
        ? { subject: "Password reset code — Arwa Botaniqs", heading: "Reset your password", body: "Use the code below to reset your password." }
        : { subject: "Your login code — Arwa Botaniqs", heading: "Your login code", body: "Use the code below to complete your login." };

    await safeSend({
        to: user.email,
        subject: copy.subject,
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">${copy.heading}</h2>
            <p>Hi ${user.first_name || ""}, ${copy.body}</p>
            <div style="text-align:center; margin:28px 0;">
                <span style="display:inline-block; padding:14px 28px; background:#f5f0e8; border:1px solid #e5decf; font-size:28px; font-weight:bold; letter-spacing:8px; color:${BRAND_GREEN};">${otp}</span>
            </div>
            <p style="color:#777; font-size:13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email — your account is still secure.</p>
        `),
    });
}

// Sent when repeated failed logins trigger a temporary lockout — lets a genuine
// owner know immediately if someone else is guessing their password.
export async function sendAccountLockedEmail(user, { unlockAt }) {
    await safeSend({
        to: user.email,
        subject: "Your account was temporarily locked — Arwa Botaniqs",
        html: wrapper(`
            <h2 style="color:${BRAND_GREEN};">Account temporarily locked</h2>
            <p>Hi ${user.first_name || ""}, we noticed several failed login attempts on your account, so it's been temporarily locked as a precaution.</p>
            <p><strong>It will unlock automatically at: ${unlockAt}</strong></p>
            <p style="margin-top:20px;">If this wasn't you, we'd recommend resetting your password once it unlocks. If it was you, just wait for the lock to lift or reset your password now to skip the wait.</p>
        `),
    });
}