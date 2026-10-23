import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { wallet, walletTransactions } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = (typeof CURRENCIES)[number];

async function getMainWallet() {
  const [existing] = await db.select().from(wallet).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(wallet)
    .values({ balanceEGP: "0", balanceUSD: "0", balanceEUR: "0", initialized: true })
    .returning();
  return created;
}

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    const mainWallet = await getMainWallet();

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(mainWallet.balanceEGP || "0"),
        balanceUSD: parseFloat(mainWallet.balanceUSD || "0"),
        balanceEUR: parseFloat(mainWallet.balanceEUR || "0"),
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

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!CURRENCIES.includes(currency)) {
      return NextResponse.json({ error: "Currency must be EGP, USD, or EUR" }, { status: 400 });
    }

    if (!["deposit", "withdraw"].includes(type)) {
      return NextResponse.json({ error: "Type must be deposit or withdraw" }, { status: 400 });
    }

    const mainWallet = await getMainWallet();
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;
    const balanceField =
      currency === "EGP" ? "balanceEGP" : currency === "USD" ? "balanceUSD" : "balanceEUR";

    const updated = await db.transaction(async (tx) => {
      const [updatedWallet] = await tx
        .update(wallet)
        .set({
          [balanceField]: sql`${wallet[balanceField]} + ${delta}`,
          balance: currency === "EGP" ? sql`${wallet.balance} + ${delta}` : wallet.balance,
          updatedAt: new Date(),
        })
        .where(eq(wallet.id, mainWallet.id))
        .returning();

      const [transaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: mainWallet.id,
          type,
          amount: String(delta),
          currency,
          description:
            note ||
            (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
        })
        .returning();

      return { updatedWallet, transaction };
    });

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(updated.updatedWallet.balanceEGP || "0"),
        balanceUSD: parseFloat(updated.updatedWallet.balanceUSD || "0"),
        balanceEUR: parseFloat(updated.updatedWallet.balanceEUR || "0"),
        transaction: {
          id: updated.transaction.id,
          type: updated.transaction.type,
          amount: parseFloat(updated.transaction.amount || "0"),
          currency: updated.transaction.currency,
          note: updated.transaction.description,
          createdAt: updated.transaction.createdAt,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
