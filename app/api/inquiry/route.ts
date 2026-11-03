import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "../../lib/mongoDB";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, productId, productName, message } = body;

    if (!name || !email || !message || typeof name !== "string" || typeof email !== "string" || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing required fields: name, email, message" },
        { status: 400 }
      );
    }

    const connection = await getConnection();
    const inquiriesCollection = connection.collection("inquiries");

    const inquiryDoc = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      productId: productId || null,
      productName: productName || null,
      message: message.trim(),
      status: "new",
      createdAt: new Date(),
    };

    await inquiriesCollection.insertOne(inquiryDoc);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
