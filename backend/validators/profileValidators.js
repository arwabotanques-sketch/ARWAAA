import { body } from "express-validator";

export const updateProfileValidation = [
  body("first_name").optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body("last_name").optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body("phone").optional({ checkFalsy: true }).trim().isMobilePhone("en-PK").withMessage("Please enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX or +923XXXXXXXXX)."),
  body("dob").optional({ checkFalsy: true }).isISO8601().withMessage("Invalid date format"),
  body("gender").optional({ checkFalsy: true }).isIn(["male", "female", "other"]).withMessage("Invalid gender"),
];

export const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
];

export const addressValidation = [
  body("label").optional({ checkFalsy: true }).trim().isLength({ max: 50 }),
  body("full_name").trim().notEmpty().withMessage("Full name is required").isLength({ max: 150 }),
  body("phone").trim().notEmpty().withMessage("Phone is required").isMobilePhone("en-PK").withMessage("Please enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX or +923XXXXXXXXX)."),
  body("address").trim().notEmpty().withMessage("Address is required").isLength({ max: 500 }),
  body("city").trim().notEmpty().withMessage("City is required").isLength({ max: 100 }),
  body("province").trim().notEmpty().withMessage("Province is required").isLength({ max: 100 }),
];
