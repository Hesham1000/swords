import { NextRequest, NextResponse } from "next/server";
import { getShipmentsCollection, getWalletCollection, getWalletTransactionsCollection } from "../../lib/mongoDB";

// GET: Return all shipments
export async function GET(request: NextRequest) {
  try {
    const shipmentsCollection = await getShipmentsCollection();
    const shipments = await shipmentsCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      message: "Shipments retrieved successfully",
      data: shipments,
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Create a shipment — deducts from wallet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, cost, description, date } = body;

    if (!destination || !["cairo", "alex"].includes(destination.toLowerCase())) {
      return NextResponse.json({ error: "Destination must be Cairo or Alex" }, { status: 400 });
    }

    if (!cost || cost <= 0) {
      return NextResponse.json({ error: "Cost must be greater than 0" }, { status: 400 });
    }

    const walletCollection = await getWalletCollection();
    const transactionsCollection = await getWalletTransactionsCollection();
    const shipmentsCollection = await getShipmentsCollection();

    // Deduct from wallet (EGP)
    await walletCollection.updateOne(
      { _id: "main" as any },
      { $inc: { balanceEGP: -parseFloat(cost) } },
      { upsert: true }
    );

    // Create shipment record
    const shipment = {
      destination: destination.toLowerCase(),
      cost: parseFloat(cost),
      description: description || "",
      date: date || new Date().toISOString().split("T")[0],
      createdAt: new Date(),
    };
    const result = await shipmentsCollection.insertOne(shipment);

    // Log wallet transaction
    const transaction = {
      type: "shipment",
      amount: -parseFloat(cost),
      currency: "EGP",
      note: `Shipment to ${destination} — ${description || "No description"}`,
      date: new Date(),
      createdAt: new Date(),
      referenceId: result.insertedId,
    };
    await transactionsCollection.insertOne(transaction);

    // Get updated balance
    const wallet = await walletCollection.findOne({ _id: "main" as any });

    return NextResponse.json({
      message: "Shipment created successfully",
      data: { shipment: { ...shipment, _id: result.insertedId }, balanceEGP: wallet?.balanceEGP || 0 },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
