import { NextRequest, NextResponse } from "next/server";
import { db, walletTransactions } from "../../../lib/db";
import { desc, sql } from "drizzle-orm";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [rows, countRows] = await Promise.all([
      db
        .select()
        .from(walletTransactions)
        .orderBy(desc(walletTransactions.createdAt))
        .offset(skip)
        .limit(limit),
      db.select({ count: sql<number>`count(*)::int` }).from(walletTransactions),
    ]);

    const totalItems = countRows[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Map Drizzle rows back to the legacy response shape
    const data = rows.map((row) => {
      // Legacy transactions stored currency in the description suffix ([EGP] etc.)
      const currencyMatch = row.description?.match(/\[([A-Z]{3})\]\s*$/);
      const note = row.description?.replace(/\s*\[[A-Z]{3}\]\s*$/, "") ?? row.description;
      return {
        _id: row.id,
        walletId: row.walletId,
        type: row.type,
        amount: parseFloat(row.amount),
        currency: currencyMatch ? currencyMatch[1] : "EGP",
        note,
        date: row.createdAt,
        createdAt: row.createdAt,
      };
    });

    return NextResponse.json({
      message: "Wallet transactions retrieved successfully",
      success: true,
      data,
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
