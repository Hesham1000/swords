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
  const [pagination, setPagination] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.message || "Failed to load invoices");
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
    } catch (err: any) {
      alert(err.message || "Failed to update status");
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
            placeholder="Search by customer..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>
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
      `}</style>
    </div>
  );
}
