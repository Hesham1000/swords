import { NextRequest, NextResponse } from "next/server";
import { db } from "../../lib/db";
import { invoices, products, wallet, walletTransactions } from "../../lib/db/schema";
import { eq, ilike, or, sql, desc, count } from "drizzle-orm";
import { logInventoryChange } from "../../lib/inventory-server";

type InvoiceItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "10"), 1);
    const offset = (page - 1) * limit;

    const where = searchVal
      ? or(
          ilike(invoices.customerName, `%${searchVal}%`),
          ilike(invoices.invoiceNumber, `%${searchVal}%`),
        )
      : undefined;

    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(invoices)
      .where(where);

    const totalPages = Math.ceil(totalCount / limit);

    const rows = await db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((inv) => ({
      id: inv.id,
      invoiceId: inv.invoiceNumber,
      customer: inv.customerName,
      amount: parseFloat(inv.total || "0"),
      discount: parseFloat(inv.discount || "0"),
      deposit: parseFloat(inv.deposit || "0"),
      depositCurrency: inv.depositCurrency,
      status: inv.status,
      paymentMethod: inv.paymentMethod,
      date: inv.invoiceDate,
      items: inv.items || [],
      createdAt: inv.createdAt,
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
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer, amount, status, date, items, paymentMethod, discount } = body;

    const parsedItems: InvoiceItem[] = Array.isArray(items) ? items : [];
    const invoiceData = {
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: customer || "General Customer",
      total: String(parseFloat(amount) || 0),
      discount: String(parseFloat(discount) || 0),
      deposit: String(parseFloat(body.deposit) || 0),
      depositCurrency: body.depositCurrency || "EGP",
      status: status || "pending",
      paymentMethod: paymentMethod || "cash",
      invoiceDate: date || new Date().toISOString().split("T")[0],
      items: parsedItems,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert invoice, adjust product stock and handle wallet in one transaction
    const created = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(invoices).values(invoiceData).returning();

      // Decrease product quantities in inventory
      for (const item of parsedItems) {
        if (!item.productId) continue;
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        const newQty = (product?.quantity || 0) - (item.quantity || 0);
        await tx
          .update(products)
          .set({ quantity: newQty, updatedAt: new Date() })
          .where(eq(products.id, item.productId));

        await logInventoryChange({
          productId: item.productId,
          productName: item.name,
          changeAmount: -(item.quantity || 0),
          newQuantity: newQty,
          reason: "Sale",
          referenceId: inserted.id,
        });
      }

      // Cash invoices add funds to the wallet
      const isPaid = invoiceData.status === "paid";
      const finalAmount = isPaid
        ? parseFloat(invoiceData.total)
        : parseFloat(invoiceData.deposit);

      if (invoiceData.paymentMethod === "cash" && finalAmount > 0) {
        let [mainWallet] = await tx.select().from(wallet).limit(1);
        if (!mainWallet) {
          [mainWallet] = await tx
            .insert(wallet)
            .values({ balanceEGP: "0", balanceUSD: "0", balanceEUR: "0", initialized: true })
            .returning();
        }

        await tx
          .update(wallet)
          .set({
            balanceEGP: sql`${wallet.balanceEGP} + ${finalAmount}`,
            balance: sql`${wallet.balance} + ${finalAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallet.id, mainWallet.id));

        await tx.insert(walletTransactions).values({
          walletId: mainWallet.id,
          type: "invoice",
          amount: String(finalAmount),
          currency: "EGP",
          description: isPaid
            ? `Cash invoice ${invoiceData.invoiceNumber} (Full Payment) — ${invoiceData.customerName}`
            : `Cash invoice ${invoiceData.invoiceNumber} (Deposit) — ${invoiceData.customerName}`,
          referenceId: inserted.id,
        });
      }

      return inserted;
    });

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        data: {
          id: created.id,
          invoiceId: created.invoiceNumber,
          customer: created.customerName,
          amount: parseFloat(created.total || "0"),
          status: created.status,
          items: created.items,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function updateInvoice(request: NextRequest) {
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

    const oldItems: InvoiceItem[] = (invoice.items as InvoiceItem[]) || [];
    const newItems: InvoiceItem[] = Array.isArray(items) ? items : oldItems;

    await db.transaction(async (tx) => {
      // Adjust product quantities based on the diff between old and new items
      for (const newItem of newItems) {
        if (!newItem.productId) continue;
        const oldItem = oldItems.find((oi) => oi.productId === newItem.productId);
        const netChange = (newItem.quantity || 0) - (oldItem?.quantity || 0);

        if (netChange !== 0) {
          const [product] = await tx
            .select()
            .from(products)
            .where(eq(products.id, newItem.productId));
          const newQty = (product?.quantity || 0) - netChange;
          await tx
            .update(products)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(products.id, newItem.productId));

          await logInventoryChange({
            productId: newItem.productId,
            productName: newItem.name,
            changeAmount: -netChange,
            newQuantity: newQty,
            reason: "Manual Adjustment",
            referenceId: invoice.id,
          });
        }
      }

      // Restore stock for removed items
      for (const oldItem of oldItems) {
        if (!newItems.some((ni) => ni.productId === oldItem.productId)) {
          if (!oldItem.productId) continue;
          const [product] = await tx
            .select()
            .from(products)
            .where(eq(products.id, oldItem.productId));
          const newQty = (product?.quantity || 0) + (oldItem.quantity || 0);
          await tx
            .update(products)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(products.id, oldItem.productId));

          await logInventoryChange({
            productId: oldItem.productId,
            productName: oldItem.name,
            changeAmount: oldItem.quantity || 0,
            newQuantity: newQty,
            reason: "Order Cancelled",
            referenceId: invoice.id,
          });
        }
      }

      await tx
        .update(invoices)
        .set({
          customerName: customer ?? invoice.customerName,
          total: amount !== undefined ? String(parseFloat(amount) || 0) : invoice.total,
          discount: discount !== undefined ? String(parseFloat(discount) || 0) : invoice.discount,
          status: status ?? invoice.status,
          paymentMethod: paymentMethod ?? invoice.paymentMethod,
          invoiceDate: date ?? invoice.invoiceDate,
          items: newItems,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, id));
    });

    return NextResponse.json({ message: "Invoice updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return updateInvoice(request);
}

export async function PATCH(request: NextRequest) {
  return updateInvoice(request);
}
