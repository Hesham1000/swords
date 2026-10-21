import { NextRequest, NextResponse } from "next/server";
import { query, isUuid } from "../../lib/db";
import ApiError from "../../utils/ApiError";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const searchVal = searchParams.get("search") || searchParams.get("customer");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    let whereClause = "";
    const params: unknown[] = [];
    if (searchVal) {
      params.push(`%${searchVal}%`);
      const p = params.length;
      whereClause = `WHERE customer ILIKE $${p} OR invoice_id ILIKE $${p} OR items::text ILIKE $${p}`;
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM invoices ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0]?.count || "0", 10);
    const totalPages = Math.ceil(totalCount / limit);

    const invoicesResult = await query(
      `SELECT id, invoice_id AS "invoiceId", customer, amount, discount, status,
              payment_method AS "paymentMethod", date, items, deposit,
              deposit_currency AS "depositCurrency",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM invoices
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, skip]
    );

    return NextResponse.json({
      message: "Invoices retrieved successfully",
      data: invoicesResult.rows,
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
      amount: parseFloat(amount) || 0,
      discount: parseFloat(discount) || 0,
      status: status || "pending",
      paymentMethod: paymentMethod || "cash",
      date: date || new Date().toISOString().split('T')[0],
      items: items || [],
      deposit: parseFloat(body.deposit) || 0,
      depositCurrency: body.depositCurrency || "EGP",
      createdAt: new Date()
    };

    const result = await query<{ id: string }>(
      `INSERT INTO invoices
        (invoice_id, customer, amount, discount, status, payment_method, date, items, deposit, deposit_currency, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
       RETURNING id`,
      [
        invoiceData.invoiceId,
        invoiceData.customer,
        invoiceData.amount,
        invoiceData.discount,
        invoiceData.status,
        invoiceData.paymentMethod,
        invoiceData.date,
        JSON.stringify(invoiceData.items),
        invoiceData.deposit,
        invoiceData.depositCurrency,
      ]
    );
    const insertedId = result.rows[0].id;

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      const { logInventoryChange } = await import("../../lib/inventory-server");

      for (const item of items) {
        try {
          // Get current quantity first for logging
          const productResult = await query<{ quantity: number }>(
            `SELECT quantity FROM products WHERE id = $1`,
            [item.productId]
          );
          const product = productResult.rows[0];
          const newQty = (product?.quantity || 0) - item.quantity;

          await query(
            `UPDATE products SET quantity = quantity - $1, updated_at = now() WHERE id = $2`,
            [item.quantity, item.productId]
          );

          await logInventoryChange({
            productId: item.productId,
            productName: item.name,
            changeAmount: -item.quantity,
            newQuantity: newQty,
            reason: "Sale",
            referenceId: insertedId,
            note: `Sold via invoice ${invoiceData.invoiceId}`
          }).catch(() => {});

          console.log(`✅ Stocks updated for product: ${item.name} (-${item.quantity})`);
        } catch (updateError) {
          console.error(`❌ Failed to update stock for product ${item.productId}:`, updateError);
          // We continue with other items even if one fails
        }
      }
    }

    // If payment method is CASH and there's a deposit (or full payment), add to wallet
    const isPaid = invoiceData.status === "paid";
    const depositAmount = invoiceData.deposit || 0;
    const finalAmount = isPaid ? invoiceData.amount : depositAmount;

    if (invoiceData.paymentMethod === "cash" && finalAmount > 0) {
      try {
        // Add to wallet balance (EGP) - assuming EGP for now as per user request
        await query(
          `INSERT INTO wallet (id, balance_egp, initialized) VALUES ('main', $1, true)
           ON CONFLICT (id) DO UPDATE SET balance_egp = wallet.balance_egp + $1, updated_at = now()`,
          [finalAmount]
        );

        // Log wallet transaction
        await query(
          `INSERT INTO wallet_transactions (wallet_id, type, amount, currency, note, date, reference_id, created_at)
           VALUES ('main', 'invoice', $1, 'EGP', $2, now(), $3, now())`,
          [
            finalAmount,
            isPaid
              ? `Cash invoice ${invoiceData.invoiceId} (Full Payment) — ${invoiceData.customer}`
              : `Cash invoice ${invoiceData.invoiceId} (Deposit) — ${invoiceData.customer}`,
            insertedId,
          ]
        );

        console.log(`💰 Wallet updated: +${finalAmount} EGP from invoice ${invoiceData.invoiceId}`);
      } catch (walletError) {
        console.error("❌ Failed to update wallet for cash invoice:", walletError);
      }
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      data: { ...invoiceData, _id: insertedId, id: insertedId }
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
    if (!isUuid(id)) {
      return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
    }

    const invoiceResult = await query(
      `SELECT id, invoice_id AS "invoiceId", customer, amount, discount, status,
              payment_method AS "paymentMethod", date, items, deposit
       FROM invoices WHERE id = $1`,
      [id]
    );
    const invoice = invoiceResult.rows[0];

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const oldDeposit = parseFloat(invoice.deposit) || 0;
    const additionalDeposit = parseFloat(body.deposit) || 0;

    // 1. STOCK ADJUSTMENT AND HISTORY LOGGING (if items changed)
    if (items && Array.isArray(items)) {
      const { logInventoryChange } = await import("../../lib/inventory-server");
      const oldItems = invoice.items || [];

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
            await query(
              `UPDATE products SET quantity = quantity - $1, updated_at = now() WHERE id = $2`,
              [netChange, newItem.productId]
            );
          } catch (e) {
            console.error(`Stock update fail for ${newItem.name}:`, e);
          }
        }

        // ONLY LOG IF PRICE OR QUANTITY CHANGED
        if (netChange !== 0 || priceChanged) {
          try {
            const productResult = await query<{ quantity: number }>(
              `SELECT quantity FROM products WHERE id = $1`,
              [newItem.productId]
            );
            await logInventoryChange({
              productId: newItem.productId,
              productName: newItem.name,
              changeAmount: -netChange,
              newQuantity: productResult.rows[0]?.quantity || 0,
              reason: priceChanged && netChange === 0 ? "Price Update" : "Sale",
              oldPrice: oldPrice,
              newPrice: newItem.price,
              referenceId: id,
              note: `Updated via invoice ${invoice.invoiceId}${priceChanged ? ' (Price change)' : ''}`
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
            await query(
              `UPDATE products SET quantity = quantity + $1, updated_at = now() WHERE id = $2`,
              [oldItem.quantity, oldItem.productId]
            );

            // Log removal
            const productResult = await query<{ quantity: number }>(
              `SELECT quantity FROM products WHERE id = $1`,
              [oldItem.productId]
            );
            await logInventoryChange({
              productId: oldItem.productId,
              productName: oldItem.name,
              changeAmount: oldItem.quantity,
              newQuantity: productResult.rows[0]?.quantity || 0,
              reason: "Order Cancelled",
              referenceId: id,
              note: `Item removed from invoice ${invoice.invoiceId}`
            });
            console.log(`📝 Logged removal for ${oldItem.name}`);
          } catch (e) {
            console.error(`Stock revert/log fail for removed item ${oldItem.name}:`, e);
          }
        }
      }
    }

    // 2. PREPARE UPDATE DATA
    const updateData: any = {};
    if (status) updateData.status = status;
    if (customer) updateData.customer = customer;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (discount !== undefined) updateData.discount = parseFloat(discount);
    if (date) updateData.date = date;
    if (items) updateData.items = items;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    if (additionalDeposit > 0) {
      updateData.deposit = oldDeposit + additionalDeposit;
    }
    if (status === "paid" || (!status && oldStatus === "paid")) {
      updateData.deposit = updateData.amount || invoice.amount;
    }

    // Build dynamic UPDATE
    const setClauses: string[] = [];
    const params: unknown[] = [];
    const colMap: Record<string, string> = {
      status: "status",
      customer: "customer",
      amount: "amount",
      discount: "discount",
      date: "date",
      items: "items",
      paymentMethod: "payment_method",
      deposit: "deposit",
    };
    for (const [key, col] of Object.entries(colMap)) {
      if (updateData[key] !== undefined) {
        params.push(key === "items" ? JSON.stringify(updateData[key]) : updateData[key]);
        setClauses.push(`${col} = $${params.length}`);
      }
    }
    if (setClauses.length > 0) {
      params.push(id);
      await query(
        `UPDATE invoices SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${params.length}`,
        params
      );
    }

    // 3. WALLET UPDATE LOGIC (Cash only)
    const currentPaymentMethod = paymentMethod || invoice.paymentMethod;

    if (currentPaymentMethod === "cash") {
      // Case: Just marked as paid (add remaining balance)
      if (status === "paid" && oldStatus !== "paid") {
        const remainingBalance = (updateData.amount || invoice.amount) - (oldDeposit + additionalDeposit);
        if (remainingBalance > 0) {
          try {
            await query(
              `INSERT INTO wallet (id, balance_egp, initialized) VALUES ('main', $1, true)
               ON CONFLICT (id) DO UPDATE SET balance_egp = wallet.balance_egp + $1, updated_at = now()`,
              [remainingBalance]
            );

            await query(
              `INSERT INTO wallet_transactions (wallet_id, type, amount, currency, note, date, reference_id, created_at)
               VALUES ('main', 'invoice', $1, 'EGP', $2, now(), $3, now())`,
              [
                remainingBalance,
                `Cash invoice ${invoice.invoiceId} (Final Balance) — ${updateData.customer || invoice.customer}`,
                id,
              ]
            );
          } catch (walletError) {
            console.error("❌ Failed to update wallet for final balance:", walletError);
          }
        }
      }

      // Case: Additional deposit added
      if (additionalDeposit > 0) {
         try {
            await query(
              `INSERT INTO wallet (id, balance_egp, initialized) VALUES ('main', $1, true)
               ON CONFLICT (id) DO UPDATE SET balance_egp = wallet.balance_egp + $1, updated_at = now()`,
              [additionalDeposit]
            );

            await query(
              `INSERT INTO wallet_transactions (wallet_id, type, amount, currency, note, date, reference_id, created_at)
               VALUES ('main', 'invoice', $1, 'EGP', $2, now(), $3, now())`,
              [
                additionalDeposit,
                `Cash invoice ${invoice.invoiceId} (Additional Deposit) — ${updateData.customer || invoice.customer}`,
                id,
              ]
            );
          } catch (walletError) {
            console.error("❌ Failed to update wallet for additional deposit:", walletError);
          }
      }
    }

    // Re-fetch the full updated invoice row (same SELECT column list as GET, with aliases)
    const updatedResult = await query(
      `SELECT id, invoice_id AS "invoiceId", customer, amount, discount, status,
              payment_method AS "paymentMethod", date, items, deposit,
              deposit_currency AS "depositCurrency",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM invoices WHERE id = $1`,
      [id]
    );
    const updatedRow = updatedResult.rows[0];

    return NextResponse.json({
      message: "Invoice updated successfully",
      data: updatedRow
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
