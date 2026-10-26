"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, CheckCircle, AlertCircle } from "lucide-react";
import InvoiceForm from "../../components/invoice-form";
import { getInvoices, updateInvoiceStatus, Invoice } from "../../lib/api/invoice";
import { useDashboard } from "../layout";

export default function InvoicesPage() {
  const { isAdmin } = useDashboard();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ page: number; limit: number; totalPages: number; totalCount: number; hasNextPage: boolean; hasPrevPage: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter] = useState("");
    const [sortOrder] = useState("newest");
  const [refresh, setRefresh] = useState(false);
  const lastParamsRef = useRef("");

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, statusFilter, sortOrder, refresh });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const response = await getInvoices(page, 10, searchQuery, statusFilter, sortOrder);
        setInvoices(response.data);
        setPagination(response.pagination ?? null);
      } catch (err) {
        setError((err instanceof Error ? err.message : undefined) || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, [page, searchQuery, statusFilter, sortOrder, refresh]);

  const handleMarkAsPaid = async (id: string) => {
    if (!confirm("Are you sure you want to mark this invoice as Paid?")) return;
    try {
      await updateInvoiceStatus(id, "paid");
      setRefresh(!refresh);
    } catch (err) {
      alert((err instanceof Error ? err.message : undefined) || "Failed to update status");
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
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="invoice-list">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border-tech)] bg-white/[0.02] p-4">
                  <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-3.5 w-48" />
                    <div className="skeleton h-3 w-32" />
                  </div>
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state-container">
              <Search className="empty-state-icon" />
              <h2 className="empty-state-title">No invoices found</h2>
              <p className="empty-state-description">No invoices match your current search or filters.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice._id || invoice.invoiceId} className={`invoice-item status-${invoice.status}`}>
                <div className="invoice-id-col">
                  <div className="invoice-id">{invoice.invoiceId}</div>
                  <div className="invoice-customer">{invoice.customer}</div>
                </div>
                <div className="invoice-amount-col">
                  <div className="invoice-amount">{parseFloat(String(invoice.amount ?? 0)).toLocaleString()} EGP</div>
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
      
      
    </div>
  );
}
