import { body } from "express-validator";

// Same regex the frontend's pwStrength() scores against â€” min 8, upper, lower, number,
// special char. Keeping the enforcement server-side too since the frontend check alone
// is trivially bypassed by calling the API directly.
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const strongPassword = (field = "password") =>
    body(field)
        .matches(STRONG_PASSWORD_REGEX)
        .withMessage("Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.");

export const registerValidation = [
    body("first_name").trim().notEmpty().withMessage("First name is required").isLength({ max: 60 }),
    body("last_name").trim().notEmpty().withMessage("Last name is required").isLength({ max: 60 }),
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("phone").trim().notEmpty().withMessage("Phone number is required").isMobilePhone("en-PK").withMessage("Please enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX or +923XXXXXXXXX)."),
    strongPassword(),
];

export const loginValidation = [
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
];

export const verifyOtpValidation = [
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("otp").trim().isLength({ min: 6, max: 6 }).isNumeric().withMessage("Enter the 6-digit code."),
];

export const resendOtpValidation = [
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
];

export const resetPasswordValidation = [
    body("resetToken").notEmpty().withMessage("Reset session expired â€” please start again."),
    strongPassword("newPassword"),
];

export const verifyEmailTokenValidation = [
    body("token").notEmpty().withMessage("Verification token is required."),
    body("email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
];

export const socialAuthValidation = [
    body("accessToken").notEmpty().withMessage("Missing access token."),
];

