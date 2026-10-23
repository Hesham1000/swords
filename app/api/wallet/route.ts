import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { wallet, walletTransactions, invoices } from "../../lib/db/schema";
import { eq, sql } from "drizzle-orm";

const MAIN_WALLET_ID = "00000000-0000-0000-0000-000000000000";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    const rows = await db.select().from(wallet).where(eq(wallet.id, MAIN_WALLET_ID)).limit(1);
    let walletRow = rows[0];

    if (!walletRow || !walletRow.initialized) {
      // Calculate initial EGP balance from all cash deposits
      const cashInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.paymentMethod, "cash"));
      const initialEGP = cashInvoices.reduce(
        (sum, inv) => sum + (parseFloat(inv.deposit || "0") || 0),
        0
      );

      await db
        .insert(wallet)
        .values({
          id: MAIN_WALLET_ID,
          balanceEGP: String(initialEGP),
          balanceUSD: "0",
          balanceEUR: "0",
          initialized: true,
        })
        .onConflictDoUpdate({
          target: wallet.id,
          set: {
            balanceEGP: String(initialEGP),
            balanceUSD: "0",
            balanceEUR: "0",
            initialized: true,
            updatedAt: new Date(),
          },
        });
      walletRow = {
        ...walletRow,
        id: MAIN_WALLET_ID,
        balanceEGP: String(initialEGP),
        balanceUSD: "0",
        balanceEUR: "0",
        initialized: true,
      };
    }

    if (!walletRow) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(walletRow.balanceEGP || "0") || 0,
        balanceUSD: parseFloat(walletRow.balanceUSD || "0") || 0,
        balanceEUR: parseFloat(walletRow.balanceEUR || "0") || 0,
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

    // Map currency to the correct balance column
    const setField =
      currency === "USD" ? "balanceUSD" : currency === "EUR" ? "balanceEUR" : "balanceEGP";
    const balanceColumn =
      currency === "USD" ? wallet.balanceUSD : currency === "EUR" ? wallet.balanceEUR : wallet.balanceEGP;

    // Update wallet balance for the specific currency
    await db
      .insert(wallet)
      .values({ id: MAIN_WALLET_ID, initialized: true })
      .onConflictDoUpdate({
        target: wallet.id,
        set: { [setField]: sql`${balanceColumn} + ${delta}`, updatedAt: new Date() },
      });

    // Log the transaction
    const transaction = {
      type,
      amount: String(delta),
      currency,
      note: note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
      date: new Date(),
    };
    await db.insert(walletTransactions).values(transaction);

    // Get updated balances
    const updatedRows = await db.select().from(wallet).where(eq(wallet.id, MAIN_WALLET_ID)).limit(1);
    const updatedWallet = updatedRows[0];

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(updatedWallet?.balanceEGP || "0") || 0,
        balanceUSD: parseFloat(updatedWallet?.balanceUSD || "0") || 0,
        balanceEUR: parseFloat(updatedWallet?.balanceEUR || "0") || 0,
        transaction,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
