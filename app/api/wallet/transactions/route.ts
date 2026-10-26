import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, walletTransactions } from "../../../lib/db";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const walletId = searchParams.get("walletId") || undefined;
    const offset = (page - 1) * limit;

    const baseQuery = db
      .select()
      .from(walletTransactions)
      .orderBy(desc(walletTransactions.createdAt))
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
            .orderBy(desc(walletTransactions.createdAt))
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
