import { NextRequest, NextResponse } from "next/server";
import { db, wallet, walletTransactions, invoices } from "../../lib/db";
import { eq, sql } from "drizzle-orm";

// GET endpoint to retrieve wallet balances
export async function GET(_request: NextRequest) {
  try {
    // Ensure wallet row exists
    const walletRows = await db.select().from(wallet).where(eq(wallet.slug, "main"));
    let walletRow = walletRows[0];

    if (!walletRow) {
      const created = await db.insert(wallet).values({ slug: "main" }).returning();
      walletRow = created[0];
    }

    // Initialization: derive balances from cash invoices if wallet was never initialized
    if (!walletRow.initialized) {
      const cashInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.paymentMethod, "cash"));

      let egp = 0, usd = 0, eur = 0;
      for (const inv of cashInvoices) {
        const total = Number(inv.totalAmount || 0);
        const cur = (inv.depositCurrency || "EGP").toUpperCase();
        if (cur === "USD") usd += total;
        else if (cur === "EUR") eur += total;
        else egp += total;
      }

      const updated = await db
        .update(wallet)
        .set({
          balanceEgp: String(egp),
          balanceUsd: String(usd),
          balanceEur: String(eur),
          initialized: true,
          updatedAt: new Date(),
        })
        .where(eq(wallet.id, walletRow.id))
        .returning();
      walletRow = updated[0];
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: walletRow.id,
          balanceEGP: Number(walletRow.balanceEgp || 0),
          balanceUSD: Number(walletRow.balanceUsd || 0),
          balanceEUR: Number(walletRow.balanceEur || 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint to deposit or withdraw from the wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, amount, currency, description } = body;

    if (!type || !amount || !currency) {
      return NextResponse.json(
        { error: "Type, amount, and currency are required" },
        { status: 400 }
      );
    }

    if (!["deposit", "withdraw"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'deposit' or 'withdraw'" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const cur = currency.toUpperCase();
    if (!["EGP", "USD", "EUR"].includes(cur)) {
      return NextResponse.json(
        { error: "Currency must be EGP, USD, or EUR" },
        { status: 400 }
      );
    }

    // Ensure wallet row exists
    const walletRows = await db.select().from(wallet).where(eq(wallet.slug, "main"));
    let walletRow = walletRows[0];
    if (!walletRow) {
      const created = await db.insert(wallet).values({ slug: "main" }).returning();
      walletRow = created[0];
    }

    const balanceColumn =
      cur === "USD" ? wallet.balanceUsd :
      cur === "EUR" ? wallet.balanceEur :
      wallet.balanceEgp;
    const balanceField =
      cur === "USD" ? "balanceUsd" :
      cur === "EUR" ? "balanceEur" :
      "balanceEgp";

    // Check sufficient balance for withdrawal
    if (type === "withdraw") {
      const currentBalance = Number(
        cur === "USD" ? walletRow.balanceUsd :
        cur === "EUR" ? walletRow.balanceEur :
        walletRow.balanceEgp || 0
      );
      if (currentBalance < numAmount) {
        return NextResponse.json(
          { error: `Insufficient ${cur} balance` },
          { status: 400 }
        );
      }
    }

    const signedAmount = type === "deposit" ? numAmount : -numAmount;

    const updated = await db
      .update(wallet)
      .set({
        [balanceField]: sql`coalesce(${balanceColumn}, 0) + ${signedAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id))
      .returning();

    // Record transaction
    await db.insert(walletTransactions).values({
      walletId: walletRow.id,
      type,
      amount: String(numAmount),
      currency: cur,
      description: description || `${type === "deposit" ? "Deposit" : "Withdrawal"} of ${numAmount} ${cur}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
        data: {
          balanceEGP: Number(updated[0].balanceEgp || 0),
          balanceUSD: Number(updated[0].balanceUsd || 0),
          balanceEUR: Number(updated[0].balanceEur || 0),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
