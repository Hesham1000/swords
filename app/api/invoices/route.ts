import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products, users, wallet, walletTransactions } from "../../lib/db";
import { eq, ilike, or, desc, sql, SQL } from "drizzle-orm";

// Shape of the jsonb stored in invoices.items:
// { items: [...], paymentMethod, deposit, depositCurrency, discount, date }
interface InvoiceMeta {
  items?: Array<{ productId?: string; name?: string; quantity?: number; price?: number }>;
  paymentMethod?: string;
  deposit?: number;
  depositCurrency?: string;
  discount?: number;
  date?: string;
}

function parseMeta(raw: unknown): InvoiceMeta {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as InvoiceMeta;
  }
  return { items: Array.isArray(raw) ? (raw as InvoiceMeta["items"]) : [] };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let where: SQL | undefined;
    if (searchVal) {
      const pattern = `%${searchVal}%`;
      where = or(
        ilike(invoices.customerName, pattern),
        ilike(invoices.invoiceNumber, pattern),
        sql`${invoices.items}::text ILIKE ${pattern}`
      );
    }

    const [{ count: totalCount }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(invoices)
      .where(where);
    const totalPages = Math.ceil(totalCount / limit);

    const rows = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .offset(skip)
      .limit(limit);

    // Map Drizzle rows back to the legacy response shape
    const data = rows.map((row) => {
      const meta = parseMeta(row.items);
      return {
        _id: row.id,
        invoiceId: row.invoiceNumber,
        customer: row.customerName,
        customerEmail: row.customerEmail,
        amount: parseFloat(row.totalAmount),
        status: row.status,
        items: meta.items ?? [],
        paymentMethod: meta.paymentMethod ?? "cash",
        discount: meta.discount ?? 0,
        deposit: meta.deposit ?? 0,
        depositCurrency: meta.depositCurrency ?? "EGP",
        date: meta.date ?? row.createdAt?.toISOString().split("T")[0],
        createdAt: row.createdAt,
      };
    });

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
    const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const meta: InvoiceMeta = {
      items: items || [],
      paymentMethod: paymentMethod || "cash",
      deposit: parseFloat(body.deposit) || 0,
      depositCurrency: body.depositCurrency || "EGP",
      discount: parseFloat(discount) || 0,
      date: date || new Date().toISOString().split('T')[0],
    };
    const parsedAmount = parseFloat(amount) || 0;

    const [inserted] = await db
      .insert(invoices)
      .values({
        invoiceNumber,
        customerName: customer || "General Customer",
        items: meta,
        totalAmount: parsedAmount.toFixed(2),
        status: status || "pending",
      })
      .returning();

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      for (const item of items) {
        try {
          const product = item.productId
            ? await db.select().from(products).where(eq(products.id, item.productId)).limit(1)
            : [];
          const newQty = (product[0]?.quantity || 0) - item.quantity;

          if (item.productId) {
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} - ${item.quantity}`, updatedAt: new Date() })
              .where(eq(products.id, item.productId));
          }

          console.log(`✅ Stocks updated for product: ${item.name} (-${item.quantity}) (new qty: ${newQty})`);
        } catch (updateError) {
          console.error(`❌ Failed to update stock for product ${item.productId}:`, updateError);
          // We continue with other items even if one fails
        }
      }
    }

    // If payment method is CASH and there's a deposit (or full payment), add to wallet
    const isPaid = (status || "pending") === "paid";
    const depositAmount = meta.deposit || 0;
    const finalAmount = isPaid ? parsedAmount : depositAmount;

    if (meta.paymentMethod === "cash" && finalAmount > 0) {
      try {
        // Single "main" wallet row (first wallet in the table)
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

        if (mainWallet) {
          await db
            .update(wallet)
            .set({
              balance: sql`${wallet.balance} + ${finalAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallet.id, mainWallet.id));

          await db.insert(walletTransactions).values({
            walletId: mainWallet.id,
            type: "invoice",
            amount: finalAmount.toFixed(2),
            description: isPaid
              ? `Cash invoice ${invoiceNumber} (Full Payment) — ${inserted.customerName} [EGP]`
              : `Cash invoice ${invoiceNumber} (Deposit) — ${inserted.customerName} [EGP]`,
          });

          console.log(`💰 Wallet updated: +${finalAmount} EGP from invoice ${invoiceNumber}`);
        }
      } catch (walletError) {
        console.error("❌ Failed to update wallet for cash invoice:", walletError);
      }
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      data: {
        _id: inserted.id,
        invoiceId: inserted.invoiceNumber,
        customer: inserted.customerName,
        amount: parseFloat(inserted.totalAmount),
        status: inserted.status,
        items: meta.items,
        paymentMethod: meta.paymentMethod,
        discount: meta.discount,
        deposit: meta.deposit,
        depositCurrency: meta.depositCurrency,
        date: meta.date,
        createdAt: inserted.createdAt,
      }
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

    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldMeta = parseMeta(invoice.items);
    const oldStatus = invoice.status;
    const oldDeposit = oldMeta.deposit || 0;
    const additionalDeposit = parseFloat(body.deposit) || 0;
    const newMeta: InvoiceMeta = {
      items: items ?? oldMeta.items ?? [],
      paymentMethod: paymentMethod ?? oldMeta.paymentMethod ?? "cash",
      deposit: oldDeposit + additionalDeposit,
      depositCurrency: oldMeta.depositCurrency ?? "EGP",
      discount: discount !== undefined ? parseFloat(discount) || 0 : oldMeta.discount ?? 0,
      date: date ?? oldMeta.date,
    };

    // 1. STOCK ADJUSTMENT AND HISTORY LOGGING (if items changed)
    if (items && Array.isArray(items)) {
      const oldItems = oldMeta.items || [];

      // Process new items (Updates and Additions)
      for (const newItem of items) {
        const oldItem = oldItems.find((oi) => oi.productId === newItem.productId);

        const oldQty = oldItem ? oldItem.quantity || 0 : 0;
        const netChange = newItem.quantity - oldQty;

        if (netChange !== 0 && newItem.productId) {
          // Adjust stock
          try {
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} - ${netChange}`, updatedAt: new Date() })
              .where(eq(products.id, newItem.productId));
          } catch (e) {
            console.error(`Stock update fail for ${newItem.name}:`, e);
          }
        }
      }

      // Process removals (items that were in old but not in new)
      for (const oldItem of oldItems) {
        const stillExists = items.find((ni: { productId?: string }) => ni.productId === oldItem.productId);
        if (!stillExists && oldItem.productId) {
          try {
            await db
              .update(products)
              .set({ quantity: sql`${products.quantity} + ${oldItem.quantity || 0}`, updatedAt: new Date() })
              .where(eq(products.id, oldItem.productId));
          } catch (e) {
            console.error(`Stock restore fail for removed item:`, e);
          }
        }
      }
    }

    // 2. UPDATE INVOICE RECORD
    const [updated] = await db
      .update(invoices)
      .set({
        ...(customer !== undefined ? { customerName: customer } : {}),
        ...(amount !== undefined ? { totalAmount: (parseFloat(amount) || 0).toFixed(2) } : {}),
        ...(status !== undefined ? { status } : {}),
        items: newMeta,
      })
      .where(eq(invoices.id, id))
      .returning();

    // 3. WALLET ADJUSTMENT for cash invoices (deposit changes / status change to paid)
    const isPaid = updated.status === "paid";
    const finalAmount = isPaid ? parseFloat(updated.totalAmount) : newMeta.deposit || 0;
    const oldFinalAmount = oldStatus === "paid" ? parseFloat(invoice.totalAmount) : oldDeposit;
    const walletDelta = finalAmount - oldFinalAmount;

    if (newMeta.paymentMethod === "cash" && walletDelta !== 0) {
      try {
        const [mainWallet] = await db.select().from(wallet).orderBy(wallet.updatedAt).limit(1);
        if (mainWallet) {
          await db
            .update(wallet)
            .set({ balance: sql`${wallet.balance} + ${walletDelta}`, updatedAt: new Date() })
            .where(eq(wallet.id, mainWallet.id));

          await db.insert(walletTransactions).values({
            walletId: mainWallet.id,
            type: "invoice-update",
            amount: walletDelta.toFixed(2),
            description: `Invoice ${updated.invoiceNumber} adjusted (${oldFinalAmount} → ${finalAmount}) [EGP]`,
          });
        }
      } catch (walletError) {
        console.error("❌ Failed to adjust wallet for invoice update:", walletError);
      }
    }

    return NextResponse.json({
      message: "Invoice updated successfully",
      data: {
        _id: updated.id,
        invoiceId: updated.invoiceNumber,
        customer: updated.customerName,
        amount: parseFloat(updated.totalAmount),
        status: updated.status,
        items: newMeta.items,
        paymentMethod: newMeta.paymentMethod,
        discount: newMeta.discount,
        deposit: newMeta.deposit,
        depositCurrency: newMeta.depositCurrency,
        date: newMeta.date,
        createdAt: updated.createdAt,
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const [deleted] = await db.delete(invoices).where(eq(invoices.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
