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

      <div className="list-card" style={{ padding: '24px', marginTop: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', padding: '16px', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--border-tech)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', minWidth: '140px' }}>Customer</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{invoice.customer}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', minWidth: '140px' }}>Date</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{invoice.date}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', minWidth: '140px' }}>Payment Method</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{invoice.paymentMethod}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px', minWidth: '140px' }}>Total Amount</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{invoice.amount.toLocaleString()} EGP</span>
          </div>
        </div>
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

      <button className="primary-btn" onClick={() => window.print()}>Print Invoice</button>

      <style jsx global>{`
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
          .topbar,
          .main-content > *:not(.page-content) {
            display: none !important;
          }
          .page-content {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
