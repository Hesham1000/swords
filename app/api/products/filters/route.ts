import { NextRequest, NextResponse } from "next/server";
import { getProductsCollection } from "../../../lib/mongoDB";

export async function GET(request: NextRequest) {
  try {
    const productsCollection = await getProductsCollection();

    const categoriesResult = await productsCollection
      .aggregate([{ $unwind: "$category" }, { $group: { _id: "$category" } }, { $sort: { _id: 1 } }])
      .toArray();
    const categories = categoriesResult.map((doc) => String(doc._id));

    const brandsResult = await productsCollection
      .aggregate([{ $group: { _id: "$brand" } }, { $sort: { _id: 1 } }])
      .toArray();
    const brands = brandsResult
      .filter((doc) => doc._id !== null && doc._id !== undefined)
      .map((doc) => String(doc._id));

    const typesResult = await productsCollection
      .aggregate([{ $group: { _id: "$productType" } }, { $sort: { _id: 1 } }])
      .toArray();
    const types = typesResult
      .filter((doc) => doc._id !== null && doc._id !== undefined)
      .map((doc) => String(doc._id));

    return NextResponse.json(
      { success: true, data: { categories, brands, types } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching product filters:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
