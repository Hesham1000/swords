import { NextRequest, NextResponse } from "next/server";
import { getInventoryLogsCollection } from "../../../lib/mongoDB";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const productId = searchParams.get("productId");
    
    const logsCollection = await getInventoryLogsCollection();
    
    const query: any = {};
    if (productId) {
      query.productId = productId;
    }
    
    const [logs, totalItems] = await Promise.all([
      logsCollection
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      logsCollection.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalItems / limit);
      
    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
