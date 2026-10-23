import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { walletTransactions } from "../../../lib/schema";
import { desc, sql } from "drizzle-orm";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(walletTransactions);
    const totalItems = Number(countResult[0]?.count ?? 0);

    const transactions = await db
      .select()
      .from(walletTransactions)
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit)
      .offset(skip);

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
