import { NextRequest, NextResponse } from "next/server";
import { query } from "../../lib/db";

// GET: Return all shipments
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      `SELECT id, invoice_id AS "invoiceId", tracking_number AS "trackingNumber",
              carrier, status, address, destination, cost, description, date,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM shipments
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      message: "Shipments retrieved successfully",
      data: result.rows,
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
    await query(
      `INSERT INTO wallet (id, balance_egp, initialized) VALUES ('main', -$1, true)
       ON CONFLICT (id) DO UPDATE SET balance_egp = wallet.balance_egp - $1, updated_at = now()`,
      [parsedCost]
    );

    // Create shipment record
    const shipment = {
      destination: destination.toLowerCase(),
      cost: parsedCost,
      description: description || "",
      date: date || new Date().toISOString().split("T")[0],
      createdAt: new Date(),
    };
    const result = await query<{ id: string }>(
      `INSERT INTO shipments (destination, cost, description, date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, now(), now())
       RETURNING id`,
      [shipment.destination, shipment.cost, shipment.description, shipment.date]
    );
    const insertedId = result.rows[0].id;

    // Log wallet transaction
    await query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, currency, note, date, reference_id, created_at)
       VALUES ('main', 'shipment', $1, 'EGP', $2, now(), $3, now())`,
      [
        -parsedCost,
        `Shipment to ${destination} — ${description || "No description"}`,
        insertedId,
      ]
    );

    // Get updated balance
    const walletResult = await query<{ balance_egp: string }>(
      `SELECT balance_egp FROM wallet WHERE id = 'main'`
    );

    return NextResponse.json({
      message: "Shipment created successfully",
      data: {
        shipment: { ...shipment, _id: insertedId, id: insertedId },
        balanceEGP: parseFloat(walletResult.rows[0]?.balance_egp || "0"),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
