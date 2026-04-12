import { NextRequest, NextResponse } from "next/server";
import { getProductsCollection } from "../../lib/mongoDB";
import { transformProduct } from "../../lib/api/utils";

// GET endpoint to retrieve products with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    // Get query parameters from URL
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const summary = searchParams.get("summary") === "true";
    
    // Filter parameters
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const productType = searchParams.get("productType");
    const brand = searchParams.get("brand");

    const skip = (page - 1) * limit;

    // Validate parameters
    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be at least 1" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const productsCollection = await getProductsCollection();
    const dashboard = searchParams.get("dashboard") === "true";

    // Build query object
    const query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (productType) {
      query.productType = productType;
    }
    
    if (brand) {
      query.brand = brand;
    }

    // DASHBOARD OPTIMIZED RESPONSE
    if (dashboard) {
      // 1. Calculate total quantity matching query
      const qtyResult = await productsCollection.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]).toArray();
      const totalQuantity = qtyResult.length > 0 ? qtyResult[0].total : 0;

      // 2. Fetch ALL low stock items (quantity < 3) matching query
      const lowStockQuery = { ...query, quantity: { $lt: 3 } };
      const lowStockItems = await productsCollection
        .find(lowStockQuery)
        .sort({ quantity: 1 })
        .toArray();

      return NextResponse.json({
        success: true,
        summary: {
          totalQuantity,
          lowStockItems: lowStockItems.map(transformProduct),
          lowStockCount: lowStockItems.length
        }
      }, { status: 200 });
    }

    // STANDARD PAGINATED RESPONSE
    // Get total count of products for pagination metadata
    const totalCount = await productsCollection.countDocuments(query);

    // If summary is requested, calculate total quantity across all products matching the query
    let totalQuantity = 0;
    if (summary) {
      const result = await productsCollection.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]).toArray();
      totalQuantity = result.length > 0 ? result[0].total : 0;
    }

    // Fetch paginated products
    const products = await productsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const transformedProducts = products.map(transformProduct);

    return NextResponse.json(
      {
        data: transformedProducts,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
        ...(summary && { summary: { totalQuantity } })
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}