import { body } from "express-validator";

export const placeOrderValidation = [
  body("customer_name").trim().notEmpty().withMessage("Name is required").isLength({ max: 150 }),
  body("customer_email").trim().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("customer_phone").trim().notEmpty().withMessage("Phone is required").isMobilePhone("en-PK").withMessage("Please enter a valid Pakistani mobile number (e.g. 03XXXXXXXXX or +923XXXXXXXXX)."),
  body("shipping_address").trim().notEmpty().withMessage("Shipping address is required").isLength({ max: 500 }),
  body("shipping_city").trim().notEmpty().withMessage("City is required").isLength({ max: 100 }),
  body("shipping_province").trim().notEmpty().withMessage("Province is required").isLength({ max: 100 }),
  body("payment_method").trim().isIn(["cod", "card", "jazzcash", "easypaisa"]).withMessage("Invalid payment method"),
  body("items").isArray({ min: 1 }).withMessage("Cart cannot be empty"),
  body("items.*.product_id").isUUID().withMessage("Invalid product in cart"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
];
