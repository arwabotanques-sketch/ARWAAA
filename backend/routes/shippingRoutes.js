import express from "express";
import { getShippingSettings, updateShippingSettings } from "../controllers/shippingController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public — Cart/Checkout read the current rate
router.get("/", getShippingSettings);

// Admin only — update the rate
router.put("/", authMiddleware, updateShippingSettings);

export default router;
