import { NextRequest, NextResponse } from "next/server";
import { getInventoryLogsCollection } from "../../../lib/mongoDB";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const productId = searchParams.get("productId");
    
    const logsCollection = await getInventoryLogsCollection();
    
    const query: any = {};
    if (productId) {
      query.productId = productId;
    }
    
    const logs = await logsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
      
    return NextResponse.json({
      success: true,
      data: logs
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
