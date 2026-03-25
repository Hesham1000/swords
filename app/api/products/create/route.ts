// app/api/products/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { getProductsCollection } from "../../../lib/mongoDB";
import { transformProduct } from "../../../lib/api/utils";

// Define the product data structure with optional fields
interface ProductData {
  name: string;
  description: string;
  price: number | null;
  category: ("Foil" | "Sabre" | "Epée")[];
  productType: string; // Changed to string as it's validated later
  brand: string; // No longer optional
  model?: string;
  subCategory?: string;
  isKings?: boolean;
  isMini?: boolean;
  lameColor?: string;
  material?: string;
  hand?: string;
  quantity: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const productsCollection = await getProductsCollection();

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

    const uploadDir = join(process.cwd(), "public", "uploads", "products");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    for (const image of images) {
      if (typeof image === "string") {
        if (image.length > 0) imagePaths.push(image);
      } else if (image instanceof File && image.size > 0) {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(7);
        const extension = image.name.split(".").pop();
        const filename = `${timestamp}-${randomString}.${extension}`;
        const filepath = join(uploadDir, filename);

        // Convert file to buffer and save
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Store relative path for database
        imagePaths.push(`/uploads/products/${filename}`);
      }
    }

    // Base product data
    const productData: ProductData = {
      name,
      description: description || "",
      price: price ? parseFloat(price) : null,
      category: category as any,
      productType: productType,
      brand: brand || "pbt", // Default to pbt if not provided
      model: model || "",
      quantity: parseInt(quantity),
      images: imagePaths,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add type-specific fields conditionally
    if (productType === "lame") {
      const isKings = formData.get("isKings") === "true";
      const isMini = formData.get("isMini") === "true";
      const lameColor = formData.get("lameColor") as string;
      const material = formData.get("material") as string;
      const subCategory = formData.get("subCategory") as string;

      productData.isKings = isKings;
      productData.isMini = isMini;
      if (lameColor) productData.lameColor = lameColor;
      if (material) productData.material = material;
      if (subCategory) productData.subCategory = subCategory;
    } 
    else if (["grip", "guard", "guard_padding"].includes(productType)) {
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
      const subCategory = formData.get("subCategory") as string;
      if (subCategory) productData.subCategory = subCategory;
    }

    const result = await productsCollection.insertOne(productData);
    const insertedProduct = transformProduct({ ...productData, _id: result.insertedId });

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
