"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2, Printer } from "lucide-react";
import { getInvoiceById, Invoice, InvoiceItem } from "../../../lib/api/invoice";

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await getInvoiceById(id);
        setInvoice(response.data);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const getItemSubtotal = (item: InvoiceItem) => {
    if (item.price === null || item.price === undefined) return 0;
    return (item.price - (item.discount || 0)) * item.quantity;
  };

  return (
    <div className="page-content">
      <style jsx global>{`
        @media print {
          .sidebar,
          .topbar {
            display: none !important;
          }
        }
      `}</style>

      <div className="page-header">
        <Link href="/invoices" className="back-link">
          <ArrowLeft size={18} />
          Back to Invoices
        </Link>
        <button className="primary-btn" onClick={() => window.print()}>
          <Printer size={18} />
          Print
        </button>
      </div>

      {loading ? (
        <div className="list-card full-width">
          <div className="loading-state">
            <Loader2 className="animate-spin" />
            <p>Loading invoice...</p>
          </div>
        </div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : !invoice ? (
        <div className="list-card full-width">
          <div className="empty-state">Invoice not found.</div>
        </div>
      ) : (
        <div className="list-card full-width">
          <div className="invoice-detail">
            <h1 className="page-title">Invoice {invoice.invoiceId}</h1>

            <div className="invoice-detail-meta">
              <div className="invoice-detail-row">
                <span className="invoice-detail-label">Customer</span>
                <span className="invoice-detail-value">{invoice.customer}</span>
              </div>
              <div className="invoice-detail-row">
                <span className="invoice-detail-label">Date</span>
                <span className="invoice-detail-value">{invoice.date}</span>
              </div>
              <div className="invoice-detail-row">
                <span className="invoice-detail-label">Status</span>
                <span className={`status-badge status-${invoice.status}`}>
                  {invoice.status === "overdue" && <AlertCircle size={14} />}
                  {invoice.status}
                </span>
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
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.price === null ? "—" : `${item.price.toLocaleString()} EGP`}</td>
                    <td>{getItemSubtotal(item).toLocaleString()} EGP</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-detail-total">
              Total: <strong>{invoice.amount.toLocaleString()} EGP</strong>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: var(--transition-smooth);
        }
        .back-link:hover {
          color: var(--text-primary);
        }
        .invoice-detail {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem;
        }
        .invoice-detail-meta {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .invoice-detail-row {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .invoice-detail-label {
          min-width: 6rem;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
        }
        .invoice-detail-value {
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
        }
        .invoice-items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .invoice-items-table th,
        .invoice-items-table td {
          border: 1px solid var(--border-tech);
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 14px;
        }
        .invoice-items-table th {
          color: var(--text-secondary);
          font-weight: 700;
          background: var(--bg-card);
        }
        .invoice-items-table td {
          color: var(--text-primary);
        }
        .invoice-detail-total {
          align-self: flex-end;
          color: var(--text-secondary);
          font-size: 15px;
        }
        .invoice-detail-total strong {
          color: var(--text-primary);
          font-size: 18px;
        }
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-secondary);
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
