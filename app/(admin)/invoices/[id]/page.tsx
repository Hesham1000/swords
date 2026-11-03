"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getInvoiceById, Invoice } from "../../../lib/api/invoice";
import { useDashboard } from "../../layout";

export default function InvoiceDetailPage() {
  useDashboard();
  const params = useParams();
  const id = params?.id as string | undefined;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getInvoiceById(id)
      .then((r) => setInvoice(r.data))
      .catch(() => setInvoice(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading invoice…</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page-content">
        <p>Invoice not found.</p>
        <Link href="/invoices" className="back-link">← Back to Invoices</Link>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Link href="/invoices" className="back-link">← Back to Invoices</Link>

      <div className="page-header">
        <h1 className="page-title">{invoice.invoiceId}</h1>
        <span className={`status-badge status-${invoice.status}`}>{invoice.status}</span>
      </div>

      <div className="invoice-details">
        <div><strong>Customer:</strong> {invoice.customer}</div>
        <div><strong>Date:</strong> {invoice.date}</div>
        <div><strong>Payment Method:</strong> {invoice.paymentMethod}</div>
        <div><strong>Total Amount:</strong> {invoice.amount.toLocaleString()} EGP</div>
      </div>

      <table className="invoice-items-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const subtotal = (item.price ?? 0) * item.quantity;
            return (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.price ?? 0}</td>
                <td>{subtotal}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button onClick={() => window.print()}>Print</button>

      <style jsx>{`
        .invoice-items-table {
          border-collapse: collapse;
          width: 100%;
        }
        .invoice-items-table th,
        .invoice-items-table td {
          padding: 8px;
          border-bottom: 1px solid var(--border);
        }
        @media print {
          .sidebar,
          .topbar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
