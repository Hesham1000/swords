"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { TrendingUp, Loader2, Search, ArrowUp, ArrowDown } from "lucide-react";
import { getInventoryLogs, InventoryLog } from "../../lib/api/inventory";
import { useDashboard } from "../layout";

export default function HistoryPage() {
  const { user, isAdmin } = useDashboard();
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalItems: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const lastParamsRef = useRef("");

  // Columns the API cannot sort by — sorted client-side on the fetched logs.
  const CLIENT_SORT_COLUMNS = ["productName", "action", "reason"] as const;
  const isClientSort = (CLIENT_SORT_COLUMNS as readonly string[]).includes(sortBy);

  // Debounce search input by 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fromDate, toDate, sortBy, sortOrder]);

  useEffect(() => {
    const params = JSON.stringify({ page, search: debouncedSearch, fromDate, toDate, sortBy, sortOrder });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await getInventoryLogs(page, 10, undefined, {
          search: debouncedSearch || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          sortBy: isClientSort ? "createdAt" : sortBy,
          sortOrder: isClientSort ? "desc" : sortOrder,
        });
        setLogs(response?.data ?? []);
        if (response?.pagination) {
          setPagination(response.pagination);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, debouncedSearch, fromDate, toDate, sortBy, sortOrder]);

  const handleHeaderSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder(column === "createdAt" ? "desc" : "asc");
    }
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) return null;
    return sortOrder === "desc" ? (
      <ArrowDown size={12} className="inline-block ml-1" />
    ) : (
      <ArrowUp size={12} className="inline-block ml-1" />
    );
  };

  // Client-side sort for columns the API does not support (productName, action, reason).
  const sortedLogs = useMemo(() => {
    if (!isClientSort) return logs;
    const key = sortBy as (typeof CLIENT_SORT_COLUMNS)[number];
    return [...logs].sort((a, b) => {
      const av = a?.[key] ?? "";
      const bv = b?.[key] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [logs, isClientSort, sortBy, sortOrder]);

  const filterInputClasses =
    "bg-white/5 border border-[var(--border-tech)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-colors";

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Inventory Audit Trail</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or action..."
              className={`${filterInputClasses} pl-8 w-56`}
            />
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={filterInputClasses}
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={filterInputClasses}
            aria-label="To date"
          />
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [col, order] = e.target.value.split(":");
              setSortBy(col);
              setSortOrder(order as "asc" | "desc");
            }}
            className={filterInputClasses}
            aria-label="Sort logs"
          >
            <option value="createdAt:desc">Newest First</option>
            <option value="createdAt:asc">Oldest First</option>
            <option value="quantityChange:desc">Quantity Change (High to Low)</option>
            <option value="quantityChange:asc">Quantity Change (Low to High)</option>
          </select>
        </div>

        <div className="history-list">
          <div className="history-header-row">
            <div
              className="history-col-date cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
              onClick={() => handleHeaderSort("createdAt")}
            >
              Date{renderSortIcon("createdAt")}
            </div>
            <div
              className="history-col-product cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
              onClick={() => handleHeaderSort("productName")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleHeaderSort("productName")}
            >
              Product{renderSortIcon("productName")}
            </div>
            <div
              className="history-col-change cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
              onClick={() => handleHeaderSort("action")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleHeaderSort("action")}
            >
              Action{renderSortIcon("action")}
            </div>
            <div
              className="history-col-change cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
              onClick={() => handleHeaderSort("quantityChange")}
            >
              Quantity Change{renderSortIcon("quantityChange")}
            </div>
            <div
              className="history-col-reason cursor-pointer hover:text-[var(--accent-blue)] transition-colors"
              onClick={() => handleHeaderSort("reason")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleHeaderSort("reason")}
            >
              Reason{renderSortIcon("reason")}
            </div>
          </div>

          {loading ? (
            <div className="loading-state"><Loader2 className="animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">No inventory logs found for the selected criteria.</div>
          ) : (
            sortedLogs.map((log) => (
              <div key={log?._id ?? log?.productId} className="history-item">
                <div className="history-col-date text-right">
                  <span>{log?.timestamp ? new Date(log.timestamp).toLocaleDateString() : "-"}</span>
                  <span>{log?.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ""}</span>
                </div>
                <div className="history-col-product">
                  <span className="log-product-name">{log?.productName ?? "Unknown product"}</span>
                  <span className="log-product-id">ID: {log?.productId ?? "-"}</span>
                </div>
                <div className="history-col-change">
                  <span className="log-reason">{log?.action ?? "-"}</span>
                </div>
                <div className="history-col-change">
                  <span className={`log-amount ${(log?.quantityChange ?? 0) > 0 ? "positive" : "negative"}`}>
                    {(log?.quantityChange ?? 0) > 0 ? "+" : ""}{log?.quantityChange ?? 0}
                  </span>
                </div>
                <div className="history-col-reason">
                  <span className="log-reason">{log?.reason ?? "-"}</span>
                  {log?.note && <span className="log-note">{log.note}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {pagination && pagination?.totalItems > 0 && (
          <div className="pagination-footer">
            <div className="pagination-info">
              Showing page <span>{pagination?.currentPage}</span> of <span>{pagination?.totalPages}</span>
              <span className="total-count">({pagination?.totalItems} logs)</span>
            </div>
            <div className="pagination-btns">
              <button
                className="pag-btn"
                disabled={!pagination?.hasPrevPage || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button
                className="pag-btn"
                disabled={!pagination?.hasNextPage || loading}
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
