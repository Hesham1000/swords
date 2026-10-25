import { NextRequest, NextResponse } from "next/server";
import { db, wallet, walletTransactions, invoices, users } from "../../lib/db";
import { eq, sql } from "drizzle-orm";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

// The Drizzle wallet table stores a single numeric balance per row, so the
// "main" wallet row (first row in the table) holds the EGP balance. The
// schema has no multi-currency columns, so USD/EUR balances are reported as 0.
// Currency is still recorded per-transaction in the description ([EGP] etc.).

async function getMainWallet() {
  let [mainWallet] = await db.select().from(wallet).orderBy(wallet.updatedAt).limit(1);
  if (!mainWallet) {
    const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
    if (firstUser) {
      [mainWallet] = await db
        .insert(wallet)
        .values({ userId: firstUser.id, balance: "0" })
        .returning();
    }
  }
  return mainWallet ?? null;
}

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    const mainWallet = await getMainWallet();

    if (!mainWallet) {
      // No users yet — can't create the wallet row (FK on user_id).
      // Report the initial EGP balance computed from cash invoices.
      const [{ initialEGP }] = await db
        .select({
          initialEGP: sql<number>`coalesce(sum(case when ${invoices.items}->>'paymentMethod' = 'cash' then coalesce((${invoices.items}->>'deposit')::numeric, 0) else 0 end), 0)::float8`,
        })
        .from(invoices);

      return NextResponse.json({
        message: "Wallet balance retrieved successfully",
        data: {
          balanceEGP: Number(initialEGP) || 0,
          balanceUSD: 0,
          balanceEUR: 0,
        },
      }, { status: 200 });
    }

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(mainWallet.balance || "0") || 0,
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

    const mainWallet = await getMainWallet();
    if (!mainWallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Update wallet balance (only EGP is tracked in the single balance column)
    if (currency === "EGP") {
      await db
        .update(wallet)
        .set({ balance: sql`${wallet.balance} + ${delta}`, updatedAt: new Date() })
        .where(eq(wallet.id, mainWallet.id));
    }

    // Log the transaction
    const description =
      note ||
      (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`);
    const [transaction] = await db
      .insert(walletTransactions)
      .values({
        walletId: mainWallet.id,
        type,
        amount: delta.toFixed(2),
        description: `${description} [${currency}]`,
      })
      .returning();

    // Get updated balances
    const [updated] = await db.select().from(wallet).where(eq(wallet.id, mainWallet.id)).limit(1);

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(updated?.balance || "0") || 0,
        balanceUSD: 0,
        balanceEUR: 0,
        transaction: {
          _id: transaction.id,
          type: transaction.type,
          amount: parseFloat(transaction.amount),
          currency,
          note: transaction.description,
          createdAt: transaction.createdAt,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
