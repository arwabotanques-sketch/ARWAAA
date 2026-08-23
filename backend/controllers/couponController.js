import pool from "../config/db.js";

// ==========================================
// GET ALL COUPONS (admin)
// ==========================================
export const getCoupons = async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM coupons ORDER BY created_at DESC`);
        res.status(200).json({ success: true, count: result.rows.length, coupons: result.rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch coupons." });
    }
};

// ==========================================
// CREATE COUPON (admin)
// ==========================================
export const createCoupon = async (req, res) => {
    try {
        const { code, type = "percent", discount, maxUses, expiry, status = "active" } = req.body;

        if (!code || discount === undefined || discount === null) {
            return res.status(400).json({ success: false, message: "Code and discount are required." });
        }

        const result = await pool.query(
            `
            INSERT INTO coupons (code, type, discount, max_uses, expiry, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
            `,
            [code.toUpperCase().trim(), type, discount, maxUses || null, expiry || null, status]
        );

        res.status(201).json({ success: true, message: "Coupon created successfully.", coupon: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "A coupon with this code already exists." });
        }
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to create coupon." });
    }
};

// ==========================================
// UPDATE COUPON (admin)
// ==========================================
export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, type, discount, maxUses, expiry, status } = req.body;

        if (!code || discount === undefined || discount === null) {
            return res.status(400).json({ success: false, message: "Code and discount are required." });
        }

        const result = await pool.query(
            `
            UPDATE coupons
            SET code = $1, type = $2, discount = $3, max_uses = $4, expiry = $5, status = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *;
            `,
            [code.toUpperCase().trim(), type, discount, maxUses || null, expiry || null, status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        res.status(200).json({ success: true, message: "Coupon updated successfully.", coupon: result.rows[0] });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({ success: false, message: "A coupon with this code already exists." });
        }
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to update coupon." });
    }
};

// ==========================================
// DELETE COUPON (admin)
// ==========================================
export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`DELETE FROM coupons WHERE id = $1 RETURNING *;`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Coupon not found." });
        }

        res.status(200).json({ success: true, message: "Coupon deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to delete coupon." });
    }
};

// ==========================================
// VALIDATE COUPON (public — used by Cart/Checkout at checkout time)
// ==========================================
// Note: this checks eligibility (active, not expired, under max uses) but does NOT
// increment `uses` — actual usage counting would need to happen when an order is
// placed with this code, which createOrder() doesn't currently accept as a parameter.
// Kept out of scope here to avoid touching the order-creation flow; `uses` stays
// admin-editable for now.
export const validateCoupon = async (req, res) => {
    try {
        const { code } = req.params;
        const result = await pool.query(
            `SELECT * FROM coupons WHERE code = $1`,
            [(code || "").toUpperCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Invalid coupon code." });
        }

        const coupon = result.rows[0];

        if (coupon.status !== "active") {
            return res.status(400).json({ success: false, message: "This coupon is no longer active." });
        }
        if (coupon.expiry && new Date(coupon.expiry) < new Date()) {
            return res.status(400).json({ success: false, message: "This coupon has expired." });
        }
        if (coupon.max_uses !== null && coupon.uses >= coupon.max_uses) {
            return res.status(400).json({ success: false, message: "This coupon has reached its usage limit." });
        }

        res.status(200).json({
            success: true,
            coupon: { code: coupon.code, type: coupon.type, discount: Number(coupon.discount) },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to validate coupon." });
    }
};
