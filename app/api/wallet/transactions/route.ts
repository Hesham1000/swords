import { NextRequest, NextResponse } from "next/server";
import { getWalletTransactionsCollection } from "../../../lib/mongoDB";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const transactionsCollection = await getWalletTransactionsCollection();
    const transactions = await transactionsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      message: "Wallet transactions retrieved successfully",
      data: transactions,
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
