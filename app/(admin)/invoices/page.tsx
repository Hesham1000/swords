"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText, Plus, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import InvoiceForm from "../../components/invoice-form";
import { getInvoices, updateInvoiceStatus, Invoice } from "../../lib/api/invoice";
import { useDashboard } from "../layout";

export default function InvoicesPage() {
  const { user, isAdmin } = useDashboard();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; hasPrevPage: boolean; hasNextPage: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [refresh, setRefresh] = useState(false);
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
        setPagination(response.pagination ?? null);
      } catch (err) {
        setError((err instanceof Error ? err.message : String(err)) || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [page, searchQuery, refresh]);

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Are you sure you want to mark this invoice as Paid?")) return;
    try {
      await updateInvoiceStatus(id, "paid");
      setRefresh(!refresh);
    } catch (err) {
      alert((err instanceof Error ? err.message : String(err)) || "Failed to update status");
    }
  };

  const displayedInvoices = (() => {
    let list = invoices;
    if (statusFilter !== "all") {
      list = list.filter(
        (invoice) => (invoice?.status || "").toLowerCase() === statusFilter
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortOrder) {
        case "oldest":
          return new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime();
        case "amount-desc":
          return (b?.amount || 0) - (a?.amount || 0);
        case "amount-asc":
          return (a?.amount || 0) - (b?.amount || 0);
        case "newest":
        default:
          return new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime();
      }
    });
    return sorted;
  })();

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
          className="filter-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="shipped">Shipped</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="filter-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount-desc">Amount High-Low</option>
          <option value="amount-asc">Amount Low-High</option>
        </select>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="invoice-list">
          {loading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <p>Loading invoices...</p>
            </div>
          ) : displayedInvoices.length === 0 ? (
            <div className="empty-state">No invoices found.</div>
          ) : (
            displayedInvoices.map((invoice) => (
              <div key={invoice?._id || invoice?.invoiceId} className={`invoice-item status-${invoice?.status ?? ""}`}>
                <div className="invoice-id-col">
                  <div className="invoice-id">{invoice?.invoiceId ?? ""}</div>
                  <div className="invoice-customer">{invoice?.customer ?? ""}</div>
                </div>
                <div className="invoice-amount-col">
                  <div className="invoice-amount">{((invoice?.amount ?? 0).toLocaleString())} EGP</div>
                  <div className="invoice-date">{invoice?.date ?? ""}</div>
                </div>
                <div className="invoice-actions-col">
                  <span className={`status-badge status-${invoice?.status ?? ""}`}>
                    {invoice?.status === "overdue" && <AlertCircle size={14} />}
                    {invoice?.status ?? ""}
                  </span>
                  {isAdmin && invoice?.status !== "paid" && (
                    <button
                      className="mark-paid-btn"
                      onClick={() => handleMarkAsPaid(invoice?._id || invoice?.invoiceId || "")}
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
        
        {pagination && (pagination?.totalPages ?? 0) > 1 && (
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
                Page <strong>{pagination?.page ?? 1}</strong> of <strong>{pagination?.totalPages ?? 1}</strong>
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
        .filter-select {
          padding: 0.6rem 1rem;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
