// Run once: node migrations/phase8_product_video.js
// Additive only. Adds the video_url column expected by createProduct/updateProduct
// (INSERT/UPDATE into products already references image_url, image_public_id, video_url —
// image_url and image_public_id already exist; only video_url was missing, causing
// error 42703 "column video_url of relation products does not exist" on product creation.
import pool from "../config/db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query(`
            ALTER TABLE products
                ADD COLUMN IF NOT EXISTS image_url VARCHAR,
                ADD COLUMN IF NOT EXISTS image_public_id VARCHAR,
                ADD COLUMN IF NOT EXISTS video_url VARCHAR;
        `);
        await client.query("COMMIT");
        console.log("✅ phase8 migration applied (video_url column added to products; image_url/image_public_id ensured present).");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ phase8 migration failed:", error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
