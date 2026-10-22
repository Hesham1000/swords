import { NextRequest, NextResponse } from "next/server";
import { Filter, Document } from "mongodb";
import { getConnection } from "../../lib/mongoDB";
import { transformProduct } from "../../lib/api/utils";
import { ApiError, handleApiError } from "../../lib/errors/ApiError";

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

    const connection = await getConnection();
    const productsCollection = connection.collection("products");
    const dashboard = searchParams.get("dashboard") === "true";

    // Build query object
    const query: Filter<Document> = {};
    
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
    return handleApiError(error);
  }
}

// POST endpoint to create a product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = body?.name;
    const description = body?.description;
    const category = body?.category;
    const productType = body?.productType;
    const brand = body?.brand;
    const model = body?.model;
    const subCategory = body?.subCategory;
    const images = body?.images;
    const rawPrice = body?.price;
    const rawStock = body?.quantity ?? body?.stock;

    // Validation
    if (typeof name !== "string" || name.trim().length === 0) {
      throw new ApiError("Name is required", 400);
    }

    const price =
      typeof rawPrice === "string" ? parseFloat(rawPrice) : rawPrice;
    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new ApiError("Price must be a non-negative number", 400);
    }

    const isCategoryValid =
      (typeof category === "string" && category.trim().length > 0) ||
      (Array.isArray(category) && category.length > 0);
    if (!isCategoryValid) {
      throw new ApiError("Category is required", 400);
    }

    const stock =
      typeof rawStock === "string" ? parseInt(rawStock, 10) : rawStock;
    if (
      typeof stock !== "number" ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      throw new ApiError("Quantity/stock must be a non-negative integer", 400);
    }

    if (
      images !== undefined &&
      (!Array.isArray(images) ||
        images.some((img) => typeof img !== "string"))
    ) {
      throw new ApiError("Images must be an array of URL strings", 400);
    }

    const connection = await getConnection();
    const productsCollection = connection.collection("products");

    const now = new Date().toISOString();
    const doc = {
      name: name.trim(),
      description,
      price,
      category,
      productType,
      brand,
      model,
      subCategory,
      quantity: stock,
      images: images ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await productsCollection.insertOne(doc);
    const inserted = await productsCollection.findOne({
      _id: result.insertedId,
    });

    return NextResponse.json(
      { success: true, data: transformProduct(inserted) },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
