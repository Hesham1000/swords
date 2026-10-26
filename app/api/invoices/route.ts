import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products, wallet, walletTransactions, inventoryLogs } from "../../lib/db";
import { eq, ilike, or, desc, asc, sql, type AnyColumn } from "drizzle-orm";

interface InvoiceItem {
  productId: string;
  quantity: number;
  price: number | null;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const query = searchVal
      ? or(
          ilike(invoices.customer, `%${searchVal}%`),
          ilike(invoices.invoiceId, `%${searchVal}%`)
        )
      : undefined;

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .where(query);

    const totalPages = Math.ceil(totalCount / limit);

    const data = await db
      .select()
      .from(invoices)
      .where(query)
      .orderBy((() => {
          const sortColumns: Record<string, AnyColumn> = {
            date: invoices.date,
            customer: invoices.customer,
            amount: invoices.amount,
            status: invoices.status,
            createdAt: invoices.createdAt,
          };
          const sortField = searchParams.get("sort") || "createdAt";
          const order = searchParams.get("order") || "desc";
          const sortColumn = sortColumns[sortField] || invoices.createdAt;
          return order === "asc" ? asc(sortColumn) : desc(sortColumn);
        })())
      .limit(limit)
      .offset(skip);

    return NextResponse.json({
      message: "Invoices retrieved successfully",
      data,
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
      for (const item of items) {
        try {
          await db
            .update(products)
            .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
            .where(eq(products.id, item.productId));

          await db.insert(inventoryLogs).values({
            productId: item.productId,
            changeType: "Sale",
            quantityChange: -item.quantity,
            reason: `Sale via invoice ${invoiceData.invoiceId}`,
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
    const finalAmount = isPaid ? parseFloat(invoiceData.amount) : depositAmount;

    if (invoiceData.paymentMethod === "cash" && finalAmount > 0) {
      try {
        // Add to wallet balance (EGP) - assuming EGP for now as per user request
        const [existingWallet] = await db.select().from(wallet).limit(1);
        if (existingWallet) {
          await db
            .update(wallet)
            .set({
              balance: sql`${wallet.balance} + ${finalAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallet.id, existingWallet.id));
        } else {
          await db.insert(wallet).values({ balance: String(finalAmount), currency: "EGP" });
        }

        // Log wallet transaction
        await db.insert(walletTransactions).values({
          walletId: existingWallet?.id ?? null,
          type: "invoice",
          amount: String(finalAmount),
          description: isPaid
            ? `Cash invoice ${invoiceData.invoiceId} (Full Payment) — ${invoiceData.customer}`
            : `Cash invoice ${invoiceData.invoiceId} (Deposit) — ${invoiceData.customer}`,
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

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const oldDeposit = parseFloat(invoice.deposit || "0") || 0;
    const additionalDeposit = parseFloat(body.deposit) || 0;

    // 1. STOCK ADJUSTMENT AND HISTORY LOGGING (if items changed)
    if (items && Array.isArray(items)) {
      const oldItems: InvoiceItem[] = (invoice.items as InvoiceItem[]) || [];

      // Track which old items were processed
      const processedOldProductIds = new Set<string>();

      // Process new items (Updates and Additions)
      for (const newItem of items) {
        const oldItem = oldItems.find((oi) => oi.productId === newItem.productId);
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
            await db
              .select()
              .from(products)
              .where(eq(products.id, newItem.productId));

            await db.insert(inventoryLogs).values({
              productId: newItem.productId,
              changeType: priceChanged && netChange === 0 ? "Price Update" : "Sale",
              quantityChange: -netChange,
              reason: `Updated via invoice ${invoice.invoiceId}${priceChanged ? ' (Price change)' : ''}`,
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
            await db.insert(inventoryLogs).values({
              productId: oldItem.productId,
              changeType: "Order Cancelled",
              quantityChange: oldItem.quantity,
              reason: `Item removed from invoice ${invoice.invoiceId}`,
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
      updateData.deposit = updateData.amount || invoice.amount;
    }

    await db.update(invoices).set(updateData).where(eq(invoices.id, id));

    // 3. WALLET UPDATE LOGIC (Cash only)
    const currentPaymentMethod = paymentMethod || invoice.paymentMethod;

    if (currentPaymentMethod === "cash") {
      const [existingWallet] = await db.select().from(wallet).limit(1);

      const addWalletAmount = async (amt: number, note: string) => {
        if (existingWallet) {
          await db
            .update(wallet)
            .set({
              balance: sql`${wallet.balance} + ${amt}`,
              updatedAt: new Date(),
            })
            .where(eq(wallet.id, existingWallet.id));
        } else {
          await db.insert(wallet).values({ balance: String(amt), currency: "EGP" });
        }
        await db.insert(walletTransactions).values({
          walletId: existingWallet?.id ?? null,
          type: "invoice",
          amount: String(amt),
          description: note,
        });
      };

      // Case: Just marked as paid (add remaining balance)
      if (status === "paid" && oldStatus !== "paid") {
        const remainingBalance =
          parseFloat(String(updateData.amount || invoice.amount)) - (oldDeposit + additionalDeposit);
        if (remainingBalance > 0) {
          try {
            await addWalletAmount(
              remainingBalance,
              `Cash invoice ${invoice.invoiceId} (Final Balance) — ${updateData.customer || invoice.customer}`
            );
          } catch (walletError) {
            console.error("❌ Failed to update wallet for final balance:", walletError);
          }
        }
      }

      // Case: Additional deposit added
      if (additionalDeposit > 0) {
        try {
          await addWalletAmount(
            additionalDeposit,
            `Cash invoice ${invoice.invoiceId} (Additional Deposit) — ${updateData.customer || invoice.customer}`
          );
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
