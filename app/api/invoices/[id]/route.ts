import { NextRequest, NextResponse } from "next/server";
import { getInvoicesCollection } from "../../../lib/mongoDB";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoicesCollection = await getInvoicesCollection();
    const invoice = await invoicesCollection.findOne({ _id: new ObjectId(id) });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice retrieved successfully", data: invoice }, { status: 200 });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoicesCollection = await getInvoicesCollection();
    const result = await invoicesCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invoice deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
