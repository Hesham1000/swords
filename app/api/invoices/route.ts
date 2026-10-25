import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "../../lib/db";
import { invoices, products } from "../../lib/db/schema";
import { ilike, or, sql, desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where = searchVal
      ? or(
          ilike(invoices.customerName, `%${searchVal}%`),
          ilike(invoices.invoiceNumber, `%${searchVal}%`)
        )
      : undefined;

    const countRows = await db
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(invoices)
      .where(where);
    const totalCount = countRows[0]?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    const rows = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(skip);

    // numeric columns come back as strings — convert to numbers
    const data = rows.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
    }));

    return NextResponse.json(
      {
        message: "Invoices retrieved successfully",
        data,
        pagination: {
          page,
          limit,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, amount, status, items, paymentMethod, discount } = body;

    const invoiceData = {
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customer || "General Customer",
      totalAmount: String(parseFloat(amount) || 0),
      status: status || "pending",
      items: items || [],
      notes: paymentMethod ? `paymentMethod: ${paymentMethod}` : null,
    };

    const inserted = await db.insert(invoices).values(invoiceData).returning();
    const created = inserted[0];

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      for (const item of items) {
        try {
          await db
            .update(products)
            .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
            .where(eq(products.id, item.productId));
          console.log(`✅ Stocks updated for product: ${item.name} (-${item.quantity})`);
        } catch (updateError) {
          console.error(`❌ Failed to update stock for product ${item.productId}:`, updateError);
          // We continue with other items even if one fails
        }
      }
    }

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        data: {
          ...invoiceData,
          totalAmount: Number(created.totalAmount),
          id: created.id,
          createdAt: created.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, customer, amount, discount, items, paymentMethod } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existingRows = await db.select().from(invoices).where(eq(invoices.id, id));
    const invoice = existingRows[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;

    // 1. STOCK ADJUSTMENT (if items changed)
    if (items && Array.isArray(items)) {
      const oldItems = (invoice.items as any[]) || [];
      const processedOldProductIds = new Set<string>();

      for (const newItem of items) {
        const oldItem = oldItems.find((oi: any) => oi.productId === newItem.productId);
        processedOldProductIds.add(newItem.productId);
        const oldQty = oldItem ? oldItem.quantity : 0;
        const netChange = newItem.quantity - oldQty;

        if (netChange !== 0) {
          try {
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} - ${netChange}` })
              .where(eq(products.id, newItem.productId));
          } catch (e) {
            console.error(`Stock update fail for ${newItem.name}:`, e);
          }
        }
      }

      for (const oldItem of oldItems) {
        if (!processedOldProductIds.has(oldItem.productId)) {
          try {
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} + ${oldItem.quantity}` })
              .where(eq(products.id, oldItem.productId));
          } catch (e) {
            console.error(`Stock revert fail for removed item:`, e);
          }
        }
      }
    }

    // 2. PREPARE UPDATE DATA
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (customer) updateData.customerName = customer;
    if (amount !== undefined) updateData.totalAmount = String(parseFloat(amount));
    if (items) updateData.items = items;
    if (paymentMethod) updateData.notes = `paymentMethod: ${paymentMethod}`;

    await db.update(invoices).set(updateData).where(eq(invoices.id, id));

    return NextResponse.json(
      {
        message: "Invoice updated successfully",
        data: { id, ...updateData },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
