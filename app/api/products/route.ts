import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { db, products } from "../../lib/db";
import { transformProduct } from "../../lib/api/utils";

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

    // Build where clause
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.model, `%${search}%`)
        )
      );
    }

    if (category) {
      conditions.push(eq(products.category, [category]));
    }

    if (productType) {
      conditions.push(eq(products.productType, productType));
    }

    if (brand) {
      conditions.push(eq(products.brand, brand));
    }

    const query = conditions.length > 0 ? and(...conditions) : undefined;

    // DASHBOARD OPTIMIZED RESPONSE
    if (dashboard) {
      // 1. Calculate total quantity matching query
      const qtyResult = await db
        .select({ total: sql<number>`coalesce(sum(${products.quantity}), 0)` })
        .from(products)
        .where(query);
      const totalQuantity = Number(qtyResult[0]?.total ?? 0);

      // 2. Fetch ALL low stock items (quantity < 3) matching query
      const lowStockConditions = [
        ...(conditions ?? []),
        lt(products.quantity, 3),
      ];
      const lowStockItems = await db
        .select()
        .from(products)
        .where(and(...lowStockConditions))
        .orderBy(asc(products.quantity));

      return NextResponse.json(
        {
          success: true,
          summary: {
            totalQuantity,
            lowStockItems: lowStockItems.map(transformProduct),
            lowStockCount: lowStockItems.length,
          },
        },
        { status: 200 }
      );
    }

    // STANDARD PAGINATED RESPONSE
    // Get total count of products for pagination metadata
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(query);
    const totalCount = Number(countResult[0]?.count ?? 0);

    // If summary is requested, calculate total quantity across all products matching the query
    let totalQuantity = 0;
    if (summary) {
      const result = await db
        .select({ total: sql<number>`coalesce(sum(${products.quantity}), 0)` })
        .from(products)
        .where(query);
      totalQuantity = Number(result[0]?.total ?? 0);
    }

    // Fetch paginated products
    const rows = await db
      .select()
      .from(products)
      .where(query)
      .orderBy(sql`${products.createdAt} desc`)
      .limit(limit)
      .offset(skip);

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
        ...(summary && { summary: { totalQuantity } }),
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

// POST endpoint to create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [newProduct] = await db
      .insert(products)
      .values({
        name: body.name,
        description: body.description ?? "",
        price: body.price != null ? String(body.price) : null,
        category: body.category ?? [],
        productType: body.productType,
        brand: body.brand ?? "",
        model: body.model ?? "",
        subCategory: body.subCategory,
        hand: body.hand,
        isKings: body.isKings ?? false,
        isMini: body.isMini ?? false,
        lameColor: body.lameColor,
        material: body.material,
        gloveSize: body.gloveSize,
        quantity: body.quantity ?? 0,
        images: body.images ?? [],
      })
      .returning();

    return NextResponse.json(
      { success: true, data: transformProduct(newProduct) },
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
