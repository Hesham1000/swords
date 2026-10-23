import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { wallet, walletTransactions, shipments } from "../../lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

const MAIN_WALLET_ID = "00000000-0000-0000-0000-000000000000";

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
    await db
      .insert(wallet)
      .values({ id: MAIN_WALLET_ID, initialized: true })
      .onConflictDoUpdate({
        target: wallet.id,
        set: { balanceEGP: sql`${wallet.balanceEGP} - ${parseFloat(cost)}`, updatedAt: new Date() },
      });

    // Create shipment record
    const [inserted] = await db
      .insert(shipments)
      .values({
        destination: destination.toLowerCase(),
        cost: String(parseFloat(cost)),
        description: description || "",
        date: date || new Date().toISOString().split("T")[0],
      })
      .returning();

    // Log wallet transaction
    await db.insert(walletTransactions).values({
      type: "shipment",
      amount: String(-parseFloat(cost)),
      currency: "EGP",
      note: `Shipment to ${destination} — ${description || "No description"}`,
      date: new Date(),
      referenceId: inserted.id,
    });

    // Get updated balance
    const updatedRows = await db.select().from(wallet).where(eq(wallet.id, MAIN_WALLET_ID)).limit(1);
    const walletRow = updatedRows[0];

    return NextResponse.json({
      message: "Shipment created successfully",
      data: { shipment: inserted, balanceEGP: parseFloat(walletRow?.balanceEGP || "0") || 0 },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
