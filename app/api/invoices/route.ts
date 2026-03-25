import { NextRequest, NextResponse } from "next/server";
import { getInvoicesCollection, getProductsCollection, getWalletCollection, getWalletTransactionsCollection } from "../../lib/mongoDB";
import ApiError from "../../utils/ApiError";
import { v4 as uuidv4 } from "uuid";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
  try {
    const invoicesCollection = await getInvoicesCollection();
    const invoices = await invoicesCollection.find({}).sort({ createdAt: -1 }).toArray();
    
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
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const invoicesCollection = await getInvoicesCollection();
    const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const oldStatus = invoice.status;
    const oldDeposit = invoice.deposit || 0;
    const additionalDeposit = parseFloat(body.deposit) || 0;
    
    // Update invoice status and deposit
    const updateData: any = { status: status };
    if (additionalDeposit > 0) {
      updateData.deposit = oldDeposit + additionalDeposit;
    }
    if (status === "paid") {
      updateData.deposit = invoice.amount;
    }

    const result = await invoicesCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Wallet Update Logic
    const walletCollection = await getWalletCollection();
    const transactionsCollection = await getWalletTransactionsCollection();

    // Case 1: Just marked as paid (add remaining balance)
    if (status === "paid" && oldStatus !== "paid" && invoice.paymentMethod === "cash") {
      const remainingBalance = invoice.amount - (oldDeposit + additionalDeposit);
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
            note: `Cash invoice ${invoice.invoiceId} (Final Balance) — ${invoice.customer}`,
            date: new Date(),
            createdAt: new Date(),
            referenceId: new ObjectId(id),
          });
          console.log(`💰 Wallet updated: +${remainingBalance} EGP (Final Balance)`);
        } catch (walletError) {
          console.error("❌ Failed to update wallet for final balance:", walletError);
        }
      }
    }

    // Case 2: Additional deposit added (independent of status change)
    if (additionalDeposit > 0 && invoice.paymentMethod === "cash") {
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
            note: `Cash invoice ${invoice.invoiceId} (Additional Deposit) — ${invoice.customer}`,
            date: new Date(),
            createdAt: new Date(),
            referenceId: new ObjectId(id),
          });
          console.log(`💰 Wallet updated: +${additionalDeposit} EGP (Additional Deposit)`);
        } catch (walletError) {
          console.error("❌ Failed to update wallet for additional deposit:", walletError);
        }
    }

    return NextResponse.json({
      message: "Invoice status updated successfully",
      data: { id, status }
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating invoice status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
