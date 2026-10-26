"use client";

import React, { useState, useEffect, useRef } from "react";
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, Truck } from "lucide-react";
import WalletDepositForm from "../../components/wallet-deposit-form";
import ShipmentForm from "../../components/shipment-form";
import { getWalletBalance, getWalletTransactions, WalletTransaction } from "../../lib/api/wallet";
import { useDashboard } from "../layout";

export default function WalletPage() {
  const { user, isAdmin } = useDashboard();
  const [balance, setBalance] = useState({ EGP: 0, USD: 0, EUR: 0 });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [walletFormMode, setWalletFormMode] = useState<"deposit" | "withdraw">("deposit");
  const [showShipmentForm, setShowShipmentForm] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [sortField, setSortField] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalItems: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }>({
    totalPages: 0,
    totalItems: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const lastParamsRef = useRef("");

  useEffect(() => {
    const params = JSON.stringify({ refresh, page, filterType, sortField, sortOrder });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const [balanceRes, transactionsRes] = await Promise.all([
          getWalletBalance(),
          getWalletTransactions(page, filterType, 10, sortField, sortOrder),
        ]);
        setBalance({
          EGP: balanceRes.data?.balanceEGP ?? 0,
          USD: balanceRes.data?.balanceUSD ?? 0,
          EUR: balanceRes.data?.balanceEUR ?? 0,
        });
        setTransactions(transactionsRes.data ?? []);
        if (transactionsRes.pagination) {
          setPagination(transactionsRes.pagination);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load wallet data");
      } finally {
        setLoading(false);
      }
    };
    fetchWalletData();
  }, [refresh, page, filterType, sortField, sortOrder]);

const handleFilterChange = (value: string) => {
  setFilterType(value);
  setPage(1);
};

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortOrder(order => (order === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Wallet & Transactions</h1>
        <div className="header-actions">
          <button className="deposit-btn" onClick={() => { setWalletFormMode("deposit"); setShowDepositForm(true); }}>
            <Plus size={18} />
            <span>Deposit Fund</span>
          </button>
          <button className="withdraw-btn" onClick={() => { setWalletFormMode("withdraw"); setShowDepositForm(true); }}>
            <ArrowDownCircle size={18} />
            <span>Withdraw Fund</span>
          </button>
          <button className="shipment-btn" onClick={() => setShowShipmentForm(true)}>
            <Truck size={18} />
            <span>Record Shipment</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="animate-pulse bg-gray-200 rounded-lg block h-32 w-full" aria-hidden="true" />
          </div>
          <div className="stat-card">
            <div className="animate-pulse bg-gray-200 rounded-lg block h-32 w-full" aria-hidden="true" />
          </div>
          <div className="stat-card">
            <div className="animate-pulse bg-gray-200 rounded-lg block h-32 w-full" aria-hidden="true" />
          </div>
        </div>
      ) : (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Wallet size={20} /></div>
          <h3 className="stat-title">EGP Balance</h3>
          <p className="stat-value">EGP {balance.EGP.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Wallet size={20} /></div>
          <h3 className="stat-title">USD Balance</h3>
          <p className="stat-value">$ {balance.USD.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Wallet size={20} /></div>
          <h3 className="stat-title">EUR Balance</h3>
          <p className="stat-value">€ {balance.EUR.toLocaleString()}</p>
        </div>
      </div>
      )}

      <div className="list-card full-width">
        <div className="card-header">
          <h2 className="card-title">Transaction History</h2>
        </div>
        <div>
          <label htmlFor="tx-type-filter" className="sr-only">Filter by transaction type</label>
          <select
            id="tx-type-filter"
            value={filterType}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="mb-4 px-3 py-2 rounded-lg bg-white/5 border border-[var(--border-tech)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
          </select>
        </div>
        <div className="sort-header">
          <button
            className={`sort-col sort-date ${sortField === "date" ? "active" : ""}`}
            onClick={() => handleSort("date")}
          >
            Date {sortField === "date" && (sortOrder === "asc" ? "▲" : "▼")}
          </button>
          <button
            className={`sort-col sort-type ${sortField === "type" ? "active" : ""}`}
            onClick={() => handleSort("type")}
          >
            Type {sortField === "type" && (sortOrder === "asc" ? "▲" : "▼")}
          </button>
          <button
            className={`sort-col sort-amount ${sortField === "amount" ? "active" : ""}`}
            onClick={() => handleSort("amount")}
          >
            Amount {sortField === "amount" && (sortOrder === "asc" ? "▲" : "▼")}
          </button>
        </div>
        <div className="transaction-list">
          {loading ? (
            <div role="status" aria-label="Loading transactions">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-gray-200 rounded-lg block h-12 w-full mb-2" aria-hidden="true" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state" style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ margin: "0 auto 0.75rem", display: "block", opacity: 0.5 }}
              >
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              <h3 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>No transactions yet</h3>
              <p style={{ fontSize: "13px", opacity: 0.7, marginBottom: "1rem" }}>
                Your wallet activity will appear here once you make your first transaction.
              </p>
              <button
                className="deposit-btn"
                onClick={() => { setWalletFormMode("deposit"); setShowDepositForm(true); }}
              >
                <Plus size={18} />
                <span>Make a Deposit</span>
              </button>
            </div>
          ) : (
            transactions.map((tx, idx) => (
              <div key={idx} className="transaction-item">
                <div className="tx-icon">
                  {(tx.type === "invoice" || tx.type === "deposit") ? (
                    <ArrowUpCircle className="text-emerald-500" />
                  ) : (
                    <ArrowDownCircle className="text-rose-500" />
                  )}
                </div>
                <div className="tx-details">
                  <div className="tx-note">{tx.note}</div>
                  <div className="tx-date">{new Date(tx.date).toLocaleString()}</div>
                </div>
                <div className={`tx-amount ${(tx.type === "invoice" || tx.type === "deposit") ? "positive" : "negative"}`}>
                  {(tx.type === "invoice" || tx.type === "deposit") ? "+" : "-"}{tx.amount.toLocaleString()} {tx.currency}
                </div>
              </div>
            ))
          )}
        </div>

        {pagination && pagination.totalItems > 0 && (
          <div className="pagination-footer">
            <div className="pagination-info">
              Showing page <span>{pagination?.currentPage}</span> of <span>{pagination?.totalPages}</span>
              <span className="total-count">({pagination?.totalItems} transactions)</span>
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

      {showDepositForm && (
        <WalletDepositForm
          mode={walletFormMode}
          onClose={() => setShowDepositForm(false)}
          onSuccess={() => {
            setShowDepositForm(false);
            setRefresh(!refresh);
          }}
        />
      )}

      {showShipmentForm && (
        <ShipmentForm
          onClose={() => setShowShipmentForm(false)}
          onSuccess={() => {
            setShowShipmentForm(false);
            setRefresh(!refresh);
          }}
        />
      )}

      <style jsx>{`
        .transaction-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
        }
        .sort-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          margin: 0 1rem;
          border-bottom: 1px solid var(--border-tech);
        }
        .sort-col {
          background: none;
          border: none;
          padding: 0;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.2s;
        }
        .sort-col:hover { color: var(--text-primary); }
        .sort-col.active { color: var(--accent-blue); }
        .sort-date { flex: 1; padding-left: calc(20px + 1rem); }
        .sort-type { white-space: nowrap; }
        .sort-amount { margin-left: auto; text-align: right; }
        .transaction-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 12px;
          border: 1px solid var(--border-tech);
          transition: all 0.2s;
        }
        .transaction-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--accent-blue);
        }
        .tx-details { flex: 1; }
        .tx-note { font-weight: 700; color: var(--text-primary); }
        .tx-date { font-size: 11px; color: var(--text-secondary); }
        .tx-amount { font-weight: 800; font-family: var(--font-display); }
        .tx-amount.positive { color: #10b981; }
        .tx-amount.negative { color: #3b82f6; }
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
          display: flex; gap: 0.75rem;
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
