import { NextRequest, NextResponse } from "next/server";
import { db, shipments, wallet, walletTransactions, users } from "../../lib/db";
import { eq, desc, sql } from "drizzle-orm";

// The Drizzle shipments table has no destination/cost/description columns, so
// the shipment payload is stored as a JSON string in tracking_number:
// { destination, cost, description }. GET parses it back into the legacy shape.

interface ShipmentPayload {
  destination: string;
  cost: number;
  description: string;
}

function parsePayload(raw: string | null): ShipmentPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "destination" in parsed) {
      return parsed as ShipmentPayload;
    }
  } catch {
    // Not JSON — fall through
  }
  return null;
}

async function getMainWallet() {
  let [mainWallet] = await db.select().from(wallet).orderBy(wallet.updatedAt).limit(1);
  if (!mainWallet) {
    const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
    if (firstUser) {
      [mainWallet] = await db
        .insert(wallet)
        .values({ userId: firstUser.id, balance: "0" })
        .returning();
    }
  }
  return mainWallet ?? null;
}

// GET: Return all shipments
export async function GET(request: NextRequest) {
  try {
    const rows = await db.select().from(shipments).orderBy(desc(shipments.createdAt));

    // Map Drizzle rows back to the legacy response shape
    const data = rows.map((row) => {
      const payload = parsePayload(row.trackingNumber);
      return {
        _id: row.id,
        destination: payload?.destination ?? row.status ?? "pending",
        cost: payload?.cost ?? 0,
        description: payload?.description ?? row.trackingNumber ?? "",
        date: row.createdAt?.toISOString().split("T")[0],
        createdAt: row.createdAt,
      };
    });

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

    const parsedCost = parseFloat(cost);

    // Deduct from wallet (EGP)
    const mainWallet = await getMainWallet();
    if (mainWallet) {
      await db
        .update(wallet)
        .set({ balance: sql`${wallet.balance} - ${parsedCost}`, updatedAt: new Date() })
        .where(eq(wallet.id, mainWallet.id));
    }

    // Create shipment record (payload stored as JSON in tracking_number)
    const payload: ShipmentPayload = {
      destination: destination.toLowerCase(),
      cost: parsedCost,
      description: description || "",
    };
    const [inserted] = await db
      .insert(shipments)
      .values({
        quantity: 1,
        status: destination.toLowerCase(),
        trackingNumber: JSON.stringify(payload),
      })
      .returning();

    // Log wallet transaction
    if (mainWallet) {
      await db.insert(walletTransactions).values({
        walletId: mainWallet.id,
        type: "shipment",
        amount: (-parsedCost).toFixed(2),
        description: `Shipment to ${destination} — ${description || "No description"} [EGP]`,
      });
    }

    // Get updated balance
    let balanceEGP = 0;
    if (mainWallet) {
      const [updated] = await db.select().from(wallet).where(eq(wallet.id, mainWallet.id)).limit(1);
      balanceEGP = parseFloat(updated?.balance || "0") || 0;
    }

    return NextResponse.json({
      message: "Shipment created successfully",
      data: {
        shipment: {
          _id: inserted.id,
          destination: payload.destination,
          cost: payload.cost,
          description: payload.description,
          date: date || inserted.createdAt?.toISOString().split("T")[0],
          createdAt: inserted.createdAt,
        },
        balanceEGP,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
