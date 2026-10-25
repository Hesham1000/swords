"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText, Plus, Search, CheckCircle, AlertCircle, Loader2, X, ArrowUp, ArrowDown } from "lucide-react";
import InvoiceForm from "../../components/invoice-form";
import { getInvoices, updateInvoiceStatus, Invoice, InvoiceItem } from "../../lib/api/invoice";
import { useDashboard } from "../layout";

type SortBy = "invoiceNumber" | "customer" | "totalAmount" | "date";
type SortOrder = "asc" | "desc";

const STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Shipped", value: "shipped" },
  { label: "Cancelled", value: "cancelled" },
];

/** Colored status pill: yellow=pending, green=paid, blue=shipped, red=cancelled/overdue */
function StatusBadge({ status }: { status?: string }) {
  const normalized = (status ?? "").toLowerCase();
  const colorClass =
    normalized === "paid"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : normalized === "pending"
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
        : normalized === "shipped"
          ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
          : normalized === "cancelled" || normalized === "overdue"
            ? "bg-red-500/10 text-red-500 border-red-500/20"
            : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`status-badge ${colorClass} inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide`}>
      {(normalized === "overdue" || normalized === "cancelled") && <AlertCircle size={14} />}
      {status ?? "unknown"}
    </span>
  );
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ArrowDown size={14} className="opacity-30" />;
  return order === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
}

function lineTotal(item: InvoiceItem): string {
  const price = parseFloat(String(item?.price ?? 0));
  const qty = Number(item?.quantity ?? 0);
  const discount = parseFloat(String(item?.discount ?? 0));
  return (price * qty - discount * qty).toLocaleString();
}

export default function InvoicesPage() {
  const { user, isAdmin } = useDashboard();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [refresh, setRefresh] = useState(false);
  const lastParamsRef = useRef("");

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, statusFilter, sortBy, sortOrder, refresh });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await getInvoices(page, 10, searchQuery, {
          status: statusFilter,
          sortBy,
          sortOrder,
        });
        setInvoices(response.data ?? []);
        setPagination(response.pagination ?? null);
      } catch (err) {
        setError(err instanceof Error ? err?.message : "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [page, searchQuery, statusFilter, sortBy, sortOrder, refresh]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Are you sure you want to mark this invoice as Paid?")) return;
    try {
      await updateInvoiceStatus(id, "paid");
      setRefresh(!refresh);
    } catch (err) {
      alert(err instanceof Error ? err?.message : "Failed to update status");
    }
  };

  const columns: Array<{ key: SortBy; label: string }> = [
    { key: "invoiceNumber", label: "Invoice Number" },
    { key: "customer", label: "Customer" },
    { key: "totalAmount", label: "Total Amount" },
    { key: "date", label: "Date" },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Invoices Management</h1>
        {isAdmin && (
          <button
            className="primary-btn"
            onClick={() => {
              setEditingInvoice(null);
              setShowForm(true);
            }}
          >
            <Plus size={20} />
            Create New Invoice
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by customer, invoice ID or product name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="status-filter-select"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="invoice-list">
          {/* Sortable header row */}
          {!loading && invoices.length > 0 && (
            <div className="invoice-header-row" role="row">
              {columns.map((col) => (
                <button
                  key={col.key}
                  type="button"
                  className="invoice-header-cell"
                  onClick={() => handleSort(col.key)}
                  aria-sort={sortBy === col.key ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}
                >
                  {col.label}
                  <SortIcon active={sortBy === col.key} order={sortOrder} />
                </button>
              ))}
              <span className="invoice-header-cell" aria-hidden="true" />
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <p>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">No invoices found for the selected criteria.</div>
          ) : (
            invoices.map((invoice) => (
              <div
                key={invoice?._id || invoice?.invoiceId}
                className={`invoice-item status-${invoice?.status ?? "pending"} cursor-pointer`}
                onClick={() => setDetailInvoice(invoice)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailInvoice(invoice);
                  }
                }}
              >
                <div className="invoice-id-col">
                  <div className="invoice-id">{invoice?.invoiceId ?? "—"}</div>
                  <div className="invoice-customer">{invoice?.customer ?? "—"}</div>
                </div>
                <div className="invoice-amount-col">
                  <div className="invoice-amount">{parseFloat(String(invoice?.amount ?? 0)).toLocaleString()} EGP</div>
                  <div className="invoice-date">{invoice?.date ?? "—"}</div>
                </div>
                <div className="invoice-actions-col" onClick={(e) => e.stopPropagation()}>
                  <StatusBadge status={invoice?.status} />
                  {isAdmin && invoice?.status !== "paid" && (
                    <button
                      className="mark-paid-btn"
                      onClick={() => handleMarkAsPaid(invoice?._id ?? "")}
                    >
                      <CheckCircle size={14} />
                      Paid
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="edit-invoice-btn"
                      onClick={() => {
                        setEditingInvoice(invoice);
                        setShowForm(true);
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-controls">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage(page - 1)}
                className="pagination-btn"
              >
                Previous
              </button>
              <div className="pagination-info">
                Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
              </div>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => setPage(page + 1)}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            setRefresh(!refresh);
          }}
          initialData={editingInvoice || undefined}
        />
      )}

      {/* Invoice detail modal */}
      {detailInvoice && (
        <div
          className="invoice-modal-overlay"
          onClick={() => setDetailInvoice(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Invoice ${detailInvoice?.invoiceId ?? ""} details`}
        >
          <div className="invoice-modal" onClick={(e) => e.stopPropagation()}>
            <div className="invoice-modal-header">
              <h2 className="invoice-modal-title">Invoice {detailInvoice?.invoiceId ?? "—"}</h2>
              <button
                className="invoice-modal-close"
                onClick={() => setDetailInvoice(null)}
                aria-label="Close invoice details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="invoice-modal-meta">
              <div>
                <span className="invoice-modal-label">Customer</span>
                <span className="invoice-modal-value">{detailInvoice?.customer ?? "—"}</span>
              </div>
              <div>
                <span className="invoice-modal-label">Email</span>
                <span className="invoice-modal-value">{detailInvoice?.customerEmail ?? "—"}</span>
              </div>
              <div>
                <span className="invoice-modal-label">Status</span>
                <StatusBadge status={detailInvoice?.status} />
              </div>
              <div>
                <span className="invoice-modal-label">Created</span>
                <span className="invoice-modal-value">
                  {detailInvoice?.createdAt
                    ? new Date(detailInvoice.createdAt).toLocaleDateString()
                    : detailInvoice?.date ?? "—"}
                </span>
              </div>
              <div>
                <span className="invoice-modal-label">Total Amount</span>
                <span className="invoice-modal-value invoice-modal-total">
                  {parseFloat(String(detailInvoice?.amount ?? 0)).toLocaleString()} EGP
                </span>
              </div>
            </div>

            <div className="invoice-modal-items">
              <h3 className="invoice-modal-subtitle">Line Items</h3>
              {(detailInvoice?.items ?? []).length === 0 ? (
                <p className="invoice-modal-empty">No line items on this invoice.</p>
              ) : (
                <table className="invoice-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailInvoice?.items ?? []).map((item, idx) => (
                      <tr key={item?.productId || idx}>
                        <td>{item?.name ?? "—"}</td>
                        <td>{Number(item?.quantity ?? 0)}</td>
                        <td>{parseFloat(String(item?.price ?? 0)).toLocaleString()} EGP</td>
                        <td>{lineTotal(item)} EGP</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-secondary);
          gap: 1rem;
        }
        .status-filter-select {
          padding: 0.625rem 0.875rem;
          border-radius: 10px;
          border: 1px solid var(--border-tech, rgba(255, 255, 255, 0.1));
          background: var(--bg-card, transparent);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .invoice-header-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr auto;
          gap: 1.5rem;
          padding: 0 1.5rem;
        }
        .invoice-header-cell {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          padding: 0;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
          cursor: pointer;
          text-align: left;
        }
        .invoice-header-cell:hover {
          color: var(--text-primary);
        }
        .invoice-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          padding: 1rem;
        }
        .invoice-modal {
          background: var(--bg-card, #111);
          border: 1px solid var(--border-tech, rgba(255, 255, 255, 0.1));
          border-radius: 16px;
          max-width: 640px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          padding: 1.5rem;
        }
        .invoice-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .invoice-modal-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }
        .invoice-modal-close {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          display: flex;
        }
        .invoice-modal-close:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.06);
        }
        .invoice-modal-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .invoice-modal-meta > div {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .invoice-modal-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
        }
        .invoice-modal-value {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .invoice-modal-total {
          font-weight: 900;
        }
        .invoice-modal-subtitle {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .invoice-modal-empty {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .invoice-items-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .invoice-items-table th {
          text-align: left;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
          padding: 0.5rem 0.25rem;
          border-bottom: 1px solid var(--border-tech, rgba(255, 255, 255, 0.1));
        }
        .invoice-items-table td {
          padding: 0.5rem 0.25rem;
          color: var(--text-primary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
}
