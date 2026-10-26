import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { shipments, wallet, walletTransactions } from "../../lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";

// GET: Return all shipments
export async function GET() {
  try {
    const rows = await db.select().from(shipments).orderBy(desc(shipments.createdAt));

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

    const parsedCost = parseFloat(cost);

    // Ensure a wallet row exists
    let walletRow = (await db.select().from(wallet).limit(1))[0];
    if (!walletRow) {
      const inserted = await db
        .insert(wallet)
        .values({ balance: "0", currency: "EGP" })
        .returning();
      walletRow = inserted[0];
    }

    // Deduct from wallet (EGP)
    const updatedWallet = await db
      .update(wallet)
      .set({
        balance: sql`${wallet.balance} - ${parsedCost.toFixed(2)}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id))
      .returning();

    // Create shipment record
    const inserted = await db
      .insert(shipments)
      .values({
        address: destination.toLowerCase(),
        status: "pending",
        items: {
          cost: parsedCost,
          description: description || "",
          date: date || new Date().toISOString().split("T")[0],
        },
      })
      .returning();
    const shipmentRow = inserted[0];

    // Log wallet transaction
    const insertedTx = await db
      .insert(walletTransactions)
      .values({
        walletId: walletRow.id,
        type: "shipment",
        amount: (-parsedCost).toFixed(2),
        description: `Shipment to ${destination} — ${description || "No description"}`,
      })
      .returning();

    return NextResponse.json({
      message: "Shipment created successfully",
      data: {
        shipment: {
          ...shipmentRow,
          destination: destination.toLowerCase(),
          cost: parsedCost,
          description: description || "",
          date: date || new Date().toISOString().split("T")[0],
        },
        balanceEGP: parseFloat(updatedWallet[0]?.balance || "0"),
        transaction: insertedTx[0],
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
