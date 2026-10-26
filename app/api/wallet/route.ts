import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, wallet, walletTransactions } from "../../lib/db";
import { verifyAccessToken } from "../../lib/auth/token";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    if (payload && typeof payload === "object" && "userId" in payload) {
      const userId = (payload as any).userId;
      return typeof userId === "string" && UUID_REGEX.test(userId) ? userId : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function getOrCreateWallet(userId: string) {
  const rows = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (rows.length > 0) return rows[0];
  const inserted = await db
    .insert(wallet)
    .values({ userId, balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" })
    .returning();
  return inserted[0];
}

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const walletRow = await getOrCreateWallet(userId);

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(String(walletRow.balanceEGP ?? 0)),
        balanceUSD: parseFloat(String(walletRow.balanceUSD ?? 0)),
        balanceEUR: parseFloat(String(walletRow.balanceEUR ?? 0)),
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

    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const walletRow = await getOrCreateWallet(userId);

    const balanceField = `balance${currency}` as "balanceEGP" | "balanceUSD" | "balanceEUR";
    const parsedAmount = parseFloat(amount);
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;

    // Update wallet balance for the specific currency
    const updated = await db
      .update(wallet)
      .set({
        [balanceField]: sql`${wallet[balanceField]} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id))
      .returning();

    // Log the transaction
    const transactionNote = note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`);
    const insertedTx = await db
      .insert(walletTransactions)
      .values({
        walletId: walletRow.id,
        type,
        amount: String(delta),
        currency,
        description: transactionNote,
      })
      .returning();

    const tx = insertedTx[0];

    // Response transaction object preserving the old shape
    const transaction = {
      type: tx.type,
      amount: parseFloat(String(tx.amount)),
      currency: tx.currency,
      note: tx.description,
      date: tx.createdAt,
      createdAt: tx.createdAt,
    };

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(String(updated[0]?.balanceEGP ?? 0)),
        balanceUSD: parseFloat(String(updated[0]?.balanceUSD ?? 0)),
        balanceEUR: parseFloat(String(updated[0]?.balanceEUR ?? 0)),
        transaction,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
