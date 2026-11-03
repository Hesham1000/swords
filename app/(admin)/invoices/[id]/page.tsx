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

  const handlePrint = async () => {
    if (!invoice) return;
    const total = invoice.items.reduce((sum: number, item: any) => sum + (item.price ?? 0) * item.quantity, 0);
    let logoBase64 = "";
    try {
      const res = await fetch(window.location.origin + "/icon.png");
      const blob = await res.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {}
    const logoHtml = logoBase64
      ? `<img src="${logoBase64}" class="brand-logo" alt="KINGS" />`
      : `<div style="font-size:24px;font-weight:800;letter-spacing:4px;color:#c9a84c">KINGS</div>`;
    const itemRows = invoice.items
      .map(
        (item: any) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb">${item.name}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right">${(item.price ?? 0).toLocaleString()} EGP</td>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right">${((item.price ?? 0) * item.quantity).toLocaleString()} EGP</td>
        </tr>`
      )
      .join("");

    const statusColor =
      invoice.status === "paid" ? "#16a34a" : invoice.status === "overdue" ? "#dc2626" : "#d97706";

    const w = window.open("", "_blank", "width=900,height=700");
    w?.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${invoice.invoiceId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 48px 56px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #c9a84c; padding-bottom: 24px; }
    .brand-logo { width: 80px; height: 80px; object-fit: contain; background: #2e3d3d; border-radius: 10px; padding: 4px; display: block; }
    .inv-meta { text-align: right; }
    .inv-id { font-size: 22px; font-weight: 700; color: #111; }
    .inv-date { font-size: 13px; color: #666; margin-top: 4px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 8px; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}55; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 40px; background: #f9fafb; border-radius: 10px; padding: 20px 24px; margin-bottom: 32px; border: 1px solid #e5e7eb; }
    .info-item label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; font-weight: 600; }
    .info-item p { font-size: 15px; font-weight: 500; color: #111; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f3f4f6; }
    th { padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; font-weight: 700; text-align: left; }
    th:last-child, th:nth-child(3) { text-align: right; }
    th:nth-child(2) { text-align: center; }
    tbody td { color: #222; font-size: 14px; }
    tbody td:nth-child(2) { text-align: center; }
    tbody td:nth-child(3), tbody td:last-child { text-align: right; }
    .totals td { padding: 14px 16px; border-top: 2px solid #e5e7eb; }
    .totals .label { font-weight: 600; color: #444; text-align: right; padding-right: 16px; }
    .totals .grand { font-size: 16px; font-weight: 800; color: #c9a84c; text-align: right; }
    .footer { margin-top: 48px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${logoHtml}
    </div>
    <div class="inv-meta">
      <div class="inv-id">${invoice.invoiceId}</div>
      <div class="inv-date">${invoice.date}</div>
      <span class="status-badge">${invoice.status}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><label>Customer</label><p>${invoice.customer}</p></div>
    <div class="info-item"><label>Payment Method</label><p>${invoice.paymentMethod}</p></div>
    <div class="info-item"><label>Date</label><p>${invoice.date}</p></div>
    ${invoice.discount ? `<div class="info-item"><label>Discount</label><p>${invoice.discount.toLocaleString()} EGP</p></div>` : ""}
    ${invoice.deposit ? `<div class="info-item"><label>Deposit</label><p>${invoice.deposit.toLocaleString()} ${invoice.depositCurrency ?? "EGP"}</p></div>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot class="totals">
      <tr>
        <td colspan="3" class="label">Total</td>
        <td class="grand">${total.toLocaleString()} EGP</td>
      </tr>
    </tfoot>
  </table>

  <div class="footer">KINGS Fencing Equipment &nbsp;&middot;&nbsp; Thank you for your purchase</div>
</body>
</html>`);
    w?.document.close();
    w?.print();
  };

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading invoice&hellip;</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page-content">
        <p>Invoice not found.</p>
        <Link href="/invoices" className="back-link">&larr; Back to Invoices</Link>
      </div>
    );
  }

  const total = invoice.items.reduce((sum: number, item: any) => sum + (item.price ?? 0) * item.quantity, 0);

  return (
    <div className="page-content">
      <Link href="/invoices" className="back-link">&larr; Back to Invoices</Link>

      <div className="page-header" style={{ marginBottom: "24px" }}>
        <h1 className="page-title">{invoice.invoiceId}</h1>
        <span className={`status-badge status-${invoice.status}`}>{invoice.status}</span>
        <button className="primary-btn" onClick={handlePrint} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }} title="Print Invoice">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Print
        </button>
      </div>

      <div id="invoice-print-area">
        <div className="invoice-info-card">
          <div className="invoice-info-row">
            <div className="invoice-info-item">
              <span className="invoice-info-label">Customer</span>
              <span className="invoice-info-value">{invoice.customer}</span>
            </div>
            <div className="invoice-info-item">
              <span className="invoice-info-label">Payment Method</span>
              <span className="invoice-info-value">{invoice.paymentMethod}</span>
            </div>
            <div className="invoice-info-item">
              <span className="invoice-info-label">Date</span>
              <span className="invoice-info-value">{invoice.date}</span>
            </div>
            <div className="invoice-info-item">
              <span className="invoice-info-label">Total Amount</span>
              <span className="invoice-info-value invoice-info-total">{invoice.amount.toLocaleString()} EGP</span>
            </div>
          </div>
        </div>

        <div className="invoice-table-wrap">
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
              {invoice.items.map((item: any, idx: number) => {
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
            <tfoot>
              <tr className="invoice-total-row">
                <td colSpan={3} style={{ textAlign: "right", paddingRight: "16px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Total
                </td>
                <td style={{ fontWeight: 700, fontSize: "16px", color: "var(--accent-gold)" }}>
                  {total.toLocaleString()} EGP
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style jsx global>{`
        .invoice-info-card {
          background: var(--bg-card);
          border: 1px solid var(--border-tech);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
        }
        .invoice-info-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .invoice-info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .invoice-info-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          font-weight: 600;
        }
        .invoice-info-value {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .invoice-info-total {
          color: var(--accent-gold);
          font-weight: 700;
          font-size: 17px;
        }
        .invoice-table-wrap {
          background: var(--bg-card);
          border: 1px solid var(--border-tech);
          border-radius: 12px;
          overflow: hidden;
        }
        .invoice-items-table {
          border-collapse: collapse;
          width: 100%;
        }
        .invoice-items-table thead tr {
          background: var(--glass-bg);
        }
        .invoice-items-table th {
          color: var(--text-muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 700;
          padding: 14px 16px;
          text-align: left;
        }
        .invoice-items-table th:nth-child(2),
        .invoice-items-table th:nth-child(3),
        .invoice-items-table th:nth-child(4) {
          text-align: right;
        }
        .invoice-items-table td {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          color: var(--text-primary);
          font-size: 14px;
        }
        .invoice-items-table td:nth-child(2),
        .invoice-items-table td:nth-child(3),
        .invoice-items-table td:nth-child(4) {
          text-align: right;
        }
        .invoice-total-row td {
          border-bottom: none;
          border-top: 2px solid var(--border-tech);
          padding: 16px;
        }
      `}</style>
    </div>
  );
}
