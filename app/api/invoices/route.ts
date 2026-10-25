import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products, wallet, walletTransactions } from "../../lib/db";
import { and, eq, ilike, or, sql } from "drizzle-orm";

// GET endpoint to retrieve invoices with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Validate parameters
    if (page < 1) {
      return NextResponse.json(
        { error: "Page must be at least 1" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(invoices.customer, `%${search}%`),
          ilike(invoices.invoiceNumber, `%${search}%`),
          sql`${invoices.items}::text ILIKE ${'%' + search + '%'}`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination metadata
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count ?? 0);

    // Fetch paginated invoices
    const rows = await db
      .select()
      .from(invoices)
      .where(whereClause)
      .orderBy(sql`${invoices.createdAt} DESC`)
      .offset(skip)
      .limit(limit);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json(
      {
        data: rows,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, items, discount, paymentMethod, date, deposit, depositCurrency } = body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Customer and at least one item are required" },
        { status: 400 }
      );
    }

    // Calculate total amount
    let amount = 0;
    for (const item of items) {
      amount += (item.price || 0) * (item.quantity || 0);
    }
    const totalAmount = amount - (discount || 0);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;

    // Insert invoice
    const inserted = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        customer,
        items,
        amount: String(amount),
        discount: String(discount || 0),
        deposit: String(deposit || 0),
        depositCurrency: depositCurrency || "EGP",
        paymentMethod: paymentMethod || "cash",
        date: date || new Date().toISOString().slice(0, 10),
        totalAmount: String(totalAmount),
        status: "pending",
      })
      .returning();

    const invoice = inserted[0];

    // Decrement product quantities
    for (const item of items) {
      if (item.id && item.quantity) {
        await db
          .update(products)
          .set({
            quantity: sql`GREATEST(${products.quantity} - ${item.quantity}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.id));
      }
    }

    // If payment method is cash, add to wallet balance
    if (paymentMethod === "cash" && totalAmount > 0) {
      const currency = (depositCurrency || "EGP").toUpperCase();
      const balanceColumn =
        currency === "USD" ? wallet.balanceUsd :
        currency === "EUR" ? wallet.balanceEur :
        wallet.balanceEgp;

      // Ensure wallet row exists
      const walletRows = await db.select().from(wallet).where(eq(wallet.slug, "main"));
      let walletRow = walletRows[0];
      if (!walletRow) {
        const created = await db.insert(wallet).values({ slug: "main" }).returning();
        walletRow = created[0];
      }

      await db
        .update(wallet)
        .set({
          [currency === "USD" ? "balanceUsd" : currency === "EUR" ? "balanceEur" : "balanceEgp"]:
            sql`coalesce(${balanceColumn}, 0) + ${totalAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallet.id, walletRow.id));

      // Record wallet transaction
      await db.insert(walletTransactions).values({
        walletId: walletRow.id,
        type: "deposit",
        amount: String(totalAmount),
        currency,
        description: `Cash payment for invoice ${invoiceNumber}`,
        referenceId: invoice.id,
      });
    }

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        data: invoice,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update an invoice
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, items, discount, paymentMethod, status, deposit, depositCurrency } = body;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const existingRows = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    const existingInvoice = existingRows[0];

    if (!existingInvoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      );
    }

    const oldItems = (Array.isArray(existingInvoice.items) ? existingInvoice.items : []) as { id: string; quantity?: number; price?: number; name?: string }[];
    const newItems = items && Array.isArray(items) ? (items as { id: string; quantity?: number; price?: number; name?: string }[]) : oldItems;

    // Adjust stock for item changes
    // 1. Return stock for removed items
    for (const oldItem of oldItems) {
      const newItem = newItems.find((i) => i.id === oldItem.id);
      if (!newItem && oldItem.id) {
        // Item was removed — return stock
        await db
          .update(products)
          .set({
            quantity: sql`${products.quantity} + ${oldItem.quantity || 0}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, oldItem.id));

        try {
          const { logInventoryChange } = await import("../../lib/inventory-server");
          const prodRows = await db.select().from(products).where(eq(products.id, oldItem.id));
          await logInventoryChange({
            productId: oldItem.id,
            productName: prodRows[0]?.name || "Unknown product",
            changeAmount: oldItem.quantity || 0,
            newQuantity: prodRows[0]?.quantity || 0,
            reason: "Order Cancelled",
            referenceId: invoiceId,
            note: `Item removed from invoice ${existingInvoice.invoiceNumber}`,
          });
        } catch (logError) {
          console.error("Failed to log inventory change:", logError);
        }
      }
    }

    // 2. Adjust stock for changed quantities and new items
    for (const newItem of newItems) {
      const oldItem = oldItems.find((i) => i.id === newItem.id);
      if (!oldItem && newItem.id) {
        // New item added — deduct stock
        await db
          .update(products)
          .set({
            quantity: sql`GREATEST(${products.quantity} - ${newItem.quantity || 0}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, newItem.id));

        try {
          const { logInventoryChange } = await import("../../lib/inventory-server");
          const prodRows = await db.select().from(products).where(eq(products.id, newItem.id));
          await logInventoryChange({
            productId: newItem.id,
            productName: prodRows[0]?.name || newItem.name || "Unknown product",
            changeAmount: -(newItem.quantity || 0),
            newQuantity: prodRows[0]?.quantity || 0,
            reason: "Sale",
            referenceId: invoiceId,
            note: `Item added to invoice ${existingInvoice.invoiceNumber}`,
          });
        } catch (logError) {
          console.error("Failed to log inventory change:", logError);
        }
      } else if (oldItem && newItem.id && (newItem.quantity || 0) !== (oldItem.quantity || 0)) {
        // Quantity changed — adjust the difference
        const diff = (oldItem.quantity || 0) - (newItem.quantity || 0);
        await db
          .update(products)
          .set({
            quantity: sql`GREATEST(${products.quantity} + ${diff}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, newItem.id));

        try {
          const { logInventoryChange } = await import("../../lib/inventory-server");
          const prodRows = await db.select().from(products).where(eq(products.id, newItem.id));
          await logInventoryChange({
            productId: newItem.id,
            productName: prodRows[0]?.name || newItem.name || "Unknown product",
            changeAmount: diff,
            newQuantity: prodRows[0]?.quantity || 0,
            reason: diff > 0 ? "Return" : "Sale",
            referenceId: invoiceId,
            note: `Quantity changed from ${oldItem.quantity} to ${newItem.quantity} on invoice ${existingInvoice.invoiceNumber}`,
          });
        } catch (logError) {
          console.error("Failed to log inventory change:", logError);
        }
      }
    }

    // Recalculate totals
    let amount = 0;
    for (const item of newItems) {
      amount += (item.price || 0) * (item.quantity || 0);
    }
    const newDiscount = discount !== undefined ? discount : existingInvoice.discount;
    const totalAmount = amount - Number(newDiscount || 0);

    // Update invoice
    const updated = await db
      .update(invoices)
      .set({
        items: newItems,
        amount: String(amount),
        discount: String(newDiscount || 0),
        deposit: deposit !== undefined ? String(deposit) : existingInvoice.deposit,
        depositCurrency: depositCurrency || existingInvoice.depositCurrency,
        paymentMethod: paymentMethod || existingInvoice.paymentMethod,
        totalAmount: String(totalAmount),
        status: status || existingInvoice.status,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    // Wallet updates for paid status or additional deposits
    const currency = ((depositCurrency || existingInvoice.depositCurrency) || "EGP").toUpperCase();
    const additionalDeposit =
      deposit !== undefined ? Number(deposit) - Number(existingInvoice.deposit || 0) : 0;
    const shouldCreditWallet =
      status === "paid" || additionalDeposit > 0;

    if (shouldCreditWallet && totalAmount > 0) {
      const walletRows = await db.select().from(wallet).where(eq(wallet.slug, "main"));
      let walletRow = walletRows[0];
      if (!walletRow) {
        const created = await db.insert(wallet).values({ slug: "main" }).returning();
        walletRow = created[0];
      }

      const creditAmount = status === "paid" ? totalAmount : additionalDeposit;
      const balanceColumn =
        currency === "USD" ? wallet.balanceUsd :
        currency === "EUR" ? wallet.balanceEur :
        wallet.balanceEgp;

      await db
        .update(wallet)
        .set({
          [currency === "USD" ? "balanceUsd" : currency === "EUR" ? "balanceEur" : "balanceEgp"]:
            sql`coalesce(${balanceColumn}, 0) + ${creditAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallet.id, walletRow.id));

      await db.insert(walletTransactions).values({
        walletId: walletRow.id,
        type: "deposit",
        amount: String(creditAmount),
        currency,
        description: status === "paid"
          ? `Payment for invoice ${existingInvoice.invoiceNumber}`
          : `Additional deposit for invoice ${existingInvoice.invoiceNumber}`,
        referenceId: invoiceId,
      });
    }

    return NextResponse.json(
      {
        message: "Invoice updated successfully",
        data: updated[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
