import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../lib/db";
import { wallet, walletTransactions } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { verifyAccessTokenEdge } from "../../lib/auth/edge";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

// Resolve the current user's id from the x-user-id header or access_token cookie
async function getUserId(request: NextRequest): Promise<string | null> {
  const headerId = request.headers.get("x-user-id");
  if (headerId) return headerId;
  const token = request.cookies.get("access_token")?.value;
  if (!token) return null;
  const payload = await verifyAccessTokenEdge(token);
  return payload?.userId ?? null;
}

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rows = await db.select().from(wallet).where(eq(wallet.userId, userId));

    if (rows.length === 0) {
      // Initialize wallet with zero balances
      const inserted = await db
        .insert(wallet)
        .values({ userId, balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" })
        .returning();
      rows = inserted;
    }

    const w = rows[0];

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: Number(w.balanceEGP ?? 0),
        balanceUSD: Number(w.balanceUSD ?? 0),
        balanceEUR: Number(w.balanceEUR ?? 0),
      },
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Deposit or Withdraw from wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, note, currency = "EGP", type = "deposit" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!CURRENCIES.includes(currency)) {
      return NextResponse.json({ error: "Currency must be EGP, USD, or EUR" }, { status: 400 });
    }

    if (!["deposit", "withdraw"].includes(type)) {
      return NextResponse.json({ error: "Type must be deposit or withdraw" }, { status: 400 });
    }

    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsedAmount = parseFloat(amount);
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;

    // Ensure the wallet row exists
    const existing = await db.select().from(wallet).where(eq(wallet.userId, userId));
    if (existing.length === 0) {
      await db.insert(wallet).values({ userId, balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" });
    }

    // Update wallet balance for the specific currency
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (currency === "EGP") updateSet.balanceEGP = sql`${wallet.balanceEGP} + ${delta}`;
    else if (currency === "USD") updateSet.balanceUSD = sql`${wallet.balanceUSD} + ${delta}`;
    else updateSet.balanceEUR = sql`${wallet.balanceEUR} + ${delta}`;

    await db.update(wallet).set(updateSet).where(eq(wallet.userId, userId));

    // Log the transaction
    const insertedTx = await db
      .insert(walletTransactions)
      .values({
        userId,
        type,
        amount: String(delta),
        currency,
        description: note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
      })
      .returning();

    // Get updated balances
    const updated = (await db.select().from(wallet).where(eq(wallet.userId, userId)))[0];

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: Number(updated?.balanceEGP ?? 0),
        balanceUSD: Number(updated?.balanceUSD ?? 0),
        balanceEUR: Number(updated?.balanceEUR ?? 0),
        transaction: {
          ...insertedTx[0],
          amount: Number(insertedTx[0].amount),
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
