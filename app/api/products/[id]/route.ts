// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { ObjectId } from "mongodb";
import { getProductsCollection } from "../../../lib/mongoDB";
import { transformProduct } from "../../../lib/api/utils";

// GET a single product
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const productsCollection = await getProductsCollection();
        const product = await productsCollection.findOne({ _id: new ObjectId(id) });

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
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const formData = await request.formData();
        const productsCollection = await getProductsCollection();

        // Find existing product to handle image replacement if needed
        const existingProduct = await productsCollection.findOne({ _id: new ObjectId(id) });
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

        const uploadDir = join(process.cwd(), "public", "uploads", "products");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

        for (const image of images) {
            if (typeof image === "string") {
                // Keep existing image, but strip API URL if it's there to keep relative paths in DB
                let finalPath = image;
                if (apiUrl && image.startsWith(apiUrl)) {
                    finalPath = image.replace(apiUrl, "");
                }
                imagePaths.push(finalPath);
            } else if (image instanceof File && image.size > 0) {
                // Process new upload
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(7);
                const extension = image.name.split(".").pop();
                const filename = `${timestamp}-${randomString}.${extension}`;
                const filepath = join(uploadDir, filename);

                const bytes = await image.arrayBuffer();
                const buffer = Buffer.from(bytes);
                await writeFile(filepath, buffer);
                imagePaths.push(`/uploads/products/${filename}`);
            }
        }

        // Update document
        const updateData = {
            name,
            description,
            price: price ? parseFloat(price) : null,
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
            updatedAt: new Date().toISOString(),
        };

        const quantityChange = parseInt(quantity) - (existingProduct.quantity || 0);
        const newPriceValue = price ? parseFloat(price) : null;
        const oldPriceValue = existingProduct.price;
        const hasPriceChanged = newPriceValue !== oldPriceValue;

        await productsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

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
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
        }

        const productsCollection = await getProductsCollection();
        const product = await productsCollection.findOne({ _id: new ObjectId(id) });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Delete associated images from storage
        if (product.images && Array.isArray(product.images)) {
            for (const imagePath of product.images) {
                const fullPath = join(process.cwd(), "public", imagePath);
                if (existsSync(fullPath)) {
                    try {
                        await unlink(fullPath);
                    } catch (err) {
                        console.error(`Failed to delete image: ${fullPath}`, err);
                    }
                }
            }
        }

        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ error: "Could not delete product" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "Product deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
