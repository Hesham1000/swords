import { NextRequest, NextResponse } from "next/server";
import { query, isUuid } from "../../../lib/db";
import { transformProduct } from "../../../lib/api/utils";
import { uploadImage, deleteImage, getPublicIdFromUrl, getRelativePathFromUrl } from "../../../lib/cloudinary";

// Full product SELECT (same column list as GET, with aliases)
const PRODUCT_SELECT = `SELECT id, name, description, price, category, product_type AS "productType",
        brand, model, sub_category AS "subCategory", is_kings AS "isKings",
        is_mini AS "isMini", lame_color AS "lameColor", material, hand,
        glove_size AS "gloveSize", quantity, images,
        created_at AS "createdAt", updated_at AS "updatedAt"
 FROM products`;

// GET a single product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const result = await query(
            `${PRODUCT_SELECT} WHERE id = $1`,
            [id]
        );
        const product = result.rows[0];

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const transformedProduct = transformProduct(product);

        return NextResponse.json({ success: true, data: transformedProduct }, { status: 200 });
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT (Update) a product
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const formData = await request.formData();

        // Find existing product to handle image replacement if needed
        const existingResult = await query(
            `SELECT id, name, price, quantity FROM products WHERE id = $1`,
            [id]
        );
        const existingProduct = existingResult.rows[0];
        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Extract fields
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const price = formData.get("price") as string;
        const category = formData.getAll("category") as string[];
        const productType = formData.get("productType") as string;
        const brand = formData.get("brand") as string;
        const model = formData.get("model") as string;
        const quantity = formData.get("quantity") as string;
        const isMini = formData.get("isMini") === "true";
        const lameColor = formData.get("lameColor") as string;
        const material = formData.get("material") as string;
        const subCategory = formData.get("subCategory") as string;
        const isKings = formData.get("isKings") === "true";
        const hand = formData.get("hand") as string;

        // Handle Image Uploads (similar to create logic)
        const images = formData.getAll("images") as (File | string)[];
        const imagePaths: string[] = [];

        for (const image of images) {
            if (typeof image === "string") {
                // Keep existing image
                imagePaths.push(image);
            } else if (image instanceof File && image.size > 0) {
                // Process new upload
                const bytes = await image.arrayBuffer();
                const buffer = Buffer.from(bytes);

                // Upload to Cloudinary
                const result = await uploadImage(buffer, "products");
                imagePaths.push(getRelativePathFromUrl(result.url));

                // Note: In a more advanced implementation, we would track which old images
                // were removed and delete them from Cloudinary here.
                // For now, we focus on making the upload work.
            }
        }

        // Update row
        const newQuantity = parseInt(quantity, 10);
        const newPriceValue = price ? parseFloat(price) : null;
        const oldPriceValue = existingProduct.price !== null ? parseFloat(existingProduct.price) : null;
        const hasPriceChanged = newPriceValue !== oldPriceValue;

        await query(
            `UPDATE products SET
                name = $1, description = $2, price = $3, category = $4, product_type = $5,
                brand = $6, model = $7, quantity = $8, is_mini = $9, lame_color = $10,
                material = $11, sub_category = $12, is_kings = $13, hand = $14,
                images = $15, updated_at = now()
             WHERE id = $16`,
            [
                name,
                description,
                newPriceValue,
                category,
                productType,
                brand,
                model,
                newQuantity,
                isMini,
                lameColor,
                material,
                subCategory,
                isKings,
                hand,
                imagePaths,
                id,
            ]
        );

        const quantityChange = newQuantity - (existingProduct.quantity || 0);

        // 📝 AUDIT LOGGING
        try {
            const { logInventoryChange } = await import("../../../lib/inventory-server");

            // 1. Log manual stock adjustment if it changed
            if (quantityChange !== 0) {
                await logInventoryChange({
                    productId: id,
                    productName: name || existingProduct.name,
                    changeAmount: quantityChange,
                    newQuantity: newQuantity,
                    reason: "Manual Adjustment",
                    note: `Quantity updated from ${existingProduct.quantity} to ${quantity}`
                });
            }

            // 2. Log price update if it changed
            if (hasPriceChanged) {
                await logInventoryChange({
                    productId: id,
                    productName: name || existingProduct.name,
                    changeAmount: 0, // No stock change
                    newQuantity: newQuantity,
                    reason: "Price Update",
                    oldPrice: oldPriceValue,
                    newPrice: newPriceValue,
                    note: `Price adjusted from EGP ${oldPriceValue?.toLocaleString() || 0} to EGP ${newPriceValue?.toLocaleString() || 0}`
                });
            }
        } catch (logError) {
            console.error("Failed to log inventory update:", logError);
        }

        // Re-fetch the full updated product row
        const updatedResult = await query(
            `${PRODUCT_SELECT} WHERE id = $1`,
            [id]
        );
        const updatedProduct = updatedResult.rows[0];

        return NextResponse.json({
            success: true,
            message: "Product updated successfully",
            data: transformProduct(updatedProduct)
        }, { status: 200 });

    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE a product
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const existingResult = await query(
            `${PRODUCT_SELECT} WHERE id = $1`,
            [id]
        );
        const product = existingResult.rows[0];

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Delete associated images from Cloudinary
        if (product.images && Array.isArray(product.images)) {
            for (const imageUrl of product.images) {
                const publicId = getPublicIdFromUrl(imageUrl);
                if (publicId) {
                    try {
                        await deleteImage(publicId);
                    } catch (err) {
                        console.error(`Failed to delete image from Cloudinary: ${publicId}`, err);
                    }
                }
            }
        }

        const result = await query(`DELETE FROM products WHERE id = $1`, [id]);

        if ((result.rowCount ?? 0) === 0) {
            return NextResponse.json({ error: "Could not delete product" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully",
            data: transformProduct(product)
        }, { status: 200 });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
