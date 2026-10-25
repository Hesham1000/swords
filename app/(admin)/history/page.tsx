"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TrendingUp, X, ArrowUp, ArrowDown, Search } from "lucide-react";
import { getInventoryLogs, InventoryLog } from "../../lib/api/inventory";
import { useDashboard } from "../layout";

type DerivedType = "Deposit" | "Withdrawal" | "Shipment" | "Invoice" | "Other";
type SortKey = "date" | "type" | "amount" | "status";
type SortDir = "asc" | "desc";

/** Derive a transaction type from the reason string. */
function deriveType(reason: string): DerivedType {
  const r = (reason || "").toLowerCase();
  if (r.includes("deposit")) return "Deposit";
  if (r.includes("withdraw")) return "Withdrawal";
  if (r.includes("ship")) return "Shipment";
  if (r.includes("invoice")) return "Invoice";
  return "Other";
}

/** Derive status from the change amount. */
function deriveStatus(changeAmount: number): "Completed" | "No Change" {
  return changeAmount !== 0 ? "Completed" : "No Change";
}

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

  // Search + filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | DerivedType>("All");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Detail modal
  const [selectedLog, setSelectedLog] = useState<InventoryLog | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const params = JSON.stringify({ page });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getInventoryLogs(page);
        setLogs(response.data ?? []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return (logs ?? []).filter((log) => {
      const txnId = log.referenceId || log._id || "";
      if (
        search &&
        !(
          (log.productName || "").toLowerCase().includes(search) ||
          (log.reason || "").toLowerCase().includes(search) ||
          txnId.toLowerCase().includes(search)
        )
      ) {
        return false;
      }
      if (typeFilter !== "All" && deriveType(log.reason) !== typeFilter) {
        return false;
      }
      if (dateFrom || dateTo) {
        const ts = new Date(log.timestamp);
        if (dateFrom && ts < new Date(`${dateFrom}T00:00:00`)) return false;
        if (dateTo && ts > new Date(`${dateTo}T23:59:59`)) return false;
      }
      return true;
    });
  }, [logs, search, typeFilter, dateFrom, dateTo]);

  // Sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "type":
          return deriveType(a.reason).localeCompare(deriveType(b.reason)) * dir;
        case "amount":
          return (a.changeAmount - b.changeAmount) * dir;
        case "status":
          return deriveStatus(a.changeAmount).localeCompare(deriveStatus(b.changeAmount)) * dir;
        case "date":
        default:
          return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const renderSortArrow = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ArrowUp className="sort-arrow" size={12} />
    ) : (
      <ArrowDown className="sort-arrow" size={12} />
    );
  };

  const hasActiveFilters = search || dateFrom || dateTo || typeFilter !== "All";

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Inventory Audit Trail</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        {/* Filter bar */}
        <div className="history-filter-bar">
          <div className="history-search-wrap">
            <Search size={14} className="history-search-icon" />
            <input
              type="text"
              className="history-search-input"
              placeholder="Search product, reason, or transaction ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search transaction history"
            />
          </div>
          <div className="history-filter-controls">
            <div className="history-date-group">
              <input
                type="date"
                className="history-date-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Filter from date"
              />
              <span className="history-date-sep">–</span>
              <input
                type="date"
                className="history-date-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Filter to date"
              />
            </div>
            <select
              className="history-type-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "All" | DerivedType)}
              aria-label="Filter by type"
            >
              <option value="All">All Types</option>
              <option value="Deposit">Deposit</option>
              <option value="Withdrawal">Withdrawal</option>
              <option value="Shipment">Shipment</option>
              <option value="Invoice">Invoice</option>
            </select>
            {hasActiveFilters && (
              <button
                className="history-clear-btn"
                onClick={() => {
                  setSearchInput("");
                  setDateFrom("");
                  setDateTo("");
                  setTypeFilter("All");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="history-list">
          <div className="history-header-row">
            <div className="history-col-product">Product</div>
            <div className="history-col-change">Change</div>
            <div className="history-col-reason">Reason</div>
            <div className="history-col-date text-right">
              <button className="history-sort-btn" onClick={() => toggleSort("date")}>
                Date &amp; Time {renderSortArrow("date")}
              </button>
            </div>
          </div>
          <div className="history-sort-row">
            <button className="history-sort-btn" onClick={() => toggleSort("type")}>
              Type {renderSortArrow("type")}
            </button>
            <button className="history-sort-btn" onClick={() => toggleSort("amount")}>
              Amount {renderSortArrow("amount")}
            </button>
            <button className="history-sort-btn" onClick={() => toggleSort("status")}>
              Status {renderSortArrow("status")}
            </button>
          </div>

          {loading ? (
            <div aria-busy="true" aria-label="Loading transaction history">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="history-item history-skeleton-row">
                  <div className="history-col-product">
                    <div className="animate-pulse bg-slate-200 rounded h-4 w-3/4 mb-2" />
                    <div className="animate-pulse bg-slate-200 rounded h-3 w-1/2" />
                  </div>
                  <div className="history-col-change">
                    <div className="animate-pulse bg-slate-200 rounded h-4 w-12 mb-2" />
                    <div className="animate-pulse bg-slate-200 rounded h-3 w-20" />
                  </div>
                  <div className="history-col-reason">
                    <div className="animate-pulse bg-slate-200 rounded h-4 w-2/3 mb-2" />
                    <div className="animate-pulse bg-slate-200 rounded h-3 w-1/3" />
                  </div>
                  <div className="history-col-date text-right">
                    <div className="animate-pulse bg-slate-200 rounded h-4 w-20 ml-auto mb-2" />
                    <div className="animate-pulse bg-slate-200 rounded h-3 w-16 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {hasActiveFilters ? "No transactions match your filters." : "No transaction history found."}
            </div>
          ) : (
            sorted.map((log) => {
              const type = deriveType(log.reason);
              const status = deriveStatus(log.changeAmount);
              return (
                <div
                  key={log._id || log.id}
                  className="history-item history-clickable"
                  onClick={() => setSelectedLog(log)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedLog(log);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${log.productName}`}
                >
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
              );
            })
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

      {/* Detail modal */}
      {selectedLog && (
        <div
          className="history-modal-overlay"
          onClick={() => setSelectedLog(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Transaction details"
        >
          <div
            className="history-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-modal-header">
              <h2 className="history-modal-title">Transaction Details</h2>
              <button
                className="history-modal-close"
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>
            <div className="history-modal-body">
              <div className="history-modal-row">
                <span className="history-modal-label">Product Name</span>
                <span className="history-modal-value">{selectedLog.productName}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Product ID</span>
                <span className="history-modal-value">{selectedLog.productId}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Change Amount</span>
                <span className={`history-modal-value log-amount ${selectedLog.changeAmount > 0 ? "positive" : "negative"}`}>
                  {selectedLog.changeAmount > 0 ? "+" : ""}{selectedLog.changeAmount}
                </span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">New Quantity</span>
                <span className="history-modal-value">{selectedLog.newQuantity}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Old Price</span>
                <span className="history-modal-value">
                  {selectedLog.oldPrice != null ? `$${selectedLog.oldPrice.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">New Price</span>
                <span className="history-modal-value">
                  {selectedLog.newPrice != null ? `$${selectedLog.newPrice.toFixed(2)}` : "—"}
                </span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Reason</span>
                <span className="history-modal-value">{selectedLog.reason}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Note</span>
                <span className="history-modal-value">{selectedLog.note || "—"}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Reference ID</span>
                <span className="history-modal-value">{selectedLog.referenceId || selectedLog._id || "—"}</span>
              </div>
              <div className="history-modal-row">
                <span className="history-modal-label">Timestamp</span>
                <span className="history-modal-value">
                  {new Date(selectedLog.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-state, .empty-state { padding: 4rem; text-align: center; color: var(--text-secondary); }

        .history-filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-tech);
        }
        .history-search-wrap {
          position: relative;
          flex: 1 1 240px;
          min-width: 200px;
        }
        .history-search-icon {
          position: absolute;
          left: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
        }
        .history-search-input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2rem;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s;
        }
        .history-search-input:focus {
          border-color: var(--accent-blue);
        }
        .history-filter-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .history-date-group {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .history-date-sep {
          color: var(--text-secondary);
          font-size: 12px;
        }
        .history-date-input,
        .history-type-select {
          padding: 0.4rem 0.6rem;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
        }
        .history-date-input:focus,
        .history-type-select:focus {
          border-color: var(--accent-blue);
        }
        .history-clear-btn {
          padding: 0.4rem 0.75rem;
          background: transparent;
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .history-clear-btn:hover {
          border-color: var(--accent-blue);
          color: var(--text-primary);
        }

        .history-sort-row {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem 1.5rem;
          border-bottom: 1px solid var(--border-tech);
          background: rgba(255, 255, 255, 0.02);
        }
        .history-sort-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          cursor: pointer;
          padding: 0.25rem 0.35rem;
          border-radius: 6px;
          transition: color 0.2s, background 0.2s;
        }
        .history-sort-btn:hover {
          color: var(--text-primary);
          background: rgba(59, 130, 246, 0.1);
        }
        .sort-arrow {
          color: var(--accent-blue);
        }

        .history-clickable {
          cursor: pointer;
          transition: background 0.2s;
        }
        .history-clickable:hover {
          background: rgba(59, 130, 246, 0.06);
        }
        .history-clickable:focus-visible {
          outline: 2px solid var(--accent-blue);
          outline-offset: -2px;
        }
        .history-skeleton-row {
          cursor: default;
          pointer-events: none;
        }

        .history-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .history-modal-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 1.5rem;
          max-width: 32rem;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
        }
        .history-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }
        .history-modal-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #111827;
        }
        .history-modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border: none;
          border-radius: 8px;
          background: #f3f4f6;
          color: #374151;
          cursor: pointer;
          transition: background 0.2s;
        }
        .history-modal-close:hover {
          background: #e5e7eb;
        }
        .history-modal-body {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .history-modal-row {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #f3f4f6;
        }
        .history-modal-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #6b7280;
          flex-shrink: 0;
        }
        .history-modal-value {
          font-size: 13px;
          color: #111827;
          text-align: right;
          word-break: break-word;
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
