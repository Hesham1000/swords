import { NextRequest, NextResponse } from "next/server";
import { query } from "../../lib/db";
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

    // Sorting parameters (whitelisted column mapping — never interpolate raw input)
    const SORT_COLUMNS: Record<string, string> = {
      name: "name",
      price: "price",
      quantity: "quantity",
      createdAt: "created_at",
    };
    const sortByParam = searchParams.get("sortBy") || "createdAt";
    const sortBy = SORT_COLUMNS[sortByParam] ? sortByParam : "createdAt";
    const sortOrderParam = (searchParams.get("sortOrder") || "desc").toLowerCase();
    const sortOrder = sortOrderParam === "asc" ? "ASC" : "DESC";

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

    // Build WHERE clause (parameterized)
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      conditions.push(
        `(name ILIKE $${p} OR description ILIKE $${p} OR model ILIKE $${p})`
      );
    }

    if (category) {
      params.push(category);
      conditions.push(`category @> ARRAY[$${params.length}::text]`);
    }

    if (productType) {
      params.push(productType);
      conditions.push(`product_type = $${params.length}`);
    }

    if (brand) {
      params.push(brand);
      conditions.push(`brand = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // DASHBOARD OPTIMIZED RESPONSE
    if (dashboard) {
      // 1. Calculate total quantity matching query
      const qtyResult = await query<{ total: string }>(
        `SELECT COALESCE(SUM(quantity), 0) AS total FROM products ${whereClause}`,
        params
      );
      const totalQuantity = parseInt(qtyResult.rows[0]?.total || "0", 10);

      // 2. Fetch ALL low stock items (quantity < 3) matching query
      const lowStockResult = await query(
        `SELECT id, name, description, price, category, product_type AS "productType",
                brand, model, sub_category AS "subCategory", is_kings AS "isKings",
                is_mini AS "isMini", lame_color AS "lameColor", material, hand,
                glove_size AS "gloveSize", quantity, images,
                created_at AS "createdAt", updated_at AS "updatedAt"
         FROM products
         ${whereClause ? `${whereClause} AND` : "WHERE"} quantity < 3
         ORDER BY quantity ASC`,
        params
      );
      const lowStockItems = lowStockResult.rows;

      return NextResponse.json({
        success: true,
        summary: {
          totalQuantity,
          lowStockItems: lowStockItems.map(transformProduct),
          lowStockCount: lowStockItems.length
        }
      }, { status: 200 });
    }

    // STANDARD PAGINATED RESPONSE
    // Get total count of products for pagination metadata
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM products ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0]?.count || "0", 10);

    // If summary is requested, calculate total quantity across all products matching the query
    let totalQuantity = 0;
    if (summary) {
      const result = await query<{ total: string }>(
        `SELECT COALESCE(SUM(quantity), 0) AS total FROM products ${whereClause}`,
        params
      );
      totalQuantity = parseInt(result.rows[0]?.total || "0", 10);
    }

    // Fetch paginated products
    const productsResult = await query(
      `SELECT id, name, description, price, category, product_type AS "productType",
              brand, model, sub_category AS "subCategory", is_kings AS "isKings",
              is_mini AS "isMini", lame_color AS "lameColor", material, hand,
              glove_size AS "gloveSize", quantity, images,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM products
       ${whereClause}
       ORDER BY ${SORT_COLUMNS[sortBy]} ${sortOrder}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    );
    const products = productsResult.rows;

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const transformedProducts = products.map(transformProduct);

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
