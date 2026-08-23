import express from "express";
import {
    getCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon,
} from "../controllers/couponController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — Cart/Checkout validate a code the customer typed in
router.get("/validate/:code", validateCoupon);

// Admin only — coupon management
router.get("/", authMiddleware, getCoupons);
router.post("/", authMiddleware, createCoupon);
router.put("/:id", authMiddleware, updateCoupon);
router.delete("/:id", authMiddleware, deleteCoupon);

export default router;
