"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect, useRef, useCallback } from "react";
import { DollarSign, User, Calendar, FileText, CheckCircle, Clock, AlertCircle, Plus, Trash2, Package, Percent } from "lucide-react";
import { createInvoice, Invoice, InvoiceItem } from "../lib/api/invoice";
import { getProducts, Product } from "../lib/api/product";

interface InvoiceFormData {
  customer: string;
  status: "paid" | "pending" | "overdue";
  paymentMethod: "cash" | "visa";
  date: string;
}

interface InvoiceFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer: "",
    status: "pending",
    paymentMethod: "cash",
    date: new Date().toISOString().split('T')[0],
  });
  const [deposit, setDeposit] = useState<string>("0");

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (pageNum: number, isInitial = false) => {
    if (pageNum > 1) setLoadingMore(true);
    else setProductsLoading(true);
    
    try {
      const response = await getProducts(pageNum, 10); // Standardizing on 10 per page
      if (isInitial) {
        setAvailableProducts(response.data);
      } else {
        setAvailableProducts(prev => {
          // Filter out duplicates just in case
          const newProducts = response.data.filter(
            np => !prev.some(pp => pp.id === np.id)
          );
          return [...prev, ...newProducts];
        });
      }
      
      setHasMore(response.pagination?.hasNextPage ?? false);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      if (pageNum > 1) setLoadingMore(false);
      else setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(1, true);
  }, [fetchProducts]);

  const handleScroll = () => {
    if (!scrollRef.current || productsLoading || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      fetchProducts(page + 1);
    }
  };

  const [loadingMore, setLoadingMore] = useState(false);

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const discountedUnitPrice = Math.max(0, (item.price || 0) - (item.discount || 0));
      return sum + (discountedUnitPrice * item.quantity);
    }, 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => sum + (item.discount || 0) * item.quantity, 0);
  };

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price || 0,
          quantity: 1,
          discount: 0,
        },
      ];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  };

  const updatePrice = (productId: string, price: number) => {
    if (price < 0) return;
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, price } : i))
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    if (discount < 0) return;
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, discount } : i))
    );
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError("Please add at least one product.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const invoiceData: Partial<Invoice> = {
        ...formData,
        items,
        amount: calculateTotal(),
        discount: calculateTotalDiscount(),
        deposit: parseFloat(deposit) || 0,
      };

      await createInvoice(invoiceData);
      
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
            <User size={16} />
            <h3>CUSTOMER INFORMATION</h3>
          </div>
          <div className="form-group full-width">
            <label>Customer Name / Reference</label>
            <div className="input-with-icon">
              <User size={14} />
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="Optional: e.g. Elite Fencing Club"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <Package size={16} />
            <h3>PRODUCTS & QUANTITY</h3>
          </div>
          
          <div className="product-selector-grid">
            <div className="available-products">
              <label className="sub-label">Select Products</label>
              <div className="products-scroll-area" ref={scrollRef} onScroll={handleScroll}>
                {productsLoading ? (
                  <div className="mini-spinner"></div>
                ) : availableProducts.length === 0 ? (
                  <p className="no-data-text">No products available</p>
                ) : (
                  availableProducts.map(product => (
                    <button 
                      key={product.id} 
                      type="button" 
                      className="product-add-btn"
                      onClick={() => addItem(product)}
                    >
                      <span className="p-name">{product.name}</span>
                      <span className="p-price">{product.price ? `${product.price} EGP` : 'Price Pending'}</span>
                      <Plus size={14} />
                    </button>
                  ))
                )}
                {loadingMore && (
                  <div className="mini-spinner more"></div>
                )}
                {!hasMore && availableProducts.length > 0 && (
                  <p className="end-of-list">End of products</p>
                )}
              </div>
            </div>

            <div className="selected-items">
              <label className="sub-label">Selected Items</label>
              <div className="items-list">
                {items.length === 0 ? (
                  <div className="empty-items-placeholder">
                    <Package size={24} />
                    <p>No items added</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.productId} className="selected-item-row">
                      <div className="item-info">
                        <span className="item-name">{item.name}</span>
                        <div className="item-price-edit">
                          <input 
                            type="number" 
                            value={item.price ?? ""} 
                            onChange={(e) => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                            className="price-input"
                            min="0"
                            step="0.01"
                          />
                          <span className="unit-label">EGP</span>
                        </div>
                        <div className="item-discount-edit">
                          <DollarSign size={10} />
                          <input 
                            type="number" 
                            value={item.discount || ""} 
                            onChange={(e) => updateDiscount(item.productId, parseFloat(e.target.value) || 0)}
                            className="discount-input"
                            min="0"
                            step="0.01"
                            placeholder="0"
                          />
                          <span className="unit-label">EGP off / unit</span>
                        </div>
                      </div>
                      <div className="item-controls">
                        <div className="quantity-adjuster">
                          <button type="button" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
                          <span>{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                        </div>
                        <button type="button" className="remove-btn" onClick={() => removeItem(item.productId)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <DollarSign size={16} />
            <h3>PAYMENT & TOTAL</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Payment Method *</label>
              <select 
                name="paymentMethod" 
                value={formData.paymentMethod} 
                onChange={handleChange} 
                required 
                disabled={loading}
              >
                <option value="cash">Cash</option>
                <option value="visa">Visa</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status *</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                required 
                disabled={loading}
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="form-group">
              <label>Deposit Paid (EGP) *</label>
              <div className="input-with-icon">
                <DollarSign size={14} />
                <input
                  type="number"
                  value={deposit}
                  onChange={(e) => setDeposit(e.target.value)}
                  placeholder="e.g. 500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </div>
              <small className="help-text">Amount paid upfront (Default: EGP)</small>
            </div>
          </div>
          
          {calculateTotalDiscount() > 0 && (
            <div className="subtotal-display">
              <span className="subtotal-label">Subtotal:</span>
              <span className="subtotal-value">{calculateSubtotal().toLocaleString()} EGP</span>
            </div>
          )}
          {calculateTotalDiscount() > 0 && (
            <div className="discount-display">
              <span className="discount-label">Discount:</span>
              <span className="discount-value">-{calculateTotalDiscount().toLocaleString()} EGP</span>
            </div>
          )}
          <div className="total-display">
            <span className="total-label">Total Amount:</span>
            <span className="total-value">{calculateTotal().toLocaleString()} EGP</span>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <Calendar size={16} />
            <h3>DATE & SCHEDULING</h3>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice Date *</label>
              <div className="input-with-icon">
                <Calendar size={14} />
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            CANCEL
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "GENERATING..." : "CREATE INVOICE"}
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
        .help-text {
          font-size: 9px;
          color: var(--text-secondary);
          opacity: 0.8;
          font-style: italic;
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
        .product-selector-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 1.5rem;
          min-height: 250px;
        }
        .sub-label {
          font-family: var(--font-display);
          font-size: 9px;
          font-weight: 800;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
          display: block;
          text-transform: uppercase;
        }
        .products-scroll-area, .items-list {
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 12px;
          padding: 0.75rem;
          height: 200px;
          overflow-y: auto;
        }
        .product-add-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: var(--bg-card);
          border: 1px solid var(--border-tech);
          border-radius: 8px;
          margin-bottom: 0.5rem;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .product-add-btn:hover {
          border-color: var(--accent-blue);
          transform: translateX(4px);
        }
        .p-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .p-price {
          font-size: 11px;
          color: var(--accent-blue);
          font-weight: 700;
          margin-left: auto;
          margin-right: 0.75rem;
        }
        .selected-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: var(--bg-card);
          border-radius: 8px;
          margin-bottom: 0.5rem;
          border-left: 3px solid var(--accent-blue);
        }
        .item-info {
          display: flex;
          flex-direction: column;
        }
        .item-name {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .item-price-edit {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }
        .price-input {
          width: 80px;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 4px;
          padding: 2px 6px;
          color: var(--accent-blue);
          font-weight: 700;
          font-size: 11px;
        }
        .unit-label {
          font-size: 9px;
          color: var(--text-secondary);
          font-weight: 800;
        }
        .item-discount-edit {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }
        .item-discount-edit :global(svg) {
          color: var(--accent-green, #22c55e);
          flex-shrink: 0;
        }
        .discount-input {
          width: 50px;
          background: var(--bg-deep);
          border: 1px solid var(--border-tech);
          border-radius: 4px;
          padding: 2px 6px;
          color: var(--accent-green, #22c55e);
          font-weight: 700;
          font-size: 11px;
        }
        .subtotal-display {
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-secondary);
        }
        .subtotal-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .subtotal-value {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
        }
        .discount-display {
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--accent-green, #22c55e);
        }
        .discount-label {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .discount-value {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 700;
        }
        .item-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .quantity-adjuster {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--bg-deep);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
        }
        .quantity-adjuster button {
          background: transparent;
          border: none;
          color: var(--accent-blue);
          font-weight: 900;
          cursor: pointer;
          width: 20px;
        }
        .quantity-adjuster span {
          font-size: 13px;
          font-weight: 800;
          min-width: 15px;
          text-align: center;
        }
        .remove-btn {
          color: var(--accent-red);
          background: transparent;
          border: none;
          cursor: pointer;
          opacity: 0.7;
          transition: 0.2s;
        }
        .remove-btn:hover {
          opacity: 1;
        }
        .total-display {
          margin-top: 1.5rem;
          padding: 1rem;
          background: linear-gradient(to right, var(--bg-deep), transparent);
          border-left: 4px solid var(--accent-blue);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .total-label {
          font-family: var(--font-display);
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .total-value {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 900;
          color: var(--accent-blue);
        }
        .empty-items-placeholder {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          opacity: 0.5;
        }
        .mini-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border-tech);
          border-top-color: var(--accent-blue);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 1rem auto;
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
        @keyframes spin { to { transform: rotate(360deg); } }
        .mini-spinner.more {
          margin: 0.5rem auto;
        }
        .end-of-list {
          font-size: 10px;
          color: var(--text-secondary);
          text-align: center;
          margin-top: 0.5rem;
          opacity: 0.6;
          font-style: italic;
          padding-bottom: 0.5rem;
        }

      `}</style>
    </div>
  );
};

export default InvoiceForm;
