"use client";

import React, { useState, FormEvent } from "react";
import { Truck, DollarSign, FileText, MapPin } from "lucide-react";

interface ShipmentFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const ShipmentForm: React.FC<ShipmentFormProps> = ({ onClose, onSuccess }) => {
  const [destination, setDestination] = useState<string>("cairo");
  const [cost, setCost] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numCost = parseFloat(cost);
    if (!numCost || numCost <= 0) {
      setError("Please enter a valid cost.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { createShipment } = await import("../lib/api/shipment");
      await createShipment({ destination, cost: numCost, description, date });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="invoice-form-container">
      <form onSubmit={handleSubmit} className="invoice-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-section">
          <div className="section-header">
            <Truck size={16} />
            <h3>SHIPMENT DETAILS</h3>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Destination *</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                disabled={loading}
              >
                <option value="cairo">Cairo</option>
                <option value="alex">Alexandria</option>
              </select>
            </div>
            <div className="form-group">
              <label>Cost (EGP) *</label>
              <div className="input-with-icon">
                <DollarSign size={14} />
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="e.g. 2000"
                  required
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label>Description (optional)</label>
            <div className="input-with-icon">
              <FileText size={14} />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 5 boxes of FIE masks"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            CANCEL
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "CREATING..." : "CREATE SHIPMENT"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .invoice-form-container {
          padding: 1.5rem;
        }
        .invoice-form {
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
          color: var(--accent-blue);
        }
        .section-header h3 {
          font-family: var(--font-display);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.5px;
          margin: 0;
          text-transform: uppercase;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
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
        .form-group input, .form-group select {
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
          background: var(--accent-blue);
          color: white;
          border: none;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--border-tech);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default ShipmentForm;
