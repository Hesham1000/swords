import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { products } from "../../lib/db/schema";
import { eq, ilike, or, and, desc, asc, sql, lt } from "drizzle-orm";
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
    const sort = searchParams.get("sort");

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
