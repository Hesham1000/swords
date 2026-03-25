// lib/api/invoice.ts
import { Currency } from "./wallet";
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number | null;
  quantity: number;
  discount: number; // fixed amount discount per unit (e.g. 10 EGP off)
}

export interface Invoice {
  _id?: string;
  invoiceId: string;
  customer: string;
  amount: number;
  discount: number; // total discount amount in EGP
  status: "paid" | "pending" | "overdue";
  paymentMethod: "cash" | "visa";
  date: string;
  items: InvoiceItem[];
  deposit?: number; // amount paid as deposit
  depositCurrency?: Currency; // currency of the deposit, default EGP
  createdAt?: string;
}

export interface InvoicesResponse {
  success: boolean;
  data: Invoice[];
  message?: string;
}

export interface InvoiceResponse {
  success: boolean;
  data: Invoice;
  message?: string;
}

/**
 * Fetch all invoices
 */
export async function getInvoices(): Promise<InvoicesResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/invoices`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch invoices");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(invoiceData: Partial<Invoice>): Promise<InvoiceResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create invoice");
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error("Error creating invoice:", error);
    throw error;
  }
}
/**
 * Update invoice status or add deposit
 */
export async function updateInvoiceStatus(id: string, status?: string, deposit?: number): Promise<any> {
  try {
    const response = await fetch(`${apiUrl}/api/invoices`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, status, deposit }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update invoice");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating invoice:", error);
    throw error;
  }
}
