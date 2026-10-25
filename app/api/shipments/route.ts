import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../lib/db";
import { shipments, wallet, walletTransactions } from "../../lib/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";

// GET: Return all shipments (paginated, with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");
    const city = searchParams.get("city") || searchParams.get("destination");

    const conditions = [];
    if (status) conditions.push(eq(shipments.status, status));
    if (city) conditions.push(eq(shipments.city, city.toLowerCase()));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const countRows = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(shipments)
      .where(where);
    const totalCount = countRows[0]?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    const rows = await db
      .select()
      .from(shipments)
      .where(where)
      .orderBy(desc(shipments.createdAt))
      .limit(limit)
      .offset(skip);

    return NextResponse.json({
      message: "Shipments retrieved successfully",
      data: rows,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
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
    const { destination, cost, description, date, customerName, address, invoiceId } = body;

    if (!destination || !["cairo", "alex"].includes(destination.toLowerCase())) {
      return NextResponse.json({ error: "Destination must be Cairo or Alex" }, { status: 400 });
    }

    if (!cost || cost <= 0) {
      return NextResponse.json({ error: "Cost must be greater than 0" }, { status: 400 });
    }

    const userId = request.headers.get("x-user-id") || request.cookies.get("access_token")?.value;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Deduct from wallet (EGP)
    const existing = await db.select().from(wallet).where(eq(wallet.userId, userId));
    if (existing.length === 0) {
      await db.insert(wallet).values({ userId, balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" });
    }
    await db
      .update(wallet)
      .set({ balanceEGP: sql`${wallet.balanceEGP} - ${parseFloat(cost)}`, updatedAt: new Date() })
      .where(eq(wallet.userId, userId));

    // Create shipment record
    const inserted = await db
      .insert(shipments)
      .values({
        customerName: customerName || "General Customer",
        address: address || destination,
        city: destination.toLowerCase(),
        notes: description || "",
        invoiceId: invoiceId || null,
      })
      .returning();
    const shipment = inserted[0];

    // Log wallet transaction
    const insertedTx = await db
      .insert(walletTransactions)
      .values({
        userId,
        type: "shipment",
        amount: String(-parseFloat(cost)),
        currency: "EGP",
        description: `Shipment to ${destination} — ${description || "No description"}`,
        referenceId: shipment.id,
      })
      .returning();

    // Get updated balance
    const updated = (await db.select().from(wallet).where(eq(wallet.userId, userId)))[0];

    return NextResponse.json({
      message: "Shipment created successfully",
      data: {
        shipment: {
          ...shipment,
          destination: shipment.city,
          cost: parseFloat(cost),
          date: date || shipment.createdAt,
        },
        balanceEGP: Number(updated?.balanceEGP ?? 0),
        transaction: { ...insertedTx[0], amount: Number(insertedTx[0].amount) },
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
