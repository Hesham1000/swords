import { NextRequest, NextResponse } from "next/server";
import { getInvoicesCollection, getProductsCollection, getWalletCollection, getWalletTransactionsCollection } from "../../lib/mongoDB";
import ApiError from "../../utils/ApiError";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customer = searchParams.get("customer");
    
    const invoicesCollection = await getInvoicesCollection();
    
    let query = {};
    if (customer) {
      query = { customer: { $regex: customer, $options: "i" } };
    }
    
    const invoices = await invoicesCollection.find(query).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json({
      message: "Invoices retrieved successfully",
      data: invoices
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

    const invoicesCollection = await getInvoicesCollection();
    const result = await invoicesCollection.insertOne(invoiceData);

    // Decrease product quantities in inventory
    if (items && items.length > 0) {
      const productsCollection = await getProductsCollection();
      for (const item of items) {
        try {
          await productsCollection.updateOne(
            { _id: new ObjectId(item.productId) },
            { $inc: { quantity: -item.quantity } }
          );
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
        const walletCollection = await getWalletCollection();
        const transactionsCollection = await getWalletTransactionsCollection();

        // Add to wallet balance (EGP) - assuming EGP for now as per user request
        await walletCollection.updateOne(
          { _id: "main" as any },
          { $inc: { balanceEGP: finalAmount } },
          { upsert: true }
        );

        // Log wallet transaction
        await transactionsCollection.insertOne({
          type: "invoice",
          amount: finalAmount,
          currency: "EGP",
          note: isPaid 
            ? `Cash invoice ${invoiceData.invoiceId} (Full Payment) — ${invoiceData.customer}`
            : `Cash invoice ${invoiceData.invoiceId} (Deposit) — ${invoiceData.customer}`,
          date: new Date(),
          createdAt: new Date(),
          referenceId: result.insertedId,
        });

        console.log(`💰 Wallet updated: +${finalAmount} EGP from invoice ${invoiceData.invoiceId}`);
      } catch (walletError) {
        console.error("❌ Failed to update wallet for cash invoice:", walletError);
      }
    }

    return NextResponse.json({
      message: "Invoice created successfully",
      data: { ...invoiceData, _id: result.insertedId }
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

    const invoicesCollection = await getInvoicesCollection();
    const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const oldDeposit = invoice.deposit || 0;
    const additionalDeposit = parseFloat(body.deposit) || 0;
    const productsCollection = await getProductsCollection();
    
    // 1. STOCK ADJUSTMENT (if items changed)
    if (items && Array.isArray(items)) {
      // Revert old items stock
      if (invoice.items && Array.isArray(invoice.items)) {
        for (const oldItem of invoice.items) {
          try {
            await productsCollection.updateOne(
              { _id: new ObjectId(oldItem.productId) },
              { $inc: { quantity: oldItem.quantity } }
            );
          } catch (e) { console.error("Stock revert fail:", e); }
        }
      }
      // Apply new items stock
      for (const newItem of items) {
        try {
          await productsCollection.updateOne(
            { _id: new ObjectId(newItem.productId) },
            { $inc: { quantity: -newItem.quantity } }
          );
        } catch (e) { console.error("Stock apply fail:", e); }
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

    const result = await invoicesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // 3. WALLET UPDATE LOGIC (Cash only)
    const walletCollection = await getWalletCollection();
    const transactionsCollection = await getWalletTransactionsCollection();
    const currentPaymentMethod = paymentMethod || invoice.paymentMethod;

    if (currentPaymentMethod === "cash") {
      // Case: Just marked as paid (add remaining balance)
      if (status === "paid" && oldStatus !== "paid") {
        const remainingBalance = (updateData.amount || invoice.amount) - (oldDeposit + additionalDeposit);
        if (remainingBalance > 0) {
          try {
            await walletCollection.updateOne(
              { _id: "main" as any },
              { $inc: { balanceEGP: remainingBalance } },
              { upsert: true }
            );

            await transactionsCollection.insertOne({
              type: "invoice",
              amount: remainingBalance,
              currency: "EGP",
              note: `Cash invoice ${invoice.invoiceId} (Final Balance) — ${updateData.customer || invoice.customer}`,
              date: new Date(),
              createdAt: new Date(),
              referenceId: new ObjectId(id),
            });
          } catch (walletError) {
            console.error("❌ Failed to update wallet for final balance:", walletError);
          }
        }
      }

      // Case: Additional deposit added
      if (additionalDeposit > 0) {
         try {
            await walletCollection.updateOne(
              { _id: "main" as any },
              { $inc: { balanceEGP: additionalDeposit } },
              { upsert: true }
            );

            await transactionsCollection.insertOne({
              type: "invoice",
              amount: additionalDeposit,
              currency: "EGP",
              note: `Cash invoice ${invoice.invoiceId} (Additional Deposit) — ${updateData.customer || invoice.customer}`,
              date: new Date(),
              createdAt: new Date(),
              referenceId: new ObjectId(id),
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
