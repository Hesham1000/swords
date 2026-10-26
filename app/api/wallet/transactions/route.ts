import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq, sql } from "drizzle-orm";
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

    const sortColumns: Record<string, any> = {
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

    const [transactions, totalResult] = await Promise.all([
      walletId
        ? db
            .select()
            .from(walletTransactions)
            .where(eq(walletTransactions.walletId, walletId))
            .orderBy(order === "asc" ? asc(sortColumn) : desc(sortColumn))
            .limit(limit)
            .offset(offset)
        : baseQuery,
      walletId
        ? db
            .select({ count: sql<number>`count(*)::int` })
            .from(walletTransactions)
            .where(eq(walletTransactions.walletId, walletId))
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
