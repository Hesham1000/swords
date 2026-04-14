"use client";

import React, { useState, FormEvent } from "react";
import { DollarSign, FileText, ArrowUpCircle, ArrowDownCircle, X } from "lucide-react";

interface WalletDepositFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  mode?: "deposit" | "withdraw";
}

const WalletDepositForm: React.FC<WalletDepositFormProps> = ({ onClose, onSuccess, mode = "deposit" }) => {
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [currency, setCurrency] = useState<"EGP" | "USD" | "EUR">("EGP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const isDeposit = mode === "deposit";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { walletTransaction } = await import("../lib/api/wallet");
      await walletTransaction(numAmount, mode, currency, note || undefined);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currencySymbols: Record<string, string> = { EGP: "E£", USD: "$", EUR: "€" };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content-wrapper">
        <button className="modal-close-btn" onClick={onClose} type="button">
          <X size={18} />
        </button>

        <div className="wallet-form-container">
          <form onSubmit={handleSubmit} className="wallet-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-section">
              <div className="section-header">
                {isDeposit ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                <h3>{isDeposit ? "CASH DEPOSIT" : "WITHDRAW CASH"}</h3>
              </div>

              {/* Currency Selection - deposit only */}
              {isDeposit && (
                <div className="form-group full-width">
                  <label>Currency *</label>
                  <div className="wallet-currency-selector">
                    {(["EGP", "USD", "EUR"] as const).map((cur) => (
                      <button
                        key={cur}
                        type="button"
                        className={`wallet-currency-option ${currency === cur ? "active" : ""}`}
                        onClick={() => setCurrency(cur)}
                        disabled={loading}
                      >
                        <span className="wallet-currency-symbol">{currencySymbols[cur]}</span>
                        <span className="wallet-currency-code">{cur}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group full-width">
                <label>Amount ({currency}) *</label>
                <div className="input-with-icon">
                  <DollarSign size={14} />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`e.g. ${currency === "EGP" ? "5000" : "100"}`}
                    required
                    min="0.01"
                    step="0.01"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="form-group full-width">
                <label>Note (optional)</label>
                <div className="input-with-icon">
                  <FileText size={14} />
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={isDeposit ? "e.g. Cash from client Ahmed" : "e.g. Payment to supplier"}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                CANCEL
              </button>
              <button type="submit" className={`btn-primary ${!isDeposit ? "btn-withdraw" : ""}`} disabled={loading}>
                {loading
                  ? isDeposit ? "DEPOSITING..." : "WITHDRAWING..."
                  : isDeposit ? `DEPOSIT ${currency}` : `WITHDRAW ${currency}`
                }
              </button>
            </div>
          </form>
        </div>

        <style jsx>{`
          .wallet-form-container {
            padding: 2.5rem;
            max-height: 85dvh;
            overflow-y: auto;
          }
          .wallet-form {
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }
          .error-message {
            background: rgba(225, 29, 72, 0.1);
            border: 1px solid #e11d48;
            color: #e11d48;
            padding: 0.75rem;
            border-radius: 8px;
            font-size: 13px;
            text-align: center;
          }
          .form-section {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .section-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid var(--border-tech);
            color: ${isDeposit ? '#10b981' : '#f87171'};
          }
          .section-header h3 {
            font-family: var(--font-display);
            font-size: 10px;
            font-weight: 900;
            letter-spacing: 1.5px;
            margin: 0;
            text-transform: uppercase;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
          }
          .form-group.full-width {
            grid-column: span 2;
          }
          .form-group label {
            font-family: var(--font-display);
            font-size: 10px;
            font-weight: 800;
            color: var(--text-secondary);
            text-transform: uppercase;
          }
          .form-group input {
            padding: 0.75rem 1rem;
            background: var(--bg-deep);
            border: 1px solid var(--border-tech);
            border-radius: 8px;
            font-family: var(--font-sans);
            font-size: 14px;
            color: var(--text-primary);
          }
          .input-with-icon {
            position: relative;
            display: flex;
            align-items: center;
          }
          .input-with-icon :global(svg) {
            position: absolute;
            left: 0.875rem;
            color: var(--text-secondary);
          }
          .input-with-icon input {
            padding-left: 2.5rem !important;
            width: 100%;
          }

          .wallet-currency-selector {
            display: flex;
            gap: 0.5rem;
          }
          .wallet-currency-option {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 0.875rem 0.5rem;
            background: var(--bg-deep);
            border: 2px solid var(--border-tech);
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .wallet-currency-option:hover {
            border-color: var(--text-secondary);
          }
          .wallet-currency-option.active {
            border-color: ${isDeposit ? '#10b981' : '#f87171'};
            background: ${isDeposit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(248, 113, 113, 0.08)'};
          }
          .wallet-currency-symbol {
            font-family: var(--font-display);
            font-size: 20px;
            font-weight: 900;
            color: var(--text-primary);
          }
          .wallet-currency-code {
            font-family: var(--font-display);
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 1px;
            color: var(--text-secondary);
            text-transform: uppercase;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--border-tech);
          }
          .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            font-family: var(--font-display);
            font-size: 11px;
            font-weight: 900;
            border-radius: 6px;
            cursor: pointer;
            text-transform: uppercase;
          }
          .btn-primary {
            background: ${isDeposit ? '#10b981' : '#f87171'};
            color: white;
            border: none;
          }
          .btn-withdraw {
            background: #f87171 !important;
          }
          .btn-secondary {
            background: transparent;
            border: 1px solid var(--border-tech);
            color: var(--text-primary);
          }

          @media (max-width: 768px) {
            .wallet-form-container { padding: 1.25rem !important; }
            .wallet-currency-selector { flex-wrap: wrap !important; }
            .wallet-currency-option { flex: none !important; width: calc(50% - 0.25rem) !important; }
            .form-actions { flex-direction: column-reverse !important; gap: 0.75rem !important; }
            .form-actions button { width: 100% !important; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default WalletDepositForm;
