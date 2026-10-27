/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import { getInventoryLogs, InventoryLog } from "../../lib/api/inventory";
import { motion } from "framer-motion";
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
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1
          className="page-title"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontSize: "24px",
          }}
        >
          Inventory Audit Trail
        </h1>
      </motion.div>

      {error && <div className="error-banner">{error}</div>}

      <div className="list-card full-width">
        <table className="md-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Change</th>
              <th>Reason</th>
              <th style={{ textAlign: "right" }}>Date &amp; Time</th>
            </tr>
          </thead>
          <tbody>
          {loading ? (
            <tr>
              <td colSpan={4}>
                <div className="loading-state"><Loader2 className="animate-spin" /></div>
              </td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <motion.div
                  className="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  No transaction history found.
                </motion.div>
              </td>
            </tr>
          ) : (
            logs.map((log, index) => (
              <motion.tr
                key={log._id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <td>
                  <span className="log-product-name">{log.productName}</span>
                  <span className="log-product-id">ID: {log.productId}</span>
                </td>
                <td>
                  <span className={log.changeAmount > 0 ? "md-badge-green" : "md-badge-red"}>
                    {log.changeAmount > 0 ? "+" : ""}{log.changeAmount}
                  </span>
                  <span className="log-new-qty" style={{ color: "var(--text-secondary)" }}>
                    New Stock: {log.newQuantity}
                  </span>
                </td>
                <td>
                  <span className="log-reason" style={{ color: "var(--text-primary)" }}>{log.reason}</span>
                  {log.note && <span className="log-note">{log.note}</span>}
                </td>
                <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>
                  <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </td>
              </motion.tr>
            ))
          )}
          </tbody>
        </table>

        {pagination && pagination.totalItems > 0 && (
          <div className="pagination-footer">
            <div className="pagination-info">
              Showing page <span>{pagination.currentPage}</span> of <span>{pagination.totalPages}</span>
              <span className="total-count">({pagination.totalItems} logs)</span>
            </div>
            <div className="pagination-btns">
              <button
                className="md-btn-outlined"
                disabled={!pagination.hasPrevPage || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button
                className="md-btn-outlined"
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
        .loading-state { padding: 4rem; text-align: center; color: var(--primary); }
        .empty-state { padding: 4rem; text-align: center; color: var(--text-secondary); }
        
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
      `}</style>
    </div>
  );
}
