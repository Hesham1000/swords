import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { products } from "../../lib/db/schema";
import { and, asc, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
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

    // Build filter conditions
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
      conditions.push(sql`${products.category} @> ARRAY[${category}]::text[]`);
    }

    if (productType) {
      conditions.push(eq(products.productType, productType));
    }

    if (brand) {
      conditions.push(eq(products.brand, brand));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // DASHBOARD OPTIMIZED RESPONSE
    if (dashboard) {
      // 1. Calculate total quantity matching query
      const qtyResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${products.quantity}), 0)` })
        .from(products)
        .where(whereClause);
      const totalQuantity = Number(qtyResult[0]?.total ?? 0);

      // 2. Fetch ALL low stock items (quantity < 3) matching query
      const lowStockItems = await db
        .select()
        .from(products)
        .where(
          whereClause
            ? and(whereClause, lt(products.quantity, 3))
            : lt(products.quantity, 3)
        )
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
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count ?? 0);

    // If summary is requested, calculate total quantity across all products matching the query
    let totalQuantity = 0;
    if (summary) {
      const result = await db
        .select({ total: sql<number>`COALESCE(SUM(${products.quantity}), 0)` })
        .from(products)
        .where(whereClause);
      totalQuantity = Number(result[0]?.total ?? 0);
    }

    // Fetch paginated products
    const rows = await db
      .select()
      .from(products)
      .where(whereClause)
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
