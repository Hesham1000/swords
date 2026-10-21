import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";
import { transformProduct } from "../../../lib/api/utils";
import { uploadImage, getRelativePathFromUrl } from "../../../lib/cloudinary";

// Define the product data structure with optional fields
interface ProductData {
  name: string;
  description: string;
  price: number | null;
  category: ("Foil" | "Sabre" | "Epée")[];
  productType: string;
  brand?: string;
  model?: string;
  subCategory?: string;
  isKings?: boolean;
  isMini?: boolean;
  lameColor?: string;
  material?: string;
  hand?: string;
  gloveSize?: string;
  quantity: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

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

    // Validate essential fields — collect all per-field errors
    const details: Record<string, string> = {};

    if (!name) details.name = "Name is required";
    if (!category || category.length === 0) {
      details.category = "Category is required";
    } else {
      const validCategories = ["Foil", "Sabre", "Epée"];
      const invalid = category.filter((c) => !validCategories.includes(c));
      if (invalid.length > 0) {
        details.category = `Category values must be one of: ${validCategories.join(", ")}`;
      }
    }
    if (!productType || typeof productType !== "string" || productType.trim() === "") {
      details.productType = "Product type is required";
    }
    if (quantity === undefined || quantity === null || quantity === "") {
      details.quantity = "Quantity is required";
    } else {
      const parsedQuantity = Number(quantity);
      if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
        details.quantity = "Quantity must be an integer greater than or equal to 0";
      }
    }
    if (price !== undefined && price !== null && price !== "") {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        details.price = "Price must be a valid number greater than or equal to 0";
      }
    }

    if (Object.keys(details).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details },
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

    // Base product data - only common fields
    const productData: ProductData = {
      name,
      description: description || "",
      price: price ? parseFloat(price) : null,
      category: category as any,
      productType: productType,
      quantity: parseInt(quantity),
      images: imagePaths,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add type-specific fields conditionally — only include what's relevant
    if (productType === "lame") {
      const isKings = formData.get("isKings") === "true";
      const isMini = formData.get("isMini") === "true";
      const lameColor = formData.get("lameColor") as string;
      const material = formData.get("material") as string;
      const subCategory = formData.get("subCategory") as string;

      productData.brand = brand || "";
      if (model) productData.model = model;
      productData.isKings = isKings;
      productData.isMini = isMini;
      if (lameColor) productData.lameColor = lameColor;
      if (material) productData.material = material;
      if (subCategory) productData.subCategory = subCategory;
    }
    else if (["grip", "guard", "guard_padding"].includes(productType)) {
      productData.brand = brand || "pbt";
      const subCategory = formData.get("subCategory") as string;
      const hand = formData.get("hand") as string;
      const material = formData.get("material") as string;

      if (subCategory) productData.subCategory = subCategory;
      if (hand) productData.hand = hand;
      if (material) productData.material = material;

      if (productType === "guard") {
        productData.isMini = formData.get("isMini") === "true";
      }
    }
    else if (productType === "socket") {
      productData.brand = brand || "pbt";
      const subCategory = formData.get("subCategory") as string;
      if (subCategory) productData.subCategory = subCategory;
    }
    else if (productType === "glove") {
      const gloveSize = formData.get("gloveSize") as string;
      const hand = formData.get("hand") as string;

      if (gloveSize) productData.gloveSize = gloveSize;
      if (hand) productData.hand = hand;
    }
    else {
      // Simple types (wire, french_pommel, nut, point, etc.)
      productData.brand = brand || "pbt";
      if (model) productData.model = model;
    }

    // Build dynamic INSERT (only include fields that are set)
    const columns: string[] = [];
    const values: unknown[] = [];
    const push = (col: string, val: unknown) => {
      columns.push(col);
      values.push(val);
    };

    push("name", productData.name);
    push("description", productData.description);
    push("price", productData.price);
    push("category", productData.category);
    push("product_type", productData.productType);
    push("quantity", productData.quantity);
    push("images", productData.images);
    if (productData.brand !== undefined) push("brand", productData.brand);
    if (productData.model !== undefined) push("model", productData.model);
    if (productData.subCategory !== undefined) push("sub_category", productData.subCategory);
    if (productData.isKings !== undefined) push("is_kings", productData.isKings);
    if (productData.isMini !== undefined) push("is_mini", productData.isMini);
    if (productData.lameColor !== undefined) push("lame_color", productData.lameColor);
    if (productData.material !== undefined) push("material", productData.material);
    if (productData.hand !== undefined) push("hand", productData.hand);
    if (productData.gloveSize !== undefined) push("glove_size", productData.gloveSize);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query<{ id: string }>(
      `INSERT INTO products (${columns.join(", ")}) VALUES (${placeholders}) RETURNING id`,
      values
    );
    const insertedId = result.rows[0].id;

    const insertedProduct = transformProduct({ ...productData, id: insertedId });

    // Log the initial stock arrival
    try {
      const { logInventoryChange } = await import("../../../lib/inventory-server");
      await logInventoryChange({
        productId: insertedId,
        productName: productData.name,
        changeAmount: productData.quantity,
        newQuantity: productData.quantity,
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
