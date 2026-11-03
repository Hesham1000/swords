"use client";

import React from "react";
import { Package } from "lucide-react";
import { Product } from "../lib/api/product";
import ProductRow from "./products";

interface ProductsListProps {
  products: Product[];
  loading: boolean;
  error?: string;
  onEdit?: (product: Product) => void;
  onDelete: (productId: string) => void;
  pagination?: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalCount: number;
  };
  onPageChange?: (page: number) => void;
  isAdmin?: boolean;
  currentPage?: number;
  onStockChange?: (id: string, qty: number) => void;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
}

const ProductsList: React.FC<ProductsListProps> = ({
  products,
  loading,
  error,
  onEdit,
  onDelete,
  pagination,
  onPageChange,
  isAdmin,
  onStockChange,
  selectedIds,
  onSelect,
  onSelectAll,
}) => {
  if (loading) {
    return (
      <div className="products-loading">
        <div className="spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load products</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="no-products">
        <Package size={64} />
        <h3>No products found</h3>
        <p>Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    );
  }

  const allSelected = products.length > 0 && products.every((p) => selectedIds?.includes(p.id));

  return (
    <div className="products-list-container">
      {/* Select All */}
      {onSelectAll && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, accentColor: "var(--accent-blue)" }}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => onSelectAll(allSelected ? [] : products.map((p) => p.id))}
          />
          <label>Select All</label>
        </div>
      )}

      {/* Products Grid */}
      <div className="products-grid">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
            isAdmin={isAdmin}
            isSelected={selectedIds?.includes(product.id)}
            onSelect={onSelect}
            onStockChange={onStockChange}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination-wrapper">
          <div className="pagination-controls">
            <button
              className="pagination-arr-btn"
              disabled={!pagination.hasPrevPage}
              onClick={() => onPageChange?.(pagination.page - 1)}
              title="Previous Page"
            >
              &lt;
            </button>
            
            <div className="pagination-pages">
              {(() => {
                const total = pagination.totalPages;
                const current = pagination.page;
                const range = [];
                const delta = 1; // Number of neighbors to show

                for (let i = 1; i <= total; i++) {
                  if (
                    i === 1 || 
                    i === total || 
                    (i >= current - delta && i <= current + delta)
                  ) {
                    range.push(i);
                  } else if (range[range.length - 1] !== "...") {
                    range.push("...");
                  }
                }

                return range.map((p, idx) => (
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={p}
                      className={`pagination-number-btn ${p === current ? 'active' : ''}`}
                      onClick={() => onPageChange?.(p as number)}
                    >
                      {p}
                    </button>
                  )
                ));
              })()}
            </div>

            <button
              className="pagination-arr-btn"
              disabled={!pagination.hasNextPage}
              onClick={() => onPageChange?.(pagination.page + 1)}
              title="Next Page"
            >
              &gt;
            </button>
          </div>
          <div className="pagination-summary">
            Showing <strong>{products.length}</strong> of <strong>{pagination.totalCount}</strong> items
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="products-footer">
        <p>
          Showing <strong>{products.length}</strong>{" "}
          {products.length === 1 ? "product" : "products"}
        </p>
      </div>
    </div>
  );
};

export default ProductsList;
