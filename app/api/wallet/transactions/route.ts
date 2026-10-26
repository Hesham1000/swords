import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, wallet, walletTransactions } from "../../../lib/db";
import { verifyAccessToken } from "../../../lib/auth/token";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Scope transactions to the current user's wallet
    let walletId: string | null = null;
    try {
      const token = request.cookies.get("access_token")?.value;
      if (token) {
        const payload = await verifyAccessToken(token);
        const userId = (payload as any)?.userId;
        if (typeof userId === "string" && UUID_REGEX.test(userId)) {
          const rows = await db
            .select({ id: wallet.id })
            .from(wallet)
            .where(eq(wallet.userId, userId));
          walletId = rows[0]?.id ?? null;
        }
      }
    } catch {
      walletId = null;
    }

    const where = walletId ? eq(walletTransactions.walletId, walletId) : undefined;

    const [transactions, countRows] = await Promise.all([
      db
        .select()
        .from(walletTransactions)
        .where(where)
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(skip),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(walletTransactions)
        .where(where),
    ]);

    const totalItems = Number(countRows[0]?.count ?? 0);
    const totalPages = Math.ceil(totalItems / limit);

    // Map to the old response shape (note field, numeric amount)
    const data = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(String(t.amount)),
      currency: t.currency,
      note: t.description,
      referenceId: t.referenceId,
      date: t.createdAt,
      createdAt: t.createdAt,
    }));

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
