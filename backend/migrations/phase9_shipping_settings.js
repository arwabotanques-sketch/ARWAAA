// Run once: node migrations/phase9_shipping_settings.js
// Single-row settings table — Admin's shipping tab was previously local-state-only
// (the "Save" button just showed a toast, nothing was ever persisted), while
// Cart.tsx/Checkout.tsx each hardcoded their own separate `const SHIPPING = 300`.
// This gives Admin a real place to save to, and the storefront a real place to read from.
import pool from "../config/db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            CREATE TABLE IF NOT EXISTS shipping_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                rate NUMERIC NOT NULL DEFAULT 300,
                min_free NUMERIC,
                days VARCHAR DEFAULT '2-4',
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT single_row CHECK (id = 1)
            );
        `);

        // Seed the single row with the value already hardcoded on the storefront today,
        // so nothing changes for customers the moment this migration runs.
        await client.query(`
            INSERT INTO shipping_settings (id, rate, min_free, days)
            VALUES (1, 300, 5000, '2-4')
            ON CONFLICT (id) DO NOTHING;
        `);

        await client.query("COMMIT");
        console.log("✅ phase9 migration applied (shipping_settings table created + seeded).");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ phase9 migration failed:", error.message);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
