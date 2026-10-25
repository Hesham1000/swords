"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText, Plus, Search, CheckCircle, AlertCircle, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import InvoiceForm from "../../components/invoice-form";
import { getInvoices, updateInvoiceStatus, deleteInvoice, Invoice, InvoicesResponse } from "../../lib/api/invoice";
import { useDashboard } from "../layout";

export default function InvoicesPage() {
  const { user, isAdmin } = useDashboard();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<InvoicesResponse["pagination"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [confirmAction, setConfirmAction] = useState<{ type: "paid" | "delete"; invoice: Invoice } | null>(null);
  const lastParamsRef = useRef("");

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, refresh });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await getInvoices(page, 10, searchQuery);
        setInvoices(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [page, searchQuery, refresh]);

  const filteredInvoices = (invoices ?? []).filter(inv => statusFilter === "all" || inv.status === statusFilter);

  const sortedInvoices = sortField
    ? [...filteredInvoices].sort((a, b) => {
        let cmp = 0;
        switch (sortField) {
          case "date":
            cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case "customer":
            cmp = (a.customer ?? "").localeCompare(b.customer ?? "");
            break;
          case "amount":
            cmp = (a.amount ?? 0) - (b.amount ?? 0);
            break;
          case "status":
            cmp = (a.status ?? "").localeCompare(b.status ?? "");
            break;
        }
        return sortDir === "desc" ? cmp * -1 : cmp;
      })
    : filteredInvoices;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, invoice } = confirmAction;
    try {
      if (type === "paid") {
        await updateInvoiceStatus(invoice._id!, "paid");
      } else {
        await deleteInvoice(invoice._id!);
      }
      setConfirmAction(null);
      setRefresh(!refresh);
    } catch (err) {
      alert(err instanceof Error ? err.message : (type === "paid" ? "Failed to update status" : "Failed to delete invoice"));
    }
  };

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
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="status-filter-select"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="invoice-list">
          <div className="invoice-header-row">
            {[
              { field: "date", label: "Date" },
              { field: "customer", label: "Customer" },
              { field: "amount", label: "Amount" },
              { field: "status", label: "Status" },
            ].map((col) => (
              <button
                key={col.field}
                type="button"
                className={`invoice-header-btn ${sortField === col.field ? "active" : ""}`}
                onClick={() => handleSort(col.field)}
              >
                {col.label}
                {sortField === col.field && (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
              </button>
            ))}
          </div>
          {loading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton-row">
                  <div className="skeleton-bar animate-pulse" style={{ width: "18%" }} />
                  <div className="skeleton-bar animate-pulse" style={{ width: "30%" }} />
                  <div className="skeleton-bar animate-pulse" style={{ width: "22%" }} />
                  <div className="skeleton-bar animate-pulse" style={{ width: "14%" }} />
                </div>
              ))}
            </>
          ) : sortedInvoices.length === 0 ? (
            <div className="empty-state">No invoices found.</div>
          ) : (
            sortedInvoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col">
                  <div className="invoice-id">{invoice.invoiceId}</div>
                  <div className="invoice-customer">{invoice.customer}</div>
                </div>
                <div className="invoice-amount-col">
                  <div className="invoice-amount">{invoice.amount.toLocaleString()} EGP</div>
                  <div className="invoice-date">{invoice.date}</div>
                </div>
                <div className="invoice-actions-col">
                  <span className={`status-badge status-${invoice.status}`}>
                    {invoice.status === "overdue" && <AlertCircle size={14} />}
                    {invoice.status}
                  </span>
                  {isAdmin && invoice.status !== "paid" && (
                    <button
                      className="mark-paid-btn"
                      onClick={() => setConfirmAction({ type: "paid", invoice })}
                    >
                      <CheckCircle size={14} />
                      Paid
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="delete-invoice-btn"
                      onClick={() => setConfirmAction({ type: "delete", invoice })}
                    >
                      <Trash2 size={14} />
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

        {(pagination?.totalPages ?? 0) > 1 && (
          <div className="pagination-container">
            <div className="pagination-controls">
              <button
                disabled={!pagination?.hasPrevPage}
                onClick={() => setPage(page - 1)}
                className="pagination-btn"
              >
                Previous
              </button>
              <div className="pagination-info">
                Page <strong>{pagination?.page}</strong> of <strong>{pagination?.totalPages ?? 1}</strong>
              </div>
              <button
                disabled={!pagination?.hasNextPage}
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

      {confirmAction && (
        <div className="confirm-overlay">
          <div className="confirm-card">
            <h3 className="confirm-title">Confirm Action</h3>
            <p className="confirm-message">
              {confirmAction.type === "paid"
                ? `Mark invoice ${confirmAction.invoice.invoiceId} as Paid?`
                : `Delete invoice ${confirmAction.invoice.invoiceId}? This cannot be undone.`}
            </p>
            <div className="confirm-actions">
              <button type="button" className="confirm-cancel" onClick={() => setConfirmAction(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={confirmAction.type === "delete" ? "confirm-danger" : "confirm-primary"}
                onClick={handleConfirm}
              >
                {confirmAction.type === "delete" ? "Delete" : "Mark as Paid"}
              </button>
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
          padding: 0.625rem 1rem;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          font-family: var(--font-sans);
          font-size: 13px;
          color: var(--text-primary);
          cursor: pointer;
        }
        .invoice-header-row {
          display: flex;
          align-items: center;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-tech);
          gap: 1rem;
        }
        .invoice-header-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-family: var(--font-display);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          cursor: pointer;
          padding: 0;
        }
        .invoice-header-btn:hover, .invoice-header-btn.active {
          color: var(--accent-blue);
        }
        .skeleton-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border-tech);
        }
        .skeleton-bar {
          height: 14px;
          border-radius: 6px;
          background: rgba(107, 114, 128, 0.4);
        }
        .delete-invoice-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: transparent;
          border: 1px solid rgba(225, 29, 72, 0.4);
          color: #e11d48;
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
          cursor: pointer;
          font-size: 12px;
        }
        .delete-invoice-btn:hover {
          background: rgba(225, 29, 72, 0.1);
        }
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .confirm-card {
          background: var(--bg-card, #111);
          border: 1px solid var(--border-tech);
          border-radius: 12px;
          padding: 1.5rem;
          width: min(400px, 90vw);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .confirm-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-primary);
        }
        .confirm-message {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .confirm-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        .confirm-cancel, .confirm-primary, .confirm-danger {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .confirm-cancel {
          background: transparent;
          border: 1px solid var(--border-tech);
          color: var(--text-primary);
        }
        .confirm-primary {
          background: var(--accent-blue, #3b82f6);
          border: none;
          color: white;
        }
        .confirm-danger {
          background: #e11d48;
          border: none;
          color: white;
        }
      `}</style>
    </div>
  );
}
