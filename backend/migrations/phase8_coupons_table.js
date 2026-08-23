// Run once: node migrations/phase8_coupons_table.js
// Creates a real coupons table so Admin's coupon manager (previously local-state-only,
// resetting on every page refresh) can actually persist create/edit/delete, and so
// Cart.tsx/Checkout.tsx can validate codes against real data instead of a hardcoded object.
import pool from "../config/db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR NOT NULL UNIQUE,
                type VARCHAR NOT NULL DEFAULT 'percent' CHECK (type IN ('percent', 'fixed')),
                discount NUMERIC NOT NULL,
                max_uses INTEGER,
                uses INTEGER NOT NULL DEFAULT 0,
                expiry DATE,
                status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'inactive')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // Seed with the 5 codes already hardcoded in Cart.tsx/Checkout.tsx, so the
        // storefront keeps working identically the moment this migration runs —
        // nothing breaks mid-migration while the frontend rewire is deployed.
        await client.query(`
            INSERT INTO coupons (code, type, discount, max_uses, status)
            VALUES
                ('ARWA10',   'percent', 10, 100, 'active'),
                ('WELCOME',  'percent', 15, 50,  'active'),
                ('BOTANIQ',  'percent', 20, 30,  'active'),
                ('SUMMER25', 'percent', 25, 50,  'active'),
                ('FLASH50',  'fixed',   50, 20,  'draft')
            ON CONFLICT (code) DO NOTHING;
        `);

        await client.query("COMMIT");
        console.log("✅ phase8 migration applied (coupons table created + seeded).");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ phase8 migration failed:", error.message);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
