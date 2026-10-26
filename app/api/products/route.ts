import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { products } from "../../lib/db/schema";
import { eq, ilike, or, and, desc, asc, sql, lt } from "drizzle-orm";
import { transformProduct } from "../../lib/api/utils";

// Define the product data structure with optional fields
interface ProductData {
  name: string;
  description: string;
  price: string | null;
  category: string[];
  productType: string;
  brand?: string;
  model?: string;
  subCategory?: string;
  isKings?: boolean;
  isMini?: boolean;
  lameColor?: string;
  material?: string;
  hand?: string;
  quantity: number;
  images: string[];
}

// POST endpoint to create a new product (JSON body)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const price = body.price;
    const category = Array.isArray(body.category) ? body.category : [];
    const productType = body.productType;
    const brand = typeof body.brand === "string" ? body.brand.trim() : "";
    const model = typeof body.model === "string" ? body.model.trim() : "";
    const quantity = body.quantity;

    // Validate essential fields
    if (!name || price === undefined || price === null || quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: "Missing required fields (name, price, quantity)" },
        { status: 400 }
      );
    }

    // Base product data - only common fields
    const productData: ProductData = {
      name,
      description: description || "",
      price: String(parseFloat(price)),
      category,
      productType: productType,
      quantity: parseInt(quantity),
      images: Array.isArray(body.images) ? body.images : [],
    };

    // Add type-specific fields conditionally — only include what's relevant
    if (productType === "lame") {
      productData.brand = brand || "";
      if (model) productData.model = model;
      if (body.isKings !== undefined) productData.isKings = Boolean(body.isKings);
      if (body.isMini !== undefined) productData.isMini = Boolean(body.isMini);
      if (body.lameColor) productData.lameColor = body.lameColor;
      if (body.material) productData.material = body.material;
      if (body.subCategory) productData.subCategory = body.subCategory;
    }
    else if (["grip", "guard", "guard_padding"].includes(productType)) {
      productData.brand = brand || "pbt";
      if (body.subCategory) productData.subCategory = body.subCategory;
      if (body.hand) productData.hand = body.hand;
      if (body.material) productData.material = body.material;
      if (productType === "guard" && body.isMini !== undefined) {
        productData.isMini = Boolean(body.isMini);
      }
    }
    else if (productType === "socket") {
      productData.brand = brand || "pbt";
      if (body.subCategory) productData.subCategory = body.subCategory;
    }
    else if (productType === "glove") {
      if (body.hand) productData.hand = body.hand;
    }
    else {
      // Simple types (wire, french_pommel, nut, point, etc.)
      productData.brand = brand || "pbt";
      if (model) productData.model = model;
    }

    const [created] = await db.insert(products).values(productData).returning();
    const insertedProduct = transformProduct(created);

    // Log the initial stock arrival
    try {
      const { logInventoryChange } = await import("../../lib/inventory-server");
      await logInventoryChange({
        productId: created.id,
        productName: productData.name,
        changeAmount: productData.quantity,
        newQuantity: productData.quantity,
        reason: "Product Created",
        note: "Initial stock load from product creation"
      });
    } catch (logError) {
      console.error("Failed to log initial inventory:", logError);
    }

    return NextResponse.json(
      {
        success: true,
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

// GET endpoint to retrieve products with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Get query parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const summary = searchParams.get("summary") === "true";

    // Filter parameters
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const productType = searchParams.get("productType");
    const brand = searchParams.get("brand");

    const skip = (page - 1) * limit;

    // Validate parameters
    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be at least 1" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const dashboard = searchParams.get("dashboard") === "true";

    // Build conditions array
    const conditions: ReturnType<typeof eq>[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.model, `%${search}%`)
        )!
      );
    }

    if (category) {
      conditions.push(sql`${products.category} @> ARRAY[${category}]::text[]`);
    }

    if (productType) {
      conditions.push(eq(products.productType, productType));
    }

    if (brand) {
      conditions.push(eq(products.brand, brand));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    // DASHBOARD OPTIMIZED RESPONSE
    if (dashboard) {
      // 1. Calculate total quantity matching query
      const qtyRows = await db
        .select({ total: sql<number>`coalesce(sum(${products.quantity}), 0)` })
        .from(products)
        .where(where);
      const totalQuantity = Number(qtyRows[0].total);

      // 2. Fetch ALL low stock items (quantity < 3) matching query
      const lowStockRows = await db
        .select()
        .from(products)
        .where(and(where, lt(products.quantity, 3)))
        .orderBy(asc(products.quantity));

      return NextResponse.json({
        success: true,
        summary: {
          totalQuantity,
          lowStockItems: lowStockRows.map(transformProduct),
          lowStockCount: lowStockRows.length
        }
      }, { status: 200 });
    }

    // STANDARD PAGINATED RESPONSE
    // Get total count of products for pagination metadata
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(where);
    const totalCount = Number(countRows[0].count);

    // If summary is requested, calculate total quantity across all products matching the query
    let totalQuantity = 0;
    if (summary) {
      const qtyRows = await db
        .select({ total: sql<number>`coalesce(sum(${products.quantity}), 0)` })
        .from(products)
        .where(where);
      totalQuantity = Number(qtyRows[0].total);
    }

    // Fetch paginated products
    const rows = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .offset(skip)
      .limit(limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const transformedProducts = rows.map(transformProduct);

    return NextResponse.json(
      {
        data: transformedProducts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        ...(summary && { summary: { totalQuantity } })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
