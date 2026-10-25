import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "../../../lib/db";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [transactions, totalResult] = await Promise.all([
      db
        .select()
        .from(schema.walletTransactions)
        .orderBy(desc(schema.walletTransactions.createdAt))
        .limit(limit)
        .offset(skip),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.walletTransactions),
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
