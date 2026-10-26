"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, Truck, Loader2, Search } from "lucide-react";
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
  const [pagination, setPagination] = useState<{
    totalPages: number;
    totalItems: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  } | null>(null);
  const lastParamsRef = useRef("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">("newest");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const params = JSON.stringify({ refresh, page, debouncedSearch, filterCurrency, filterType });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const [balanceRes, transactionsRes] = await Promise.all([
          getWalletBalance(),
          getWalletTransactions(page, 10, debouncedSearch, filterCurrency, filterType),
        ]);
        setBalance({
          EGP: balanceRes?.data?.balanceEGP ?? 0,
          USD: balanceRes?.data?.balanceUSD ?? 0,
          EUR: balanceRes?.data?.balanceEUR ?? 0,
        });
        setTransactions(transactionsRes?.data ?? []);
        if (transactionsRes?.pagination) {
          setPagination(transactionsRes.pagination);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load wallet data");
      } finally {
        setLoading(false);
      }
    };
    fetchWalletData();
  }, [refresh, page, debouncedSearch, filterCurrency, filterType]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      sorted.sort((a, b) => b.amount - a.amount);
    }
    return sorted;
  }, [transactions, sortBy]);

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
        <div className="flex items-center justify-center gap-3 py-16">
          <Loader2 className="animate-spin text-[var(--accent-blue)]" size={28} />
          <span className="text-sm text-[var(--text-secondary)]">Loading wallet data...</span>
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
        <div className="flex flex-wrap items-center gap-3 px-4 pb-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search transactions..."
              className="w-full rounded-lg border border-[var(--border-tech)] bg-white/5 py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
            />
          </div>
          <select
            value={filterCurrency}
            onChange={(e) => { setFilterCurrency(e.target.value); setPage(1); }}
            className="rounded-lg border border-[var(--border-tech)] bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          >
            <option value="">All Currencies</option>
            <option value="EGP">EGP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="rounded-lg border border-[var(--border-tech)] bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          >
            <option value="">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="shipment">Shipment</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest" | "amount")}
            className="rounded-lg border border-[var(--border-tech)] bg-white/5 px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount">Highest Amount</option>
          </select>
        </div>
        <div className="transaction-list">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="animate-spin text-[var(--accent-blue)]" size={24} />
              <span className="text-sm text-[var(--text-secondary)]">Loading wallet data...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Wallet size={40} className="text-[var(--text-secondary)]" />
              <h3 className="text-base font-bold text-[var(--text-primary)]">No transactions yet</h3>
              <p className="text-sm text-[var(--text-secondary)]">Deposit funds to get started.</p>
            </div>
          ) : (
            sortedTransactions.map((tx, idx) => (
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
              Showing page <span>{pagination.currentPage}</span> of <span>{pagination.totalPages}</span>
              <span className="total-count">({pagination.totalItems} transactions)</span>
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

        /* Premium Wallet Button Styles */
        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .deposit-btn, .withdraw-btn, .shipment-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 12px;
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          border: 1px solid var(--border-tech);
        }

        .deposit-btn {
          background: rgba(var(--accent-gold-rgb), 0.1);
          color: var(--accent-gold);
          border-color: rgba(var(--accent-gold-rgb), 0.2);
        }
        .deposit-btn:hover {
          background: var(--accent-gold);
          color: var(--bg-deep);
          border-color: var(--accent-gold);
          box-shadow: 0 0 20px rgba(var(--accent-gold-rgb), 0.3);
          transform: translateY(-2px);
        }

        .withdraw-btn {
          background: rgba(var(--accent-red-rgb), 0.1);
          color: var(--accent-red);
          border-color: rgba(var(--accent-red-rgb), 0.2);
        }
        .withdraw-btn:hover {
          background: var(--accent-red);
          color: var(--bg-deep);
          border-color: var(--accent-red);
          box-shadow: 0 0 20px rgba(var(--accent-red-rgb), 0.3);
          transform: translateY(-2px);
        }

        .shipment-btn {
          background: rgba(var(--accent-blue-rgb), 0.1);
          color: var(--accent-blue);
          border-color: rgba(var(--accent-blue-rgb), 0.2);
        }
        .shipment-btn:hover {
          background: var(--accent-blue);
          color: var(--bg-deep);
          border-color: var(--accent-blue);
          box-shadow: 0 0 20px rgba(var(--accent-blue-rgb), 0.3);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
