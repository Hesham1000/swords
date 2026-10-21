import { NextRequest, NextResponse } from "next/server";
import { query } from "../../lib/db";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

// Whitelisted balance columns (never build SQL from raw user input)
const BALANCE_COLUMNS: Record<Currency, string> = {
  EGP: "balance_egp",
  USD: "balance_usd",
  EUR: "balance_eur",
};

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    let walletResult = await query(
      `SELECT id, balance_egp, balance_usd, balance_eur, initialized FROM wallet WHERE id = 'main'`
    );
    let wallet = walletResult.rows[0];

    if (!wallet || !wallet.initialized) {
      // Calculate initial EGP balance from all cash deposits
      const cashResult = await query<{ total: string }>(
        `SELECT COALESCE(SUM(deposit), 0) AS total FROM invoices WHERE payment_method = 'cash'`
      );
      const initialEGP = parseFloat(cashResult.rows[0]?.total || "0");

      await query(
        `INSERT INTO wallet (id, balance_egp, balance_usd, balance_eur, initialized)
         VALUES ('main', $1, 0, 0, true)
         ON CONFLICT (id) DO UPDATE SET balance_egp = $1, balance_usd = 0, balance_eur = 0, initialized = true, updated_at = now()`,
        [initialEGP]
      );
      wallet = {
        id: "main",
        balance_egp: initialEGP,
        balance_usd: 0,
        balance_eur: 0,
        initialized: true,
      };
    }

    if (!wallet) {
       return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: parseFloat(wallet.balance_egp) || 0,
        balanceUSD: parseFloat(wallet.balance_usd) || 0,
        balanceEUR: parseFloat(wallet.balance_eur) || 0,
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

    const balanceColumn = BALANCE_COLUMNS[currency as Currency];
    const parsedAmount = parseFloat(amount);
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;

    // Update wallet balance for the specific currency
    await query(
      `INSERT INTO wallet (id, ${balanceColumn}, initialized) VALUES ('main', $1, true)
       ON CONFLICT (id) DO UPDATE SET ${balanceColumn} = wallet.${balanceColumn} + $1, updated_at = now()`,
      [delta]
    );

    // Log the transaction
    const transaction = {
      type,
      amount: delta,
      currency,
      note: note || (type === "deposit" ? `Cash deposit (${currency})` : `Withdrawal (${currency})`),
      date: new Date(),
      createdAt: new Date(),
    };
    const txResult = await query<{ id: string }>(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, currency, note, date, created_at)
       VALUES ('main', $1, $2, $3, $4, now(), now())
       RETURNING id`,
      [transaction.type, transaction.amount, transaction.currency, transaction.note]
    );

    // Get updated balances
    const walletResult = await query(
      `SELECT balance_egp, balance_usd, balance_eur FROM wallet WHERE id = 'main'`
    );
    const wallet = walletResult.rows[0];

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: parseFloat(wallet?.balance_egp) || 0,
        balanceUSD: parseFloat(wallet?.balance_usd) || 0,
        balanceEUR: parseFloat(wallet?.balance_eur) || 0,
        transaction: { ...transaction, _id: txResult.rows[0]?.id, id: txResult.rows[0]?.id },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
