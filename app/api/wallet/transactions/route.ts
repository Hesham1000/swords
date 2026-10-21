import { NextRequest, NextResponse } from "next/server";
import { query } from "../../../lib/db";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [transactionsResult, countResult] = await Promise.all([
      query(
        `SELECT id, wallet_id AS "walletId", type, amount, currency, note, status,
                date, reference_id AS "referenceId", created_at AS "createdAt"
         FROM wallet_transactions
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, skip]
      ),
      query<{ count: string }>(`SELECT COUNT(*) AS count FROM wallet_transactions`),
    ]);

    const totalItems = parseInt(countResult.rows[0]?.count || "0", 10);
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      message: "Wallet transactions retrieved successfully",
      success: true,
      data: transactionsResult.rows,
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
