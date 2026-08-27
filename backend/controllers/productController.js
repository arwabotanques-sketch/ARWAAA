import cloudinary from "../config/cloudinary.js";
import pool from "../config/db.js";

// =======================================================
// GET ALL PRODUCTS
// =======================================================

export const getProducts = async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                p.*,
                c.name AS category_name
            FROM products p
            LEFT JOIN categories c
            ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            products: result.rows
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products"
        });

    }
};

// =======================================================
// GET SINGLE PRODUCT
// =======================================================

export const getSingleProduct = async (req, res) => {
    try {

        const { slug } = req.params;

        const result = await pool.query(
            `
            SELECT
                p.*,
                c.name AS category_name
            FROM products p
            LEFT JOIN categories c
            ON p.category_id = c.id
            WHERE p.slug = $1
            `,
            [slug]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.status(200).json({
            success: true,
            product: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch product."
        });

    }
};

// =======================================================
// CREATE PRODUCT
// =======================================================

export const createProduct = async (req, res) => {
    try {

        const {
            category_id,
            name,
            slug,
            subtitle,
            sku,
            description,
            ingredients,
            benefits,
            weight,
            brand,
            price,
            old_price,
            sale_price,
            discount,
            stock,
            sold,
            tags,
            featured,
            status = true
        } = req.body;

        let imageUrl = null;
        let imagePublicId = null;
        let videoUrl = null;

        // Upload image to Cloudinary
        if (req.files?.image?.[0]) {
            const uploadResult = await cloudinary.uploader.upload(req.files.image[0].path, {
                folder: "arwa-products"
            });

            imageUrl = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
        }

        // Upload video to Cloudinary (separate resource_type required for video)
        if (req.files?.video?.[0]) {
            const videoUploadResult = await cloudinary.uploader.upload(req.files.video[0].path, {
                folder: "arwa-products",
                resource_type: "video",
            });

            videoUrl = videoUploadResult.secure_url;
        }

        let imageUrl2 = null;
        let imagePublicId2 = null;
        let imageUrl3 = null;
        let imagePublicId3 = null;

        // Upload second image if provided
        if (req.files?.image2?.[0]) {
            const uploadResult2 = await cloudinary.uploader.upload(req.files.image2[0].path, {
                folder: "arwa-products"
            });
            imageUrl2 = uploadResult2.secure_url;
            imagePublicId2 = uploadResult2.public_id;
        }

        // Upload third image if provided
        if (req.files?.image3?.[0]) {
            const uploadResult3 = await cloudinary.uploader.upload(req.files.image3[0].path, {
                folder: "arwa-products"
            });
            imageUrl3 = uploadResult3.secure_url;
            imagePublicId3 = uploadResult3.public_id;
        }

        if (!category_id || !name || !slug || !price || !sku) {
            return res.status(400).json({
                success: false,
                message: "Name, slug, SKU, category, and price are required."
            });
        }

        // tags may arrive as a JSON string (from form-data) — parse it safely
        let parsedTags = [];
        try {
            parsedTags = tags ? (typeof tags === "string" ? JSON.parse(tags) : tags) : [];
        } catch {
            parsedTags = [];
        }

        const result = await pool.query(
            `
            INSERT INTO products
            (
                category_id,
                name,
                slug,
                subtitle,
                sku,
                description,
                ingredients,
                benefits,
                weight,
                brand,
                price,
                old_price,
                sale_price,
                discount,
                stock,
                sold,
                tags,
                featured,
                status,
                image_url,
                image_public_id,
                video_url,
                image_url_2,
                image_public_id_2,
                image_url_3,
                image_public_id_3
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
            )
            RETURNING *;
            `,
            [
                category_id,
                name,
                slug,
                subtitle || "",
                sku,
                description,
                ingredients,
                benefits,
                weight,
                brand,
                price,
                old_price || 0,
                sale_price,
                discount || 0,
                stock,
                sold || 0,
                JSON.stringify(parsedTags),
                featured,
                status,
                imageUrl,
                imagePublicId,
                videoUrl,
                imageUrl2,
                imagePublicId2,
                imageUrl3,
                imagePublicId3
            ]
        );

        res.status(201).json({
            success: true,
            message: "Product created successfully.",
            product: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to create product."
        });

    }
};
// =======================================================
// UPDATE PRODUCT
// =======================================================

export const updateProduct = async (req, res) => {
    try {

        const { id } = req.params;

        const existing = await pool.query(
            "SELECT * FROM products WHERE id = $1",
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        let product = existing.rows[0];

        let imageUrl = product.image_url;
        let imagePublicId = product.image_public_id;
        let videoUrl = product.video_url;
        let imageUrl2 = product.image_url_2;
        let imagePublicId2 = product.image_public_id_2;
        let imageUrl3 = product.image_url_3;
        let imagePublicId3 = product.image_public_id_3;
        // Upload new image if provided
        if (req.files?.image?.[0]) {

            // Delete old image
            if (imagePublicId) {
                await cloudinary.uploader.destroy(imagePublicId);
            }

            const uploadResult = await cloudinary.uploader.upload(
                req.files.image[0].path,
                {
                    folder: "arwa-products",
                }
            );

            imageUrl = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
        }

        // Upload new video if provided (no destroy needed — no public_id tracked for video yet)
        if (req.files?.video?.[0]) {
            const videoUploadResult = await cloudinary.uploader.upload(
                req.files.video[0].path,
                { folder: "arwa-products", resource_type: "video" }
            );
            videoUrl = videoUploadResult.secure_url;
        }

        // Upload new second image if provided",
        if (req.files?.image2?.[0]) {
            if (imagePublicId2) {
                await cloudinary.uploader.destroy(imagePublicId2);
            }
            const uploadResult2 = await cloudinary.uploader.upload(
                req.files.image2[0].path,
                { folder: "arwa-products" }
            );
            imageUrl2 = uploadResult2.secure_url;
            imagePublicId2 = uploadResult2.public_id;
        }

        // Upload new third image if provided
        if (req.files?.image3?.[0]) {
            if (imagePublicId3) {
                await cloudinary.uploader.destroy(imagePublicId3);
            }
            const uploadResult3 = await cloudinary.uploader.upload(
                req.files.image3[0].path,
                { folder: "arwa-products" }
            );
            imageUrl3 = uploadResult3.secure_url;
            imagePublicId3 = uploadResult3.public_id;
        }

        const {
            category_id,
            name,
            slug,
            subtitle,
            sku,
            description,
            ingredients,
            benefits,
            weight,
            brand,
            price,
            old_price,
            sale_price,
            discount,
            stock,
            sold,
            tags,
            featured,
            status
        } = req.body;

        let parsedTags = product.tags;
        if (tags !== undefined) {
            try {
                parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
            } catch {
                parsedTags = [];
            }
        }

        const result = await pool.query(
            `
            UPDATE products
            SET
                category_id=$1,
                name=$2,
                slug=$3,
                subtitle=$4,
                sku=$5,
                description=$6,
                ingredients=$7,
                benefits=$8,
                weight=$9,
                brand=$10,
                price=$11,
                old_price=$12,
                sale_price=$13,
                discount=$14,
                stock=$15,
                sold=$16,
                tags=$17,
                featured=$18,
                status=$19,
                image_url=$20,
                image_public_id=$21,
                video_url=$22,
                image_url_2=$23,
                image_public_id_2=$24,
                image_url_3=$25,
                image_public_id_3=$26,
                updated_at=NOW()
            WHERE id=$27
            RETURNING *;
            `,
            [
                category_id,
                name,
                slug,
                subtitle,
                sku,
                description,
                ingredients,
                benefits,
                weight,
                brand,
                price,
                old_price,
                sale_price,
                discount,
                stock,
                sold,
                JSON.stringify(parsedTags),
                featured,
                status,
                imageUrl,
                imagePublicId,
                videoUrl,
                imageUrl2,
                imagePublicId2,
                imageUrl3,
                imagePublicId3,
                id
            ]
        );

        res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            product: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to update product."
        });

    }
};
// =======================================================
// DELETE PRODUCT
// =======================================================

export const deleteProduct = async (req, res) => {
    try {

        const { id } = req.params;

        const existing = await pool.query(
            "SELECT * FROM products WHERE id = $1",
            [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const product = existing.rows[0];

        // Delete image from Cloudinary
        if (product.image_public_id) {
            await cloudinary.uploader.destroy(product.image_public_id);
        }

        // Delete product from database
        await pool.query(
            "DELETE FROM products WHERE id = $1",
            [id]
        );

        res.status(200).json({
            success: true,
            message: "Product deleted successfully."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product."
        });

    }
};
