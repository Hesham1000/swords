"use client";

import React from "react";
import { Package, ArrowUp, ArrowDown } from "lucide-react";
import { Product } from "../lib/api/product";
import ProductRow from "./products";

interface ProductsListProps {
  products: Product[];
  loading: boolean;
  error?: string;
  onEdit?: (product: Product) => void;
  onDelete: (product: Product) => void;
  sortField?: string;
  sortDir?: "asc" | "desc";
  onSortChange?: (field: string) => void;
  onAddProduct?: () => void;
  pagination?: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    totalCount: number;
  } | null;
  onPageChange?: (page: number) => void;
  isAdmin?: boolean;
  currentPage?: number;
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
  sortField,
  sortDir,
  onSortChange,
  onAddProduct,
}) => {
  const sortColumns: { field: string; label: string }[] = [
    { field: "name", label: "Name" },
    { field: "price", label: "Price" },
    { field: "quantity", label: "Quantity" },
    { field: "category", label: "Category" },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-slate-200 rounded-lg h-48" />
        ))}
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

  if ((products ?? []).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package size={64} className="text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold text-slate-700">No products found</h3>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
        {isAdmin && onAddProduct && (
          <button
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            onClick={onAddProduct}
          >
            Add Product
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="products-list-container">
      {/* Sortable Column Headers */}
      <div className="flex items-center gap-4 px-4 py-2 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700">
        {sortColumns.map(({ field, label }) => {
          const isActive = sortField === field;
          return (
            <button
              key={field}
              type="button"
              onClick={() => onSortChange?.(field)}
              className={`flex items-center gap-1 hover:text-slate-900 ${isActive ? "text-blue-600" : ""}`}
            >
              {label}
              {isActive && (sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {(products ?? []).map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            onEdit={onEdit}
            onDelete={onDelete}
            isAdmin={isAdmin}
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
