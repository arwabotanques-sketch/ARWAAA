import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import {
    sendPasswordChangedEmail, sendWelcomeEmail,
    sendVerificationEmail, sendOtpEmail, sendAccountLockedEmail,
    sendAdminNewCustomerEmail,
} from "../utils/emailService.js";
import cloudinary from "../config/cloudinary.js";
import { createNotification } from "../utils/notificationService.js";
import { generateToken, hashToken } from "../utils/tokenService.js";
import { generateOtp, hashOtp, verifyOtp, checkResendCooldown, otpExpiryDate } from "../utils/otpService.js";
import { verifyGoogleAccessToken, isConfigured as googleConfigured } from "../utils/googleAuth.js";
import { verifyFacebookAccessToken, isConfigured as facebookConfigured } from "../utils/facebookAuth.js";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,   // set to true once you deploy with HTTPS
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const FAILED_LOGIN_LIMIT = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// token_version is embedded in every JWT — bumping it in the DB (on password change /
// "log out everywhere") makes every previously-issued token fail verification, since
// customerAuthMiddleware checks the embedded version against the current DB value.
function signCustomerToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, tokenVersion: user.token_version ?? 0 },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function stripSensitive(user) {
    const { password, verification_token, otp_code, ...safe } = user;
    return safe;
}

// ==========================================
// AUTH CONFIG — lets the frontend hide/disable Google/Facebook buttons instead of
// showing a broken flow when those apps haven't been registered yet.
// ==========================================
export const getAuthConfig = async (req, res) => {
    res.status(200).json({
        success: true,
        providers: {
            google: googleConfigured(),
            facebook: facebookConfigured(),
        },
    });
};

// ==========================================
// REGISTER — creates an UNVERIFIED account, does NOT log the user in.
// ==========================================
export const registerCustomer = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, password } = req.body;

        if (!first_name || !last_name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email, and password are required." });
        }

        const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: "This email is already registered." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        const otpHash = await hashOtp(otp);
        const { raw: verifyTokenRaw, hash: verifyTokenHash } = generateToken();
        const expiresAt = otpExpiryDate();

        const result = await pool.query(
            `INSERT INTO users (
                first_name, last_name, email, phone, password, role, is_verified,
                otp_code, otp_expires, otp_purpose, otp_attempts, otp_last_sent_at,
                verification_token, verification_expires
             )
             VALUES ($1,$2,$3,$4,$5,'customer', false, $6,$7,'verify',0,NOW(),$8,$7)
             RETURNING id, first_name, last_name, email, phone, role, is_verified, created_at`,
            [first_name, last_name, email, phone || null, hashedPassword, otpHash, expiresAt, verifyTokenHash]
        );
        const user = result.rows[0];

        // Fire-and-forget — a slow/failed email should never block registration itself.
        sendVerificationEmail(user, { token: verifyTokenRaw, otp });
        sendAdminNewCustomerEmail(user);
        createNotification({
            userId: null,
            title: "New customer registered",
            message: `${user.first_name} ${user.last_name} (${user.email}) just created an account (pending email verification).`,
            type: "admin_customer",
            link: "/admin/customers",
        });

        // NOTE: no cookie is set — the account exists but can't log in until verified.
        res.status(201).json({
            success: true,
            message: "Account created. Please check your email for a verification code.",
            email: user.email,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to register." });
    }
};

// ==========================================
// EMAIL VERIFICATION — via OTP (matches the frontend's OTPBoxes UI) or via link token
// (secondary path, for people who click the email button instead of typing digits).
// Both log the user in on success, since verifying IS the first successful "login" for
// a brand new account.
// ==========================================
async function completeVerification(user) {
    const bumped = await pool.query(
        `UPDATE users SET is_verified = true, otp_code = NULL, otp_expires = NULL, otp_purpose = NULL,
                otp_attempts = 0, verification_token = NULL, verification_expires = NULL
         WHERE id = $1
         RETURNING id, first_name, last_name, email, phone, role, is_verified, created_at,
                   date_of_birth, gender, profile_picture, token_version`,
        [user.id]
    );
    return bumped.rows[0];
}

export const verifyEmailOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }
        if (user.is_verified) {
            return res.status(200).json({ success: true, message: "Already verified — please log in." });
        }

        const check = await verifyOtp({
            submittedOtp: otp,
            storedHash: user.otp_code,
            storedPurpose: user.otp_purpose,
            expectedPurpose: "verify",
            expiresAt: user.otp_expires,
            attempts: user.otp_attempts,
        });

        if (!check.valid) {
            if (check.reason === "wrong_code") {
                await pool.query("UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1", [user.id]);
            }
            const messages = {
                no_otp: "No verification code found — please request a new one.",
                wrong_purpose: "This code isn't valid for email verification.",
                expired: "This code has expired — please request a new one.",
                too_many_attempts: "Too many incorrect attempts — please request a new code.",
                wrong_code: "Incorrect code. Please try again.",
            };
            return res.status(400).json({ success: false, message: messages[check.reason] || "Invalid code." });
        }

        const verifiedUser = await completeVerification(user);
        const token = signCustomerToken(verifiedUser);
        res.cookie("customerToken", token, COOKIE_OPTIONS);
        res.status(200).json({ success: true, message: "Email verified!", user: stripSensitive(verifiedUser) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to verify email." });
    }
};

export const verifyEmailToken = async (req, res) => {
    try {
        const { email, token } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }
        if (user.is_verified) {
            return res.status(200).json({ success: true, message: "Already verified — please log in." });
        }
        if (!user.verification_token || !user.verification_expires) {
            return res.status(400).json({ success: false, message: "No verification link found — please request a new one." });
        }
        if (new Date(user.verification_expires).getTime() < Date.now()) {
            return res.status(400).json({ success: false, message: "This link has expired — please request a new one." });
        }
        if (hashToken(token) !== user.verification_token) {
            return res.status(400).json({ success: false, message: "Invalid verification link." });
        }

        const verifiedUser = await completeVerification(user);
        const jwtToken = signCustomerToken(verifiedUser);
        res.cookie("customerToken", jwtToken, COOKIE_OPTIONS);
        res.status(200).json({ success: true, message: "Email verified!", user: stripSensitive(verifiedUser) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to verify email." });
    }
};

export const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        // Same "don't reveal whether the email exists" principle as forgot-password.
        if (!user || user.is_verified) {
            return res.status(200).json({ success: true, message: "If that email needs verifying, a new code has been sent." });
        }

        const cooldown = checkResendCooldown(user.otp_last_sent_at);
        if (!cooldown.canSend) {
            return res.status(429).json({ success: false, message: `Please wait ${cooldown.secondsRemaining}s before requesting another code.` });
        }

        const otp = generateOtp();
        const otpHash = await hashOtp(otp);
        const { raw: verifyTokenRaw, hash: verifyTokenHash } = generateToken();
        const expiresAt = otpExpiryDate();

        await pool.query(
            `UPDATE users SET otp_code = $1, otp_expires = $2, otp_purpose = 'verify', otp_attempts = 0,
                    otp_last_sent_at = NOW(), verification_token = $3, verification_expires = $2
             WHERE id = $4`,
            [otpHash, expiresAt, verifyTokenHash, user.id]
        );

        sendVerificationEmail(user, { token: verifyTokenRaw, otp });
        res.status(200).json({ success: true, message: "A new verification code has been sent." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to resend verification code." });
    }
};

// ==========================================
// LOGIN — gated on is_verified, with failed-attempt tracking and temporary lockout.
// ==========================================
export const loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        const user = result.rows[0];

        if (user.account_locked_until && new Date(user.account_locked_until).getTime() > Date.now()) {
            const minutesLeft = Math.ceil((new Date(user.account_locked_until).getTime() - Date.now()) / 60000);
            return res.status(423).json({
                success: false,
                message: `Too many failed attempts. Please try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}, or reset your password.`,
            });
        }

        if (!user.password) {
            // Account was created via Google/Facebook only — no password to check against.
            return res.status(400).json({ success: false, message: "This account uses Google or Facebook sign-in. Please continue with that instead." });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            const attempts = (user.failed_login_attempts || 0) + 1;
            if (attempts >= FAILED_LOGIN_LIMIT) {
                const unlockAt = new Date(Date.now() + LOCKOUT_DURATION_MS);
                await pool.query(
                    "UPDATE users SET failed_login_attempts = $1, account_locked_until = $2 WHERE id = $3",
                    [attempts, unlockAt, user.id]
                );
                sendAccountLockedEmail(user, { unlockAt: unlockAt.toLocaleString() });
                return res.status(423).json({
                    success: false,
                    message: "Too many failed attempts. Your account has been temporarily locked for 15 minutes.",
                });
            }
            await pool.query("UPDATE users SET failed_login_attempts = $1 WHERE id = $2", [attempts, user.id]);
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        if (!user.is_verified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message: "Please verify your email before logging in.",
                email: user.email,
            });
        }

        // Successful login — clear any failed-attempt count/lock.
        await pool.query("UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL WHERE id = $1", [user.id]);

        const token = signCustomerToken(user);
        res.cookie("customerToken", token, COOKIE_OPTIONS);

        res.status(200).json({ success: true, message: "Login successful.", user: stripSensitive(user) });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to login." });
    }
};

// ==========================================
// GOOGLE / FACEBOOK LOGIN — existing users log in, new users are auto-created and
// auto-verified (the provider already verified the email address for us).
// ==========================================
async function findOrCreateOAuthUser({ providerColumn, providerId, email, firstName, lastName, picture }) {
    const byProvider = await pool.query(`SELECT * FROM users WHERE ${providerColumn} = $1`, [providerId]);
    if (byProvider.rows.length > 0) {
        return byProvider.rows[0];
    }

    // Not found by provider ID — check if an account with this email already exists
    // (e.g. they originally registered with a password) and LINK the provider to it,
    // rather than creating a second, duplicate account for the same person.
    const byEmail = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (byEmail.rows.length > 0) {
        const linked = await pool.query(
            `UPDATE users SET ${providerColumn} = $1, is_verified = true,
                    profile_picture = COALESCE(profile_picture, $2)
             WHERE id = $3 RETURNING *`,
            [providerId, picture, byEmail.rows[0].id]
        );
        return linked.rows[0];
    }

    // Brand new customer.
    const created = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password, role, is_verified, profile_picture, ${providerColumn})
         VALUES ($1,$2,$3,NULL,'customer', true, $4, $5)
         RETURNING *`,
        [firstName, lastName, email, picture, providerId]
    );
    createNotification({
        userId: null,
        title: "New customer registered",
        message: `${firstName} ${lastName} (${email}) just signed up via ${providerColumn === "google_id" ? "Google" : "Facebook"}.`,
        type: "admin_customer",
        link: "/admin/customers",
    });
    return created.rows[0];
}

export const googleAuth = async (req, res) => {
    try {
        const { accessToken } = req.body;
        const profile = await verifyGoogleAccessToken(accessToken);

        const user = await findOrCreateOAuthUser({
            providerColumn: "google_id",
            providerId: profile.googleId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            picture: profile.picture,
        });

        const token = signCustomerToken(user);
        res.cookie("customerToken", token, COOKIE_OPTIONS);
        res.status(200).json({ success: true, message: "Signed in with Google.", user: stripSensitive(user) });
    } catch (error) {
        console.error("Google auth failed:", error.message);
        res.status(401).json({ success: false, message: error.message || "Google sign-in failed." });
    }
};

export const facebookAuth = async (req, res) => {
    try {
        const { accessToken } = req.body;
        const profile = await verifyFacebookAccessToken(accessToken);

        const user = await findOrCreateOAuthUser({
            providerColumn: "facebook_id",
            providerId: profile.facebookId,
            email: profile.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            picture: profile.picture,
        });

        const token = signCustomerToken(user);
        res.cookie("customerToken", token, COOKIE_OPTIONS);
        res.status(200).json({ success: true, message: "Signed in with Facebook.", user: stripSensitive(user) });
    } catch (error) {
        console.error("Facebook auth failed:", error.message);
        res.status(401).json({ success: false, message: error.message || "Facebook sign-in failed." });
    }
};

// ==========================================
// FORGOT / RESET PASSWORD — OTP-based (matches the existing ForgotPassword → OTP →
// ResetPassword frontend flow). Never reveals whether an email exists.
// ==========================================
export const forgotPassword = async (req, res) => {
    const genericResponse = { success: true, message: "If an account with that email exists, we've sent a password reset code." };
    try {
        const { email } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.status(200).json(genericResponse);
        }
        if (!user.password) {
            // Google/Facebook-only account — nothing to reset. Still return the generic
            // response so we don't leak account existence or sign-in method to a caller.
            console.log(`Password reset requested for OAuth-only account: ${email}`);
            return res.status(200).json(genericResponse);
        }

        const cooldown = checkResendCooldown(user.otp_last_sent_at);
        if (!cooldown.canSend) {
            // Still generic to an outside observer, but a genuine owner spamming the
            // button gets a real cooldown message instead of "email sent" every time.
            return res.status(200).json({ success: true, message: `A code was already sent — you can request another in ${cooldown.secondsRemaining}s.` });
        }

        const otp = generateOtp();
        const otpHash = await hashOtp(otp);
        await pool.query(
            `UPDATE users SET otp_code = $1, otp_expires = $2, otp_purpose = 'reset', otp_attempts = 0, otp_last_sent_at = NOW()
             WHERE id = $3`,
            [otpHash, otpExpiryDate(), user.id]
        );

        sendOtpEmail(user, otp, "reset");
        res.status(200).json(genericResponse);
    } catch (error) {
        console.error(error);
        // Even on an internal error, don't leak anything — log it, respond generically.
        res.status(200).json(genericResponse);
    }
};

// Verifies the reset OTP and issues a short-lived reset session token — this is what
// proves "I know the code" before ResetPassword is allowed to actually change anything,
// without needing a second round-trip of re-entering the OTP alongside the new password.
export const verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid or expired code." });
        }

        const check = await verifyOtp({
            submittedOtp: otp,
            storedHash: user.otp_code,
            storedPurpose: user.otp_purpose,
            expectedPurpose: "reset",
            expiresAt: user.otp_expires,
            attempts: user.otp_attempts,
        });

        if (!check.valid) {
            if (check.reason === "wrong_code") {
                await pool.query("UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1", [user.id]);
            }
            return res.status(400).json({ success: false, message: "Invalid or expired code." });
        }

        // Consume the OTP immediately so it can't be reused even if the reset token below
        // is somehow intercepted separately.
        await pool.query("UPDATE users SET otp_code = NULL, otp_expires = NULL, otp_purpose = NULL, otp_attempts = 0 WHERE id = $1", [user.id]);

        const resetToken = jwt.sign(
            { id: user.id, email: user.email, purpose: "password_reset" },
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
        );
        res.status(200).json({ success: true, resetToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to verify code." });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        let decoded;
        try {
            decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
        } catch {
            return res.status(400).json({ success: false, message: "This reset session has expired — please start again." });
        }
        if (decoded.purpose !== "password_reset") {
            return res.status(400).json({ success: false, message: "Invalid reset session." });
        }

        const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.id]);
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        // Bump token_version so any other logged-in sessions (and the reset flow itself)
        // are invalidated — a password reset should log out everyone except the person
        // completing it right now.
        await pool.query(
            "UPDATE users SET password = $1, token_version = token_version + 1, failed_login_attempts = 0, account_locked_until = NULL WHERE id = $2",
            [hashed, user.id]
        );

        sendPasswordChangedEmail(user);
        res.status(200).json({ success: true, message: "Password reset successfully. Please log in with your new password." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to reset password." });
    }
};

// ==========================================
// LOGOUT
// ==========================================
export const logoutCustomer = async (req, res) => {
    res.clearCookie("customerToken", COOKIE_OPTIONS);
    res.status(200).json({ success: true, message: "Logged out." });
};

// Logs out every device/session, not just this one — bumps token_version so all
// previously-issued JWTs (including the one used to call this) fail verification.
export const logoutAllDevices = async (req, res) => {
    try {
        await pool.query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [req.customer.id]);
        res.clearCookie("customerToken", COOKIE_OPTIONS);
        res.status(200).json({ success: true, message: "Logged out of all devices." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to log out of all devices." });
    }
};

// ==========================================
// CHECK AUTH (auto-login on refresh)
// ==========================================
export const checkCustomerAuth = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, first_name, last_name, email, phone, role, is_verified, created_at,
                    date_of_birth, gender, profile_picture
             FROM users WHERE id = $1`,
            [req.customer.id]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: "Account not found." });
        }
        res.status(200).json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to verify session." });
    }
};
// ==========================================
// UPDATE PROFILE
// ==========================================
export const updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, email, phone, date_of_birth, gender } = req.body;
        if (!first_name || !last_name || !email) {
            return res.status(400).json({ success: false, message: "Name and email are required." });
        }

        if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
            return res.status(400).json({ success: false, message: "Please enter a valid phone number." });
        }

        const ALLOWED_GENDERS = ["male", "female", "other", "prefer_not_to_say"];
        if (gender && !ALLOWED_GENDERS.includes(gender)) {
            return res.status(400).json({ success: false, message: "Invalid gender value." });
        }

        const existing = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, req.customer.id]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: "That email is already in use by another account." });
        }

        const result = await pool.query(
            `UPDATE users SET first_name = $1, last_name = $2, email = $3, phone = $4,
                    date_of_birth = $5, gender = $6
             WHERE id = $7
             RETURNING id, first_name, last_name, email, phone, role, is_verified, created_at,
                       date_of_birth, gender, profile_picture`,
            [first_name, last_name, email, phone || null, date_of_birth || null, gender || null, req.customer.id]
        );

        res.status(200).json({ success: true, message: "Profile updated successfully.", user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to update profile." });
    }
};

// ==========================================
// CHANGE PASSWORD
// ==========================================
export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new password are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
        }

        const result = await pool.query("SELECT password, email, first_name FROM users WHERE id = $1", [req.customer.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        const match = await bcrypt.compare(oldPassword, result.rows[0].password);
        if (!match) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        const isSamePassword = await bcrypt.compare(newPassword, result.rows[0].password);
        if (isSamePassword) {
            return res.status(400).json({ success: false, message: "New password must be different from your current password." });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        // Bump token_version (same reasoning as resetPassword) and reissue a fresh cookie
        // for THIS session so the person making the change isn't logged out too, while
        // every other device's existing token becomes invalid.
        const bumped = await pool.query(
            "UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2 RETURNING id, email, token_version",
            [hashed, req.customer.id]
        );
        const freshToken = signCustomerToken(bumped.rows[0]);
        res.cookie("customerToken", freshToken, COOKIE_OPTIONS);

        sendPasswordChangedEmail(result.rows[0]); // fire-and-forget

        res.status(200).json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to change password." });
    }
};

// ==========================================
// PROFILE PICTURE
// ==========================================
export const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided." });
        }

        const existing = await pool.query("SELECT profile_picture_public_id FROM users WHERE id = $1", [req.customer.id]);
        const oldPublicId = existing.rows[0]?.profile_picture_public_id;

        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "arwa-profile-pictures",
        });

        const result = await pool.query(
            `UPDATE users SET profile_picture = $1, profile_picture_public_id = $2
             WHERE id = $3
             RETURNING id, first_name, last_name, email, phone, role, is_verified, created_at,
                       date_of_birth, gender, profile_picture`,
            [uploadResult.secure_url, uploadResult.public_id, req.customer.id]
        );

        if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
        }

        res.status(200).json({ success: true, message: "Profile picture updated.", user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to upload profile picture." });
    }
};

export const removeProfilePicture = async (req, res) => {
    try {
        const existing = await pool.query("SELECT profile_picture_public_id FROM users WHERE id = $1", [req.customer.id]);
        const oldPublicId = existing.rows[0]?.profile_picture_public_id;

        const result = await pool.query(
            `UPDATE users SET profile_picture = NULL, profile_picture_public_id = NULL
             WHERE id = $1
             RETURNING id, first_name, last_name, email, phone, role, is_verified, created_at,
                       date_of_birth, gender, profile_picture`,
            [req.customer.id]
        );

        if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId).catch(() => {});
        }

        res.status(200).json({ success: true, message: "Profile picture removed.", user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to remove profile picture." });
    }
};

// ==========================================
// ADDRESSES
// ==========================================
export const getAddresses = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM customer_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC",
            [req.customer.id]
        );
        res.status(200).json({ success: true, addresses: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch addresses." });
    }
};

export const addAddress = async (req, res) => {
    try {
        const { label, name, phone, address, city, province, postal, country, isDefault } = req.body;
        if (!label || !name || !phone || !address || !city || !province) {
            return res.status(400).json({ success: false, message: "All address fields except postal code are required." });
        }

        if (isDefault) {
            await pool.query("UPDATE customer_addresses SET is_default = false WHERE user_id = $1", [req.customer.id]);
        }

        const result = await pool.query(
            `INSERT INTO customer_addresses (user_id, label, name, phone, address, city, province, postal, country, is_default)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [req.customer.id, label, name, phone, address, city, province, postal || null, country || "Pakistan", !!isDefault]
        );

        res.status(201).json({ success: true, message: "Address added.", address: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to add address." });
    }
};

export const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, name, phone, address, city, province, postal, country, isDefault } = req.body;
        if (!label || !name || !phone || !address || !city || !province) {
            return res.status(400).json({ success: false, message: "All address fields except postal code are required." });
        }

        const owned = await pool.query("SELECT id FROM customer_addresses WHERE id = $1 AND user_id = $2", [id, req.customer.id]);
        if (owned.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }

        if (isDefault) {
            await pool.query("UPDATE customer_addresses SET is_default = false WHERE user_id = $1", [req.customer.id]);
        }

        const result = await pool.query(
            `UPDATE customer_addresses SET label=$1, name=$2, phone=$3, address=$4, city=$5, province=$6, postal=$7, country=$8${isDefault ? ", is_default = true" : ""}
             WHERE id = $9 RETURNING *`,
            [label, name, phone, address, city, province, postal || null, country || "Pakistan", id]
        );

        res.status(200).json({ success: true, message: "Address updated.", address: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to update address." });
    }
};

export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("DELETE FROM customer_addresses WHERE id = $1 AND user_id = $2 RETURNING id", [id, req.customer.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }
        res.status(200).json({ success: true, message: "Address removed." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to delete address." });
    }
};

export const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const owned = await pool.query("SELECT id FROM customer_addresses WHERE id = $1 AND user_id = $2", [id, req.customer.id]);
        if (owned.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Address not found." });
        }
        await pool.query("UPDATE customer_addresses SET is_default = false WHERE user_id = $1", [req.customer.id]);
        const result = await pool.query("UPDATE customer_addresses SET is_default = true WHERE id = $1 RETURNING *", [id]);
        res.status(200).json({ success: true, message: "Default address updated.", address: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to set default address." });
    }
};

// ==========================================
// ADMIN: LIST CUSTOMERS (with real order stats)
// ==========================================
export const getCustomers = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id, u.first_name, u.last_name, u.email, u.phone, u.is_verified, u.created_at,
                COUNT(o.id)::int AS order_count,
                COALESCE(SUM(o.total), 0)::numeric AS total_spent
            FROM users u
            LEFT JOIN orders o ON o.user_id = u.id
            WHERE u.role = 'customer'
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);
        res.status(200).json({ success: true, count: result.rows.length, customers: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to fetch customers." });
    }
};
