import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { shipments, wallet, walletTransactions } from "../../lib/db/schema";
import { desc, eq } from "drizzle-orm";

async function getOrCreateWallet() {
  let [w] = await db.select().from(wallet).limit(1);
  if (!w) {
    const [created] = await db
      .insert(wallet)
      .values({ balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" })
      .returning();
    w = created;
  }
  return w;
}

// GET: Return all shipments
export async function GET() {
  try {
    const data = await db.select().from(shipments).orderBy(desc(shipments.createdAt));

    return NextResponse.json({
      message: "Shipments retrieved successfully",
      data,
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

    const w = await getOrCreateWallet();

    const parsedCost = parseFloat(cost);

    // Deduct from wallet (EGP)
    await db
      .update(wallet)
      .set({
        balanceEGP: String(parseFloat(w.balanceEGP || "0") - parsedCost),
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, w.id));

    // Create shipment record
    const [createdShipment] = await db
      .insert(shipments)
      .values({
        destination: destination.toLowerCase(),
        cost: String(parsedCost),
        description: description || "",
        date: date || new Date().toISOString().split("T")[0],
      })
      .returning();

    // Log wallet transaction
    await db.insert(walletTransactions).values({
      walletId: w.id,
      type: "shipment",
      amount: String(-parsedCost),
      currency: "EGP",
      description: `Shipment to ${destination} — ${description || "No description"}`,
      referenceId: createdShipment.id,
    });

    return NextResponse.json({
      message: "Shipment created successfully",
      data: { shipment: createdShipment, balanceEGP: parseFloat(w.balanceEGP || "0") - parsedCost },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
