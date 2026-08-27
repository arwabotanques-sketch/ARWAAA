import pool from "../config/db.js";

// ==========================================
// GET SHIPPING SETTINGS (public — Cart/Checkout need the current rate)
// ==========================================
export const getShippingSettings = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM shipping_settings WHERE id = 1");
        if (result.rows.length === 0) {
            // Table exists but was never seeded — fall back rather than error out
            // the whole storefront over a missing settings row.
            return res.status(200).json({ success: true, settings: { rate: 300, minFree: null, days: "2-4" } });
        }
        const row = result.rows[0];
        res.status(200).json({
            success: true,
            settings: {
                rate: Number(row.rate),
                minFree: row.min_free !== null ? Number(row.min_free) : null,
                days: row.days,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch shipping settings." });
    }
};

// ==========================================
// UPDATE SHIPPING SETTINGS (admin only)
// ==========================================
export const updateShippingSettings = async (req, res) => {
    try {
        const { rate, minFree, days } = req.body;

        if (rate === undefined || rate === null || isNaN(Number(rate))) {
            return res.status(400).json({ success: false, message: "A valid shipping rate is required." });
        }

        const result = await pool.query(
            `
            UPDATE shipping_settings
            SET rate = $1, min_free = $2, days = $3, updated_at = NOW()
            WHERE id = 1
            RETURNING *;
            `,
            [rate, minFree ?? null, days || null]
        );

        if (result.rows.length === 0) {
            // Row somehow doesn't exist yet — create it instead of failing.
            const inserted = await pool.query(
                `INSERT INTO shipping_settings (id, rate, min_free, days) VALUES (1, $1, $2, $3) RETURNING *;`,
                [rate, minFree ?? null, days || null]
            );
            const row = inserted.rows[0];
            return res.status(200).json({
                success: true,
                message: "Shipping settings saved.",
                settings: { rate: Number(row.rate), minFree: row.min_free !== null ? Number(row.min_free) : null, days: row.days },
            });
        }

        const row = result.rows[0];
        res.status(200).json({
            success: true,
            message: "Shipping settings saved.",
            settings: { rate: Number(row.rate), minFree: row.min_free !== null ? Number(row.min_free) : null, days: row.days },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message || "Failed to update shipping settings." });
    }
};
