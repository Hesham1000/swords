import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { wallet, walletTransactions, invoices } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;

// GET: Return wallet balances for all currencies
export async function GET() {
  try {
    let walletRow = (await db.select().from(wallet).limit(1))[0];

    if (!walletRow) {
      // Calculate initial EGP balance from all cash deposits
      const cashInvoices = await db
        .select({ deposit: invoices.deposit })
        .from(invoices)
        .where(eq(invoices.paymentMethod, "cash"));
      const initialEGP = cashInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.deposit || "0"),
        0
      );

      const inserted = await db
        .insert(wallet)
        .values({ balance: initialEGP.toFixed(2), currency: "EGP" })
        .returning();
      walletRow = inserted[0];
    }

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(walletRow.balance || "0"),
        balanceUSD: 0,
        balanceEUR: 0,
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

    // Ensure a wallet row exists
    let walletRow = (await db.select().from(wallet).limit(1))[0];
    if (!walletRow) {
      const inserted = await db
        .insert(wallet)
        .values({ balance: "0", currency: "EGP" })
        .returning();
      walletRow = inserted[0];
    }

    // Update wallet balance atomically
    const updated = await db
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} + ${delta.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id))
      .returning();
    walletRow = updated[0];

    // Log the transaction
    const transaction = {
      type,
      amount: delta.toFixed(2),
      description:
        note ||
        (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
    };
    const insertedTx = await db
      .insert(walletTransactions)
      .values({ walletId: walletRow.id, ...transaction })
      .returning();

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(walletRow.balance || "0"),
        balanceUSD: 0,
        balanceEUR: 0,
        transaction: insertedTx[0],
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
