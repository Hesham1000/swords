import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { shipments, wallet, walletTransactions } from "../../lib/schema";
import { desc, eq, sql } from "drizzle-orm";

// Main EGP wallet row (userId null, currency EGP)
async function getOrCreateMainWallet() {
  const existing = await db
    .select()
    .from(wallet)
    .where(sql`${wallet.userId} is null and ${wallet.currency} = 'EGP'`)
    .limit(1);
  if (existing.length > 0) return existing[0];
  const inserted = await db
    .insert(wallet)
    .values({ userId: null, balance: "0", currency: "EGP" })
    .returning();
  return inserted[0];
}

// GET: Return all shipments
export async function GET(request: NextRequest) {
  try {
    const rows = await db
      .select()
      .from(shipments)
      .orderBy(desc(shipments.createdAt));

    return NextResponse.json({
      message: "Shipments retrieved successfully",
      data: rows,
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

    // Deduct from wallet (EGP)
    const walletRow = await getOrCreateMainWallet();
    await db
      .update(wallet)
      .set({ balance: sql`${wallet.balance} - ${parseFloat(cost)}` })
      .where(eq(wallet.id, walletRow.id));

    // Create shipment record
    const insertedRows = await db
      .insert(shipments)
      .values({
        destination: destination.toLowerCase(),
        cost: String(parseFloat(cost)),
        description: description || "",
        date: date || new Date().toISOString().split("T")[0],
      })
      .returning();
    const insertedShipment = insertedRows[0];

    // Log wallet transaction
    await db.insert(walletTransactions).values({
      walletId: walletRow.id,
      type: "shipment",
      amount: String(-parseFloat(cost)),
      description: `Shipment to ${destination} — ${description || "No description"}`,
    });

    // Get updated balance
    const updatedWallet = (await db.select().from(wallet).where(eq(wallet.id, walletRow.id)))[0];

    return NextResponse.json({
      message: "Shipment created successfully",
      data: {
        shipment: { ...insertedShipment, _id: insertedShipment.id },
        balanceEGP: parseFloat(updatedWallet?.balance || "0") || 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
