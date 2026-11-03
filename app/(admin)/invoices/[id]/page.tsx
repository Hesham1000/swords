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


  const handlePrint = () => {
    const content = document.getElementById('invoice-print-area')?.innerHTML ?? '';
    const w = window.open('', '_blank', 'width=900,height=700');
    w?.document.write(`<html><head><title>Invoice ${invoice?.invoiceId}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#000}table{width:100%;border-collapse:collapse}th,td{padding:10px 8px;border-bottom:1px solid #ddd;text-align:left}th{font-weight:600;font-size:13px;text-transform:uppercase;color:#666}.info-grid{display:grid;gap:8px;margin-bottom:24px}.label{font-size:12px;color:#888;text-transform:uppercase}.value{font-size:15px;font-weight:500}</style></head><body>${content}</body></html>`);
    w?.document.close();
    w?.print();
  };

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

      <div id="invoice-print-area">
      <div className="page-header">
        <h1 className="page-title">{invoice.invoiceId}</h1>
        <span className={`status-badge status-${invoice.status}`}>{invoice.status}</span>
          <button className="primary-btn" onClick={handlePrint}>Print Invoice</button>
      </div>

      <div className="list-card" style={{ padding: '24px', marginTop: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-tech)', borderRadius: '16px' }}>
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

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-tech)', borderRadius: '12px', overflow: 'hidden', marginTop: '20px' }}>
      <table className="invoice-items-table">
        <thead style={{ background: 'var(--glass-bg)' }}>
          <tr>
            <th style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, padding: '12px 16px' }}>Name</th>
            <th style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, padding: '12px 16px' }}>Qty</th>
            <th style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, padding: '12px 16px' }}>Price</th>
            <th style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, padding: '12px 16px' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => {
            const subtotal = (item.price ?? 0) * item.quantity;
            return (
              <tr key={idx}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{(item.price ?? 0).toLocaleString()} EGP</td>
                <td>{subtotal.toLocaleString()} EGP</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      </div>

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
      `}</style>
    </div>
  );
}
