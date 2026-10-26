import { NextRequest, NextResponse } from "next/server";
import { db, products } from "../../lib/db";
import {
  and,
  or,
  ilike,
  eq,
  sql,
  asc,
  desc,
  lt,
} from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const summary = searchParams.get("summary") === "true";
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const productType = searchParams.get("productType");
    const brand = searchParams.get("brand");
    const skip = (page - 1) * limit;

    if (page < 1) {
      return NextResponse.json(
        { message: "Page must be greater than 0" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { message: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

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
      conditions.push(sql`${category} = ANY(${products.category})`);
    }
    if (productType) {
      conditions.push(eq(products.productType, productType));
    }
    if (brand) {
      conditions.push(eq(products.brand, brand));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const dashboard = searchParams.get("dashboard") === "true";
    if (dashboard) {
      const qtyRows = await db
        .select({
          total: sql<number>`COALESCE(SUM(${products.quantity}), 0)`,
        })
        .from(products)
        .where(where);
      const totalQuantity = Number(qtyRows[0]?.total ?? 0);

      const lowStockCondition = where
        ? and(where, lt(products.quantity, 3))
        : lt(products.quantity, 3);
      const lowStock = await db
        .select()
        .from(products)
        .where(lowStockCondition)
        .orderBy(asc(products.quantity));

      return NextResponse.json(
        {
          success: true,
          summary: {
            totalQuantity,
            lowStockItems: lowStock,
            lowStockCount: lowStock.length,
          },
        },
        { status: 200 }
      );
    }

    const countRows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(where);
    const totalCount = Number(countRows[0]?.count ?? 0);

    let totalQuantity = 0;
    if (summary) {
      const qtyRows = await db
        .select({
          total: sql<number>`COALESCE(SUM(${products.quantity}), 0)`,
        })
        .from(products)
        .where(where);
      totalQuantity = Number(qtyRows[0]?.total ?? 0);
    }

    const rows = await db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(skip);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json(
      {
        data: rows,
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
      { message: "Error fetching products" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Product ID is required" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { message: "Error deleting product" },
      { status: 500 }
    );
  }
}
