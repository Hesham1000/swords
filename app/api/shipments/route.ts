import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, shipments, wallet, walletTransactions } from "../../lib/db";
import { verifyAccessToken } from "../../lib/auth/token";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    if (payload && typeof payload === "object" && "userId" in payload) {
      const userId = (payload as { userId?: unknown }).userId;
      return typeof userId === "string" && UUID_REGEX.test(userId) ? userId : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function getOrCreateWallet(userId: string) {
  const rows = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (rows.length > 0) return rows[0];
  const inserted = await db
    .insert(wallet)
    .values({ userId, balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" })
    .returning();
  return inserted[0];
}

function mapShipment(s: typeof shipments.$inferSelect) {
  return {
    id: s.id,
    invoiceId: s.invoiceId,
    customerName: s.customerName,
    address: s.address,
    city: s.city,
    destination: s.destination,
    cost: parseFloat(String(s.cost ?? 0)),
    description: s.description,
    date: s.date,
    trackingNumber: s.trackingNumber,
    status: s.status,
    notes: s.notes,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
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
      data: rows.map(mapShipment),
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

    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const walletRow = await getOrCreateWallet(userId);

    // Deduct from wallet (EGP)
    const updated = await db
      .update(wallet)
      .set({
        balanceEGP: sql`${wallet.balanceEGP} - ${parseFloat(cost)}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id))
      .returning();

    // Create shipment record
    const inserted = await db
      .insert(shipments)
      .values({
        destination: destination.toLowerCase(),
        cost: String(parseFloat(cost)),
        description: description || "",
        date: date || new Date().toISOString().split("T")[0],
      })
      .returning();
    const shipmentRow = inserted[0];

    // Log wallet transaction
    await db.insert(walletTransactions).values({
      walletId: walletRow.id,
      type: "shipment",
      amount: String(-parseFloat(cost)),
      currency: "EGP",
      description: `Shipment to ${destination} — ${description || "No description"}`,
      referenceId: shipmentRow.id,
    });

    return NextResponse.json({
      message: "Shipment created successfully",
      data: {
        shipment: mapShipment(shipmentRow),
        balanceEGP: parseFloat(String(updated[0]?.balanceEGP ?? 0)),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
