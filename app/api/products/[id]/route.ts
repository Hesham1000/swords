import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, products } from "../../../lib/db";
import { uploadImage, deleteImage, getPublicIdFromUrl, getRelativePathFromUrl } from "../../../lib/cloudinary";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET a single product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!UUID_REGEX.test(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const rows = await db.select().from(products).where(eq(products.id, id));
        const product = rows[0];

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: product }, { status: 200 });
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
        if (!UUID_REGEX.test(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const formData = await request.formData();

        // Find existing product to handle image replacement if needed
        const existingRows = await db.select().from(products).where(eq(products.id, id));
        const existingProduct = existingRows[0];
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
            }
        }

        // Update values
        const updateData: Record<string, unknown> = {
            name,
            description,
            price: price ? price : null,
            category,
            productType,
            brand,
            model,
            quantity: parseInt(quantity),
            isMini,
            lameColor,
            material,
            subCategory,
            isKings,
            hand,
            images: imagePaths,
            updatedAt: new Date(),
        };

        const quantityChange = parseInt(quantity) - (existingProduct.quantity || 0);
        const newPriceValue = price ? price : null;
        const oldPriceValue = existingProduct.price;
        const hasPriceChanged = newPriceValue !== oldPriceValue;

        await db.update(products).set(updateData as Partial<typeof products.$inferInsert>).where(eq(products.id, id));

        // 📝 AUDIT LOGGING
        try {
            const { logInventoryChange } = await import("../../../lib/inventory-server");

            // 1. Log manual stock adjustment if it changed
            if (quantityChange !== 0) {
                await logInventoryChange({
                    productId: id,
                    productName: name || existingProduct.name,
                    changeAmount: quantityChange,
                    newQuantity: parseInt(quantity),
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
                    newQuantity: parseInt(quantity),
                    reason: "Price Update",
                    oldPrice: oldPriceValue,
                    newPrice: newPriceValue,
                    note: `Price adjusted from EGP ${oldPriceValue?.toLocaleString() || 0} to EGP ${newPriceValue?.toLocaleString() || 0}`
                });
            }
        } catch (logError) {
            console.error("Failed to log inventory update:", logError);
        }

        return NextResponse.json({
            success: true,
            message: "Product updated successfully"
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
        if (!UUID_REGEX.test(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const existingRows = await db.select().from(products).where(eq(products.id, id));
        const product = existingRows[0];

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

        await db.delete(products).where(eq(products.id, id));

        return NextResponse.json({
            success: true,
            message: "Product deleted successfully"
        }, { status: 200 });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
