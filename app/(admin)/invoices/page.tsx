"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FileText, Plus, Search, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import InvoiceForm from "../../components/invoice-form";
import { getInvoices, updateInvoiceStatus, deleteInvoice, Invoice } from "../../lib/api/invoice";
import { useDashboard } from "../layout";

export default function InvoicesPage() {
  const { user, isAdmin } = useDashboard();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "paid" | "pending" | "overdue">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refresh, setRefresh] = useState(false);
  const lastParamsRef = useRef("");

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, filterStatus, dateFrom, dateTo, refresh });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await getInvoices(page, 10, searchQuery, filterStatus || undefined, dateFrom || undefined, dateTo || undefined);
        setInvoices(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [page, searchQuery, filterStatus, dateFrom, dateTo, refresh]);

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Are you sure you want to mark this invoice as Paid?")) return;
    try {
      await updateInvoiceStatus(id, "paid");
      setRefresh(!refresh);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      await deleteInvoice(id);
      setRefresh(!refresh);
    } catch (err: any) {
      alert(err.message || "Failed to delete invoice");
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
          className="filter-select"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as "" | "paid" | "pending" | "overdue");
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
        <label className="filter-date-wrapper">
          <span className="filter-date-label">From</span>
          <input
            type="date"
            className="filter-date-input"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          />
        </label>
        <label className="filter-date-wrapper">
          <span className="filter-date-label">To</span>
          <input
            type="date"
            className="filter-date-input"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          />
        </label>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="invoice-list">
          {loading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <p>Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">No invoices found.</div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col">
                  <Link href={"/invoices/" + invoice._id} className="invoice-id-link" style={{ color: "var(--primary, #3498db)", textDecoration: "none" }}>{invoice.invoiceId}</Link>
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
                      onClick={() => handleMarkAsPaid(invoice._id!)}
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
                  {isAdmin && (
                    <button
                      className="delete-invoice-btn"
                      onClick={() => handleDeleteInvoice(invoice._id!)}
                    >
                      <Trash2 size={14} />
                      Delete
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
        .filter-select, .filter-date-input {
          padding: 0.875rem 1rem;
          background: var(--bg-card);
          border: 1px solid var(--border-tech);
          border-radius: 12px;
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .filter-select:focus, .filter-date-input:focus {
          outline: none;
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 4px rgba(0, 102, 255, 0.1);
        }
        .invoice-id-link {
          color: inherit;
          text-decoration: none;
        }
        .invoice-id-link:hover .invoice-id {
          text-decoration: underline;
        }
        .delete-invoice-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          background: rgba(220,38,38,0.08);
          color: #dc2626;
          border: 1px solid #dc2626;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .delete-invoice-btn:hover {
          background: #dc2626;
          color: #ffffff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220,38,38,0.35);
        }
          .delete-invoice-btn:active {
            transform: translateY(0) scale(0.98);
          }
      `}</style>
    </div>
  );
}
