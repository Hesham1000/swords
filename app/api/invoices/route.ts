import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { products, invoices, wallet, walletTransactions } from "../../lib/db/schema";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getOrCreateWallet() {
  let [w] = await db.select().from(wallet).limit(1);
  if (!w) {
    const [created] = await db
      .insert(wallet)
      .values({ balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" })
      .returning();
    w = created;
  }
  return w;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let where;
    if (searchVal) {
      where = or(
        ilike(invoices.customerName, `%${searchVal}%`),
        ilike(invoices.invoiceNumber, `%${searchVal}%`),
        sql`${invoices.items}::text ILIKE ${"%" + searchVal + "%"}`
      );
    }

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(where);

    const totalPages = Math.ceil(totalCount / limit);

    const data = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .offset(skip)
      .limit(limit);

    return NextResponse.json({
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
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, amount, status, items, paymentMethod, notes } = body;

    const invoiceData = {
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customer || "General Customer",
      totalAmount: String(parseFloat(amount) || 0),
      status: status || "pending",
      items: items || [],
      currency: "EGP",
      notes: notes ?? null,
    };

    const [createdInvoice] = await db.insert(invoices).values(invoiceData).returning();

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      const { logInventoryChange } = await import("../../lib/inventory-server");

      for (const item of items) {
        try {
          // Get current quantity first for logging
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));

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

    // If payment method is CASH and there's a deposit (or full payment), add to wallet
    const isPaid = invoiceData.status === "paid";
    const depositAmount = parseFloat(body.deposit) || 0;
    const finalAmount = isPaid ? parseFloat(amount) || 0 : depositAmount;

    if (paymentMethod === "cash" && finalAmount > 0) {
      try {
        const w = await getOrCreateWallet();

        // Add to wallet balance (EGP)
        await db
          .update(wallet)
          .set({
            balanceEGP: String(parseFloat(w.balanceEGP || "0") + finalAmount),
            updatedAt: new Date(),
          })
          .where(eq(wallet.id, w.id));

        // Log wallet transaction
        await db.insert(walletTransactions).values({
          walletId: w.id,
          type: "invoice",
          amount: String(finalAmount),
          currency: "EGP",
          description: isPaid
            ? `Cash invoice ${createdInvoice.invoiceNumber} (Full Payment) — ${createdInvoice.customerName}`
            : `Cash invoice ${createdInvoice.invoiceNumber} (Deposit) — ${createdInvoice.customerName}`,
          referenceId: createdInvoice.id,
        });

        console.log(`💰 Wallet updated: +${finalAmount} EGP from invoice ${createdInvoice.invoiceNumber}`);
      } catch (walletError) {
        console.error("❌ Failed to update wallet for cash invoice:", walletError);
      }
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      data: createdInvoice,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, customer, amount, items, paymentMethod } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const additionalDeposit = parseFloat(body.deposit) || 0;

    // 1. STOCK ADJUSTMENT AND HISTORY LOGGING (if items changed)
    if (items && Array.isArray(items)) {
      const { logInventoryChange } = await import("../../lib/inventory-server");
      const oldItems = (invoice.items as any[]) || [];

      // Track which old items were processed
      const processedOldProductIds = new Set<string>();

      // Process new items (Updates and Additions)
      for (const newItem of items) {
        const oldItem = oldItems.find((oi: any) => oi.productId === newItem.productId);
        processedOldProductIds.add(newItem.productId);

        const oldQty = oldItem ? oldItem.quantity : 0;
        const netChange = newItem.quantity - oldQty;
        const oldPrice = oldItem ? oldItem.price : null;
        const priceChanged = oldPrice !== newItem.price;

        if (netChange !== 0) {
          // Adjust stock
          try {
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} - ${netChange}` })
              .where(eq(products.id, newItem.productId));
          } catch (e) {
            console.error(`Stock update fail for ${newItem.name}:`, e);
          }
        }

        // ONLY LOG IF PRICE OR QUANTITY CHANGED
        if (netChange !== 0 || priceChanged) {
          try {
            const [product] = await db
              .select()
              .from(products)
              .where(eq(products.id, newItem.productId));
            await logInventoryChange({
              productId: newItem.productId,
              productName: newItem.name,
              changeAmount: -netChange,
              newQuantity: product?.quantity || 0,
              reason: priceChanged && netChange === 0 ? "Price Update" : "Sale",
              oldPrice: oldPrice,
              newPrice: newItem.price,
              referenceId: id,
              note: `Updated via invoice ${invoice.invoiceNumber}${priceChanged ? " (Price change)" : ""}`,
            });
            console.log(`📝 Logged update for ${newItem.name}: Qty Δ ${-netChange}, Price Δ ${priceChanged}`);
          } catch (e) {
            console.error(`History log fail for ${newItem.name}:`, e);
          }
        }
      }

      // Process removed items (Deletions)
      for (const oldItem of oldItems) {
        if (!processedOldProductIds.has(oldItem.productId)) {
          try {
            // Revert stock
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} + ${oldItem.quantity}` })
              .where(eq(products.id, oldItem.productId));

            // Log removal
            const [product] = await db
              .select()
              .from(products)
              .where(eq(products.id, oldItem.productId));
            await logInventoryChange({
              productId: oldItem.productId,
              productName: oldItem.name,
              changeAmount: oldItem.quantity,
              newQuantity: product?.quantity || 0,
              reason: "Order Cancelled",
              referenceId: id,
              note: `Item removed from invoice ${invoice.invoiceNumber}`,
            });
            console.log(`📝 Logged removal for ${oldItem.name}`);
          } catch (e) {
            console.error(`Stock revert/log fail for removed item ${oldItem.name}:`, e);
          }
        }
      }
    }

    // 2. PREPARE UPDATE DATA
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (customer) updateData.customerName = customer;
    if (amount !== undefined) updateData.totalAmount = String(parseFloat(amount) || 0);
    if (items) updateData.items = items;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const result = await db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();

    // 3. WALLET UPDATE LOGIC (Cash only)
    const currentPaymentMethod = paymentMethod || "cash";

    if (currentPaymentMethod === "cash") {
      const w = await getOrCreateWallet();
      const currentBalance = parseFloat(w.balanceEGP || "0");

      // Case: Just marked as paid (add remaining balance)
      if (status === "paid" && oldStatus !== "paid") {
        const totalAmount = parseFloat(String(updateData.totalAmount ?? invoice.totalAmount)) || 0;
        const remainingBalance = totalAmount - additionalDeposit;
        if (remainingBalance > 0) {
          try {
            await db
              .update(wallet)
              .set({ balanceEGP: String(currentBalance + remainingBalance), updatedAt: new Date() })
              .where(eq(wallet.id, w.id));

            await db.insert(walletTransactions).values({
              walletId: w.id,
              type: "invoice",
              amount: String(remainingBalance),
              currency: "EGP",
              description: `Cash invoice ${invoice.invoiceNumber} (Final Balance) — ${customer || invoice.customerName}`,
              referenceId: id,
            });
          } catch (walletError) {
            console.error("❌ Failed to update wallet for final balance:", walletError);
          }
        }
      }

      // Case: Additional deposit added
      if (additionalDeposit > 0) {
        try {
          await db
            .update(wallet)
            .set({ balanceEGP: String(currentBalance + additionalDeposit), updatedAt: new Date() })
            .where(eq(wallet.id, w.id));

          await db.insert(walletTransactions).values({
            walletId: w.id,
            type: "invoice",
            amount: String(additionalDeposit),
            currency: "EGP",
            description: `Cash invoice ${invoice.invoiceNumber} (Additional Deposit) — ${customer || invoice.customerName}`,
            referenceId: id,
          });
        } catch (walletError) {
          console.error("❌ Failed to update wallet for additional deposit:", walletError);
        }
      }
    }

    return NextResponse.json({
      message: "Invoice updated successfully",
      data: { id, ...updateData },
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
