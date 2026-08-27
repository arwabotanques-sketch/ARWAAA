import pool from "../config/db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            ALTER TABLE products
                ADD COLUMN IF NOT EXISTS image_url_2 VARCHAR,
                ADD COLUMN IF NOT EXISTS image_public_id_2 VARCHAR,
                ADD COLUMN IF NOT EXISTS image_url_3 VARCHAR,
                ADD COLUMN IF NOT EXISTS image_public_id_3 VARCHAR;
        `);
        await client.query("COMMIT");
        console.log("✅ phase9 migration applied (image_url_2/3 columns added to products for multi-photo support).");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ phase9 migration failed:", error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();

