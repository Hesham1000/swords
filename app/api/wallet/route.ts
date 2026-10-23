import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { wallet, walletTransactions } from "../../lib/schema";
import { eq, sql } from "drizzle-orm";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

// Each currency balance is stored as its own wallet row (userId null, currency = EGP/USD/EUR)
async function getOrCreateWalletRow(currency: Currency) {
  const existing = await db
    .select()
    .from(wallet)
    .where(sql`${wallet.userId} is null and ${wallet.currency} = ${currency}`)
    .limit(1);
  if (existing.length > 0) return existing[0];
  const inserted = await db
    .insert(wallet)
    .values({ userId: null, balance: "0", currency })
    .returning();
  return inserted[0];
}

async function getBalances() {
  const rows = await db.select().from(wallet).where(sql`${wallet.userId} is null`);
  const byCurrency: Record<string, number> = { EGP: 0, USD: 0, EUR: 0 };
  rows.forEach((row) => {
    byCurrency[row.currency] = parseFloat(row.balance || "0") || 0;
  });
  return byCurrency;
}

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    // Ensure all three currency rows exist
    for (const currency of CURRENCIES) {
      await getOrCreateWalletRow(currency);
    }

    const balances = await getBalances();

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: balances.EGP,
        balanceUSD: balances.USD,
        balanceEUR: balances.EUR,
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

    const parsedAmount = parseFloat(amount);
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;

    // Update wallet balance for the specific currency
    const walletRow = await getOrCreateWalletRow(currency as Currency);
    await db
      .update(wallet)
      .set({ balance: sql`${wallet.balance} + ${delta}` })
      .where(eq(wallet.id, walletRow.id));

    // Log the transaction
    await db.insert(walletTransactions).values({
      walletId: walletRow.id,
      type,
      amount: String(delta),
      description: note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
    });

    // Get updated balances
    const balances = await getBalances();

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: balances.EGP,
        balanceUSD: balances.USD,
        balanceEUR: balances.EUR,
        transaction: {
          type,
          amount: delta,
          currency,
          note: note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
          date: new Date(),
          createdAt: new Date(),
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
