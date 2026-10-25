import { NextRequest, NextResponse } from "next/server";
import { db, shipments, wallet, walletTransactions } from "../../lib/db";
import { eq, sql } from "drizzle-orm";

// GET endpoint to retrieve all shipments
export async function GET(_request: NextRequest) {
  try {
    const rows = await db
      .select()
      .from(shipments)
      .orderBy(sql`${shipments.createdAt} DESC`);

    return NextResponse.json(
      { success: true, data: rows },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new shipment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, cost, description, date } = body;

    if (!destination || !cost) {
      return NextResponse.json(
        { error: "Destination and cost are required" },
        { status: 400 }
      );
    }

    // Validate destination
    const validDestinations = ["cairo", "alex"];
    if (!validDestinations.includes(destination.toLowerCase())) {
      return NextResponse.json(
        { error: "Destination must be Cairo or Alex" },
        { status: 400 }
      );
    }

    const numCost = Number(cost);
    if (isNaN(numCost) || numCost <= 0) {
      return NextResponse.json(
        { error: "Cost must be a positive number" },
        { status: 400 }
      );
    }

    // Ensure wallet row exists
    const walletRows = await db.select().from(wallet).where(eq(wallet.slug, "main"));
    let walletRow = walletRows[0];
    if (!walletRow) {
      const created = await db.insert(wallet).values({ slug: "main" }).returning();
      walletRow = created[0];
    }

    // Check sufficient EGP balance
    const currentBalance = Number(walletRow.balanceEgp || 0);
    if (currentBalance < numCost) {
      return NextResponse.json(
        { error: "Insufficient EGP balance for shipment cost" },
        { status: 400 }
      );
    }

    // Deduct from wallet
    const updated = await db
      .update(wallet)
      .set({
        balanceEgp: sql`coalesce(${wallet.balanceEgp}, 0) - ${numCost}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id))
      .returning();

    // Insert shipment
    const inserted = await db
      .insert(shipments)
      .values({
        destination: destination.toLowerCase(),
        cost: String(numCost),
        description: description || "",
        date: date || new Date().toISOString().slice(0, 10),
        status: "pending",
      })
      .returning();

    // Record wallet transaction
    await db.insert(walletTransactions).values({
      walletId: walletRow.id,
      type: "withdraw",
      amount: String(numCost),
      currency: "EGP",
      description: `Shipment to ${destination.toLowerCase()}${description ? `: ${description}` : ""}`,
      referenceId: inserted[0].id,
    });

    return NextResponse.json(
      {
        message: "Shipment created successfully",
        data: inserted[0],
        balanceEGP: Number(updated[0].balanceEgp || 0),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
