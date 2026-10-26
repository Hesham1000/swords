import { NextRequest, NextResponse } from "next/server";
import { db, products } from "../../../lib/db";
import { uploadImage, getRelativePathFromUrl } from "../../../lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Extract basic fields
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const price = formData.get("price") as string;
    const category = formData.getAll("category") as string[];
    const productType = formData.get("productType") as string;
    const brand = (formData.get("brand") as string)?.trim();
    const model = (formData.get("model") as string)?.trim();
    const quantity = formData.get("quantity") as string;

    // Validate essential fields
    if (!name || !category || category.length === 0 || !quantity || !productType) {
      return NextResponse.json(
        { error: "Missing required fields (name, category, quantity, productType)" },
        { status: 400 }
      );
    }

    // Handle image uploads
    const images = formData.getAll("images") as (File | string)[];
    const imagePaths: string[] = [];

    for (const image of images) {
      if (typeof image === "string") {
        if (image.length > 0) imagePaths.push(image);
      } else if (image instanceof File && image.size > 0) {
        // Convert file to buffer
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary
        const result = await uploadImage(buffer, "products");
        imagePaths.push(getRelativePathFromUrl(result.url));
      }
    }

    // Base product values - only common fields
    const values: Record<string, unknown> = {
      name,
      description: description || "",
      price: price ? price : null,
      category,
      productType,
      quantity: parseInt(quantity),
      images: imagePaths,
      updatedAt: new Date(),
    };

    // Add type-specific fields conditionally — only include what's relevant
    if (productType === "lame") {
      const isKings = formData.get("isKings") === "true";
      const isMini = formData.get("isMini") === "true";
      const lameColor = formData.get("lameColor") as string;
      const material = formData.get("material") as string;
      const subCategory = formData.get("subCategory") as string;

      values.brand = brand || "";
      if (model) values.model = model;
      values.isKings = isKings;
      values.isMini = isMini;
      if (lameColor) values.lameColor = lameColor;
      if (material) values.material = material;
      if (subCategory) values.subCategory = subCategory;
    } else if (["grip", "guard", "guard_padding"].includes(productType)) {
      values.brand = brand || "pbt";
      const subCategory = formData.get("subCategory") as string;
      const hand = formData.get("hand") as string;
      const material = formData.get("material") as string;

      if (subCategory) values.subCategory = subCategory;
      if (hand) values.hand = hand;
      if (material) values.material = material;

      if (productType === "guard") {
        values.isMini = formData.get("isMini") === "true";
      }
    } else if (productType === "socket") {
      values.brand = brand || "pbt";
      const subCategory = formData.get("subCategory") as string;
      if (subCategory) values.subCategory = subCategory;
    } else if (productType === "glove") {
      const gloveSize = formData.get("gloveSize") as string;
      const hand = formData.get("hand") as string;

      if (gloveSize) values.gloveSize = gloveSize;
      if (hand) values.hand = hand;
    } else {
      // Simple types (wire, french_pommel, nut, point, etc.)
      values.brand = brand || "pbt";
      if (model) values.model = model;
    }

    const inserted = await db.insert(products).values(values as any).returning();
    const insertedProduct = inserted[0];

    // Log the initial stock arrival
    try {
      const { logInventoryChange } = await import("../../../lib/inventory-server");
      await logInventoryChange({
        productId: insertedProduct.id,
        productName: insertedProduct.name,
        changeAmount: insertedProduct.quantity ?? 0,
        newQuantity: insertedProduct.quantity ?? 0,
        reason: "Initial Stock",
        note: "Initial stock load from product creation"
      });
    } catch (logError) {
      console.error("Failed to log initial inventory:", logError);
    }

    return NextResponse.json(
      {
        message: "Product created successfully",
        data: insertedProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
