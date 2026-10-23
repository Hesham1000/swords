import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { invoices, products, wallet, walletTransactions } from "../../lib/db/schema";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import ApiError from "../../utils/ApiError";

const MAIN_WALLET_ID = "00000000-0000-0000-0000-000000000000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let whereClause = undefined;
    if (searchVal) {
      whereClause = or(
        ilike(invoices.customer, `%${searchVal}%`),
        ilike(invoices.invoiceId, `%${searchVal}%`),
        sql`${invoices.items}::text ILIKE ${`%${searchVal}%`}`
      );
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(whereClause);
    const totalCount = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const rows = await db
      .select()
      .from(invoices)
      .where(whereClause)
      .orderBy(desc(invoices.createdAt))
      .offset(skip)
      .limit(limit);

    return NextResponse.json({
      message: "Invoices retrieved successfully",
      data: rows,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, amount, status, date, items, paymentMethod, discount } = body;

    // customer name not important according to user, but let's have a default
    const invoiceData = {
      invoiceId: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: customer || "General Customer",
      amount: String(parseFloat(amount) || 0),
      discount: String(parseFloat(discount) || 0),
      status: status || "pending",
      paymentMethod: paymentMethod || "cash",
      date: date || new Date().toISOString().split('T')[0],
      items: items || [],
      deposit: String(parseFloat(body.deposit) || 0),
      depositCurrency: body.depositCurrency || "EGP",
    };

    const [inserted] = await db.insert(invoices).values(invoiceData).returning();

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      const { logInventoryChange } = await import("../../lib/inventory-server");

      for (const item of items) {
        try {
          // Get current quantity first for logging
          const rows = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);
          const product = rows[0];

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
    const depositAmount = parseFloat(invoiceData.deposit) || 0;
    const finalAmount = isPaid ? parseFloat(invoiceData.amount) : depositAmount;

    if (invoiceData.paymentMethod === "cash" && finalAmount > 0) {
      try {
        // Add to wallet balance (EGP) - assuming EGP for now as per user request
        await db
          .insert(wallet)
          .values({ id: MAIN_WALLET_ID, balanceEGP: String(finalAmount), initialized: true })
          .onConflictDoUpdate({
            target: wallet.id,
            set: { balanceEGP: sql`${wallet.balanceEGP} + ${finalAmount}`, updatedAt: new Date() },
          });

        // Log wallet transaction
        await db.insert(walletTransactions).values({
          type: "invoice",
          amount: String(finalAmount),
          currency: "EGP",
          note: isPaid
            ? `Cash invoice ${invoiceData.invoiceId} (Full Payment) — ${invoiceData.customer}`
            : `Cash invoice ${invoiceData.invoiceId} (Deposit) — ${invoiceData.customer}`,
          date: new Date(),
          referenceId: inserted.id,
        });

        console.log(`💰 Wallet updated: +${finalAmount} EGP from invoice ${invoiceData.invoiceId}`);
      } catch (walletError) {
        console.error("❌ Failed to update wallet for cash invoice:", walletError);
      }
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      data: { ...invoiceData, _id: inserted.id, id: inserted.id }
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, customer, amount, discount, date, items, paymentMethod } = body;

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const invoiceRows = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    const invoice = invoiceRows[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const oldDeposit = parseFloat(invoice.deposit || "0") || 0;
    const additionalDeposit = parseFloat(body.deposit) || 0;

    // 1. STOCK ADJUSTMENT AND HISTORY LOGGING (if items changed)
    if (items && Array.isArray(items)) {
      const { logInventoryChange } = await import("../../lib/inventory-server");
      const oldItems = (invoice.items as Array<Record<string, unknown>>) || [];

      // Track which old items were processed
      const processedOldProductIds = new Set<string>();

      // Process new items (Updates and Additions)
      for (const newItem of items) {
        const oldItem = oldItems.find((oi) => oi.productId === newItem.productId);
        processedOldProductIds.add(newItem.productId);

        const oldQty = oldItem ? Number(oldItem.quantity) : 0;
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
            const productRows = await db
              .select()
              .from(products)
              .where(eq(products.id, newItem.productId))
              .limit(1);
            await logInventoryChange({
              productId: newItem.productId,
              productName: newItem.name,
              changeAmount: -netChange,
              newQuantity: productRows[0]?.quantity || 0,
              reason: priceChanged && netChange === 0 ? "Price Update" : "Sale",
              oldPrice: typeof oldPrice === "number" ? oldPrice : null,
              newPrice: typeof newItem.price === "number" ? newItem.price : null,
              referenceId: id,
              note: `Updated via invoice ${invoice.invoiceId}${priceChanged ? ' (Price change)' : ''}`,
            });
            console.log(`📝 Logged update for ${newItem.name}: Qty Δ ${-netChange}, Price Δ ${priceChanged}`);
          } catch (e) {
            console.error(`History log fail for ${newItem.name}:`, e);
          }
        }
      }

      // Process removed items (Deletions)
      for (const oldItem of oldItems) {
        if (!processedOldProductIds.has(String(oldItem.productId))) {
          try {
            // Revert stock
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} + ${Number(oldItem.quantity)}` })
              .where(eq(products.id, String(oldItem.productId)));

            // Log removal
            const productRows = await db
              .select()
              .from(products)
              .where(eq(products.id, String(oldItem.productId)))
              .limit(1);
            await logInventoryChange({
              productId: String(oldItem.productId),
              productName: String(oldItem.name ?? ""),
              changeAmount: Number(oldItem.quantity),
              newQuantity: productRows[0]?.quantity || 0,
              reason: "Order Cancelled",
              referenceId: id,
              note: `Item removed from invoice ${invoice.invoiceId}`,
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
    if (customer) updateData.customer = customer;
    if (amount !== undefined) updateData.amount = String(parseFloat(amount));
    if (discount !== undefined) updateData.discount = String(parseFloat(discount));
    if (date) updateData.date = date;
    if (items) updateData.items = items;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    if (additionalDeposit > 0) {
      updateData.deposit = String(oldDeposit + additionalDeposit);
    }
    if (status === "paid" || (!status && oldStatus === "paid")) {
      updateData.deposit = String(
        parseFloat(String(updateData.amount ?? invoice.amount ?? "0")) || 0
      );
    }

    await db.update(invoices).set(updateData).where(eq(invoices.id, id));

    // 3. WALLET UPDATE LOGIC (Cash only)
    const currentPaymentMethod = paymentMethod || invoice.paymentMethod;

    if (currentPaymentMethod === "cash") {
      // Case: Just marked as paid (add remaining balance)
      if (status === "paid" && oldStatus !== "paid") {
        const remainingBalance =
          (parseFloat(String(updateData.amount ?? invoice.amount ?? "0")) || 0) -
          (oldDeposit + additionalDeposit);
        if (remainingBalance > 0) {
          try {
            await db
              .insert(wallet)
              .values({ id: MAIN_WALLET_ID, balanceEGP: String(remainingBalance), initialized: true })
              .onConflictDoUpdate({
                target: wallet.id,
                set: { balanceEGP: sql`${wallet.balanceEGP} + ${remainingBalance}`, updatedAt: new Date() },
              });

            await db.insert(walletTransactions).values({
              type: "invoice",
              amount: String(remainingBalance),
              currency: "EGP",
              note: `Cash invoice ${invoice.invoiceId} (Final Balance) — ${String(updateData.customer ?? invoice.customer)}`,
              date: new Date(),
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
            .insert(wallet)
            .values({ id: MAIN_WALLET_ID, balanceEGP: String(additionalDeposit), initialized: true })
            .onConflictDoUpdate({
              target: wallet.id,
              set: { balanceEGP: sql`${wallet.balanceEGP} + ${additionalDeposit}`, updatedAt: new Date() },
            });

          await db.insert(walletTransactions).values({
            type: "invoice",
            amount: String(additionalDeposit),
            currency: "EGP",
            note: `Cash invoice ${invoice.invoiceId} (Additional Deposit) — ${String(updateData.customer ?? invoice.customer)}`,
            date: new Date(),
            referenceId: id,
          });
        } catch (walletError) {
          console.error("❌ Failed to update wallet for additional deposit:", walletError);
        }
      }
    }

    return NextResponse.json({
      message: "Invoice updated successfully",
      data: { id, ...updateData }
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
