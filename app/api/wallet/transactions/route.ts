import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, sql, type AnyColumn } from "drizzle-orm";
import { db, walletTransactions } from "../../../lib/db";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const walletId = searchParams.get("walletId") || undefined;
    const sort = searchParams.get("sort") || "date";
    const order = searchParams.get("order") || "desc";

    // Map frontend type param to DB type values ('withdrawal' -> 'withdraw')
    const rawType = searchParams.get("type") || undefined;
    const mappedType =
      rawType === "withdrawal"
        ? "withdraw"
        : rawType === "deposit"
          ? "deposit"
          : undefined;

    const sortColumns: Record<string, AnyColumn> = {
      date: walletTransactions.createdAt,
      type: walletTransactions.type,
      amount: walletTransactions.amount,
    };
    const sortColumn = sortColumns[sort] || walletTransactions.createdAt;
    const offset = (page - 1) * limit;

    const baseQuery = db
      .select()
      .from(walletTransactions)
      .orderBy(order === "asc" ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(walletTransactions);

    const conditions = [
      walletId ? eq(walletTransactions.walletId, walletId) : undefined,
      mappedType ? eq(walletTransactions.type, mappedType) : undefined,
    ].filter(Boolean);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [transactions, totalResult] = await Promise.all([
      whereClause
        ? db
            .select()
            .from(walletTransactions)
            .where(whereClause)
            .orderBy(order === "asc" ? asc(sortColumn) : desc(sortColumn))
            .limit(limit)
            .offset(offset)
        : baseQuery,
      whereClause
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(walletTransactions)
            .where(whereClause)
        : countQuery,
    ]);

    const totalItems = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      message: "Wallet transactions retrieved successfully",
      success: true,
      data: transactions,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
