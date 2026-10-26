import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, invoices, products, wallet, walletTransactions } from "../../lib/db";
import { verifyAccessToken } from "../../lib/auth/token";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Map a Drizzle invoice row to the response shape the frontend expects
function mapInvoice(r: any) {
  return {
    id: r.id,
    invoiceId: r.invoiceNumber,
    customer: r.customerName,
    customerEmail: r.customerEmail,
    customerPhone: r.customerPhone,
    amount: parseFloat(r.totalAmount ?? 0),
    discount: parseFloat(r.discount ?? 0),
    status: r.status,
    paymentMethod: r.paymentMethod,
    date: r.date,
    items: r.items,
    deposit: parseFloat(r.deposit ?? 0),
    depositCurrency: r.depositCurrency,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// Get the current user's id from the access token cookie (may be null)
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get("access_token")?.value;
    if (!token) return null;
    const payload = await verifyAccessToken(token);
    if (payload && typeof payload === "object" && "userId" in payload) {
      const userId = (payload as any).userId;
      return typeof userId === "string" && UUID_REGEX.test(userId) ? userId : null;
    }
    return null;
  } catch {
    return null;
  }
}

// Find or create the wallet row for a user
async function getOrCreateWallet(userId: string) {
  const rows = await db.select().from(wallet).where(eq(wallet.userId, userId));
  if (rows.length > 0) return rows[0];
  const inserted = await db
    .insert(wallet)
    .values({ userId, balanceEGP: "0", balanceUSD: "0", balanceEUR: "0" })
    .returning();
  return inserted[0];
}

// Add an amount to the user's wallet balance and log a transaction
async function creditWallet(
  request: NextRequest,
  amount: number,
  note: string,
  referenceId: string
) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      console.error("No authenticated user; skipping wallet update");
      return;
    }
    const walletRow = await getOrCreateWallet(userId);

    await db
      .update(wallet)
      .set({
        balanceEGP: sql`${wallet.balanceEGP} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallet.id, walletRow.id));

    await db.insert(walletTransactions).values({
      walletId: walletRow.id,
      type: "invoice",
      amount: String(amount),
      currency: "EGP",
      description: note,
      referenceId,
    });
  } catch (walletError) {
    console.error("❌ Failed to update wallet:", walletError);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let where = undefined;
    if (searchVal) {
      where = or(
        ilike(invoices.customerName, `%${searchVal}%`),
        ilike(invoices.invoiceNumber, `%${searchVal}%`),
        sql`${invoices.items}::text ILIKE ${`%${searchVal}%`}`
      );
    }

    const countRows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .where(where);
    const totalCount = Number(countRows[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    const rows = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(skip);

    return NextResponse.json({
      message: "Invoices retrieved successfully",
      data: rows.map(mapInvoice),
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
    const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceData = {
      invoiceNumber,
      customerName: customer || "General Customer",
      totalAmount: String(parseFloat(amount) || 0),
      discount: String(parseFloat(discount) || 0),
      status: status || "pending",
      paymentMethod: paymentMethod || "cash",
      date: date || new Date().toISOString().split('T')[0],
      items: items || [],
      deposit: String(parseFloat(body.deposit) || 0),
      depositCurrency: body.depositCurrency || "EGP",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await db.insert(invoices).values(invoiceData).returning();
    const invoiceRow = inserted[0];

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      const { logInventoryChange } = await import("../../lib/inventory-server");

      for (const item of items) {
        try {
          // Get current quantity first for logging
          const productRows = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));
          const product = productRows[0];
          const newQty = (product?.quantity || 0) - item.quantity;

          await db
            .update(products)
            .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
            .where(eq(products.id, item.productId));

          await logInventoryChange({
            productId: item.productId,
            productName: item.name,
            changeAmount: -item.quantity,
            newQuantity: newQty,
            reason: "Sale",
            referenceId: invoiceRow.id,
            note: `Sold via invoice ${invoiceNumber}`,
          });

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
    const finalAmount = isPaid ? parseFloat(invoiceData.totalAmount) : depositAmount;

    if (invoiceData.paymentMethod === "cash" && finalAmount > 0) {
      await creditWallet(
        request,
        finalAmount,
        isPaid
          ? `Cash invoice ${invoiceNumber} (Full Payment) — ${invoiceData.customerName}`
          : `Cash invoice ${invoiceNumber} (Deposit) — ${invoiceData.customerName}`,
        invoiceRow.id
      );
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      data: mapInvoice(invoiceRow)
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

    const existingRows = await db.select().from(invoices).where(eq(invoices.id, id));
    const invoice = existingRows[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const oldDeposit = parseFloat(String(invoice.deposit ?? 0));
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
            const productRows = await db
              .select()
              .from(products)
              .where(eq(products.id, newItem.productId));
            await logInventoryChange({
              productId: newItem.productId,
              productName: newItem.name,
              changeAmount: -netChange,
              newQuantity: productRows[0]?.quantity || 0,
              reason: priceChanged && netChange === 0 ? "Price Update" : "Sale",
              oldPrice: oldPrice,
              newPrice: newItem.price,
              referenceId: id,
              note: `Updated via invoice ${invoice.invoiceNumber}${priceChanged ? ' (Price change)' : ''}`
            });
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
            const productRows = await db
              .select()
              .from(products)
              .where(eq(products.id, oldItem.productId));
            await logInventoryChange({
              productId: oldItem.productId,
              productName: oldItem.name,
              changeAmount: oldItem.quantity,
              newQuantity: productRows[0]?.quantity || 0,
              reason: "Order Cancelled",
              referenceId: id,
              note: `Item removed from invoice ${invoice.invoiceNumber}`
            });
          } catch (e) {
            console.error(`Stock revert/log fail for removed item ${oldItem.name}:`, e);
          }
        }
      }
    }

    // 2. PREPARE UPDATE DATA
    const updateData: any = {};
    if (status) updateData.status = status;
    if (customer) updateData.customerName = customer;
    if (amount !== undefined) updateData.totalAmount = String(parseFloat(amount));
    if (discount !== undefined) updateData.discount = String(parseFloat(discount));
    if (date) updateData.date = date;
    if (items) updateData.items = items;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;
    updateData.updatedAt = new Date();

    if (additionalDeposit > 0) {
      updateData.deposit = String(oldDeposit + additionalDeposit);
    }
    if (status === "paid" || (!status && oldStatus === "paid")) {
      updateData.deposit = String(updateData.totalAmount ?? invoice.totalAmount);
    }

    await db.update(invoices).set(updateData).where(eq(invoices.id, id));

    // 3. WALLET UPDATE LOGIC (Cash only)
    const currentPaymentMethod = paymentMethod || invoice.paymentMethod;

    if (currentPaymentMethod === "cash") {
      // Case: Just marked as paid (add remaining balance)
      if (status === "paid" && oldStatus !== "paid") {
        const remainingBalance =
          parseFloat(updateData.totalAmount ?? invoice.totalAmount) -
          (oldDeposit + additionalDeposit);
        if (remainingBalance > 0) {
          await creditWallet(
            request,
            remainingBalance,
            `Cash invoice ${invoice.invoiceNumber} (Final Balance) — ${updateData.customerName || invoice.customerName}`,
            id
          );
        }
      }

      // Case: Additional deposit added
      if (additionalDeposit > 0) {
        await creditWallet(
          request,
          additionalDeposit,
          `Cash invoice ${invoice.invoiceNumber} (Additional Deposit) — ${updateData.customerName || invoice.customerName}`,
          id
        );
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
