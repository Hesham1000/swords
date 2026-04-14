import { NextRequest, NextResponse } from "next/server";
import { getWalletTransactionsCollection } from "../../../lib/mongoDB";

// GET: Return wallet transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const transactionsCollection = await getWalletTransactionsCollection();
    
    const [transactions, totalItems] = await Promise.all([
      transactionsCollection
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      transactionsCollection.countDocuments({})
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      message: "Wallet transactions retrieved successfully",
      success: true,
      data: transactions,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
