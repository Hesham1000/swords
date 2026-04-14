"use client";

import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { getInventoryLogs, InventoryLog } from "../../lib/api/inventory";
import { useDashboard } from "../layout";

export default function HistoryPage() {
  const { user, isAdmin } = useDashboard();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalItems: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const lastParamsRef = useRef("");

  useEffect(() => {
    const params = JSON.stringify({ page });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;
    
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getInventoryLogs(page);
        setLogs(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Inventory Audit Trail</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="history-list">
          <div className="history-header-row">
            <div className="history-col-product">Product</div>
            <div className="history-col-change">Change</div>
            <div className="history-col-reason">Reason</div>
            <div className="history-col-date text-right">Date & Time</div>
          </div>

          {loading ? (
            <div className="loading-state"><Loader2 className="animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">No transaction history found.</div>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="history-item">
                <div className="history-col-product">
                  <span className="log-product-name">{log.productName}</span>
                  <span className="log-product-id">ID: {log.productId}</span>
                </div>
                <div className="history-col-change">
                  <span className={`log-amount ${log.changeAmount > 0 ? "positive" : "negative"}`}>
                    {log.changeAmount > 0 ? "+" : ""}{log.changeAmount}
                  </span>
                  <span className="log-new-qty">New Stock: {log.newQuantity}</span>
                </div>
                <div className="history-col-reason">
                  <span className="log-reason">{log.reason}</span>
                  {log.note && <span className="log-note">{log.note}</span>}
                </div>
                <div className="history-col-date text-right">
                  <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {pagination && pagination.totalItems > 0 && (
          <div className="pagination-footer">
            <div className="pagination-info">
              Showing page <span>{pagination.currentPage}</span> of <span>{pagination.totalPages}</span>
              <span className="total-count">({pagination.totalItems} logs)</span>
            </div>
            <div className="pagination-btns">
              <button 
                className="pag-btn" 
                disabled={!pagination.hasPrevPage || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button 
                className="pag-btn" 
                disabled={!pagination.hasNextPage || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .loading-state, .empty-state { padding: 4rem; text-align: center; color: var(--text-secondary); }
        
        .pagination-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-top: 1px solid var(--border-tech);
          background: rgba(255, 255, 255, 0.02);
        }
        .pagination-info {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .pagination-info span {
          color: var(--text-primary);
          font-weight: 700;
          margin: 0 0.25rem;
        }
        .total-count {
          margin-left: 0.5rem;
          opacity: 0.6;
        }
        .pagination-btns {
          display: flex;
          gap: 0.75rem;
        }
        .pag-btn {
          padding: 0.5rem 1rem;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pag-btn:hover:not(:disabled) {
          border-color: var(--accent-blue);
          background: rgba(59, 130, 246, 0.1);
        }
        .pag-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
