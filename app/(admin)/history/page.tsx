"use client";

import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Loader2, Search } from "lucide-react";
import { getInventoryLogs, InventoryLog } from "../../lib/api/inventory";
import { useDashboard } from "../layout";

export default function HistoryPage() {
  const { user, isAdmin } = useDashboard();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalItems: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const lastParamsRef = useRef("");
  const searchTimeoutRef = useRef<number | null>(null);

  // Debounced search: reset page and refetch 400ms after typing stops
  useEffect(() => {
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      setPage(1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current !== null) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, filterType, filterDateRange });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getInventoryLogs(page, 10, undefined, searchQuery, filterType, filterDateRange);
        setLogs(response?.data ?? []);
        if (response?.pagination) {
          setPagination(response.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, searchQuery, filterType, filterDateRange]);

  const sortedLogs = [...(logs ?? [])].sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return sortBy === "newest" ? tb - ta : ta - tb;
  });

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Inventory Audit Trail</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={14} />
          <input
            type="text"
            placeholder="Search product, reason, note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input search-input"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="filter-input"
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          <option value="product">Product</option>
          <option value="invoice">Invoice</option>
          <option value="wallet">Wallet</option>
          <option value="shipment">Shipment</option>
        </select>
        <select
          value={filterDateRange}
          onChange={(e) => {
            setFilterDateRange(e.target.value);
            setPage(1);
          }}
          className="filter-input"
          aria-label="Filter by date range"
        >
          <option value="all">All Time</option>
          <option value="last7">Last 7 Days</option>
          <option value="last30">Last 30 Days</option>
          <option value="last90">Last 90 Days</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
          className="filter-input"
          aria-label="Sort order"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      <div className="list-card full-width">
        <div className="history-list">
          <div className="history-header-row">
            <div className="history-col-product">Product</div>
            <div className="history-col-change">Change</div>
            <div className="history-col-reason">Reason</div>
            <div className="history-col-date text-right">Date & Time</div>
          </div>

          {loading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <span>Loading history...</span>
            </div>
          ) : (logs?.length ?? 0) === 0 ? (
            <div className="empty-state">No transaction history found.</div>
          ) : (
            sortedLogs.map((log) => (
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
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .search-input-wrapper {
          position: relative;
          flex: 1 1 220px;
          min-width: 200px;
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }
        .filter-input {
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 12px;
          padding: 0.5rem 0.75rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .filter-input:focus {
          border-color: var(--accent-blue);
        }
        .search-input {
          width: 100%;
          padding-left: 2rem;
        }
        .filter-bar select.filter-input {
          cursor: pointer;
        }
        
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
