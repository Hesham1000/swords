import { NextRequest, NextResponse } from "next/server";
import { getWalletCollection, getWalletTransactionsCollection, getInvoicesCollection } from "../../lib/mongoDB";

const CURRENCIES = ["EGP", "USD", "EUR"] as const;
type Currency = typeof CURRENCIES[number];

// GET: Return wallet balances for all currencies
export async function GET(request: NextRequest) {
  try {
    const walletCollection = await getWalletCollection();
    let wallet = await walletCollection.findOne({ _id: "main" as any });

    if (!wallet || !wallet.initialized) {
      // Calculate initial EGP balance from all cash deposits
      const invoicesCollection = await getInvoicesCollection();
      const cashInvoices = await invoicesCollection.find({ paymentMethod: "cash" }).toArray();
      const initialEGP = cashInvoices.reduce((sum: number, inv: any) => sum + (inv.deposit || 0), 0);

      await walletCollection.updateOne(
        { _id: "main" as any },
        { $set: { balanceEGP: initialEGP, balanceUSD: 0, balanceEUR: 0, initialized: true } },
        { upsert: true }
      );
      wallet = { _id: "main" as any, balanceEGP: initialEGP, balanceUSD: 0, balanceEUR: 0, initialized: true };
    }

    if (!wallet) {
       return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Migration: if old single-balance format, migrate to multi-currency
    if (wallet.balance !== undefined && wallet.balanceEGP === undefined) {
      const oldBalance = wallet.balance || 0;
      await walletCollection.updateOne(
        { _id: "main" as any },
        { $set: { balanceEGP: oldBalance, balanceUSD: 0, balanceEUR: 0 }, $unset: { balance: "" } }
      );
      wallet = { _id: wallet._id, balanceEGP: oldBalance, balanceUSD: 0, balanceEUR: 0, initialized: wallet.initialized };
    }

    return NextResponse.json({
      message: "Wallet balance retrieved successfully",
      data: {
        balanceEGP: wallet.balanceEGP || 0,
        balanceUSD: wallet.balanceUSD || 0,
        balanceEUR: wallet.balanceEUR || 0,
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

    const walletCollection = await getWalletCollection();
    const transactionsCollection = await getWalletTransactionsCollection();

    const balanceField = `balance${currency}` as string;
    const parsedAmount = parseFloat(amount);
    const delta = type === "deposit" ? parsedAmount : -parsedAmount;

    // Update wallet balance for the specific currency
    await walletCollection.updateOne(
      { _id: "main" as any },
      { $inc: { [balanceField]: delta } },
      { upsert: true }
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
    await transactionsCollection.insertOne(transaction);

    // Get updated balances
    const wallet = await walletCollection.findOne({ _id: "main" as any });

    return NextResponse.json({
      message: `${type === "deposit" ? "Deposit" : "Withdrawal"} successful`,
      data: {
        balanceEGP: wallet?.balanceEGP || 0,
        balanceUSD: wallet?.balanceUSD || 0,
        balanceEUR: wallet?.balanceEUR || 0,
        transaction,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error processing wallet transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
