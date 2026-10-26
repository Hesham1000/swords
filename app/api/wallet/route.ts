import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { wallet, walletTransactions } from "../../lib/db/schema";
import { and, eq } from "drizzle-orm";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;

async function getOrCreateWallet() {
  let [w] = await db.select().from(wallet).limit(1);
  if (!w) {
    // Calculate initial EGP balance from all invoice transactions
    const txs = await db
      .select()
      .from(walletTransactions)
      .where(and(eq(walletTransactions.type, "invoice"), eq(walletTransactions.currency, "EGP")));
    const initialEGP = txs.reduce((s, t) => s + parseFloat(t.amount || "0"), 0);

    const [created] = await db
      .insert(wallet)
      .values({
        balanceEGP: String(initialEGP),
        balanceUSD: "0",
        balanceEUR: "0",
      })
      .returning();
    w = created;
  }
  return w;
}

// GET: Return wallet balances for all currencies
export async function GET() {
  try {
    const w = await getOrCreateWallet();

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(w.balanceEGP || "0"),
        balanceUSD: parseFloat(w.balanceUSD || "0"),
        balanceEUR: parseFloat(w.balanceEUR || "0"),
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

    const w = await getOrCreateWallet();

    const parsedAmount = parseFloat(amount);
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;

    const balanceField =
      currency === "EGP" ? "balanceEGP" : currency === "USD" ? "balanceUSD" : "balanceEUR";

    const currentBalance = parseFloat(w[balanceField] || "0");
    const newBalance = currentBalance + delta;

    // Update wallet balance for the specific currency
    await db
      .update(wallet)
      .set({ [balanceField]: String(newBalance), updatedAt: new Date() })
      .where(eq(wallet.id, w.id));

    // Log the transaction
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId: w.id,
        type,
        amount: String(delta),
        currency,
        description: note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
      })
      .returning();

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(balanceField === "balanceEGP" ? String(newBalance) : w.balanceEGP || "0"),
        balanceUSD: parseFloat(balanceField === "balanceUSD" ? String(newBalance) : w.balanceUSD || "0"),
        balanceEUR: parseFloat(balanceField === "balanceEUR" ? String(newBalance) : w.balanceEUR || "0"),
        transaction,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
