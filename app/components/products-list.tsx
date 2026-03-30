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

  return (
    <div className="products-list-container">
      {/* Products Grid */}
      <div className="products-grid">
        {products.map((product) => (
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
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            disabled={!pagination.hasPrevPage}
            onClick={() => onPageChange?.(pagination.page - 1)}
          >
            Previous
          </button>
          <div className="pagination-info">
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
            <span className="total-count">({pagination.totalCount} total)</span>
          </div>
          <button
            className="pagination-btn"
            disabled={!pagination.hasNextPage}
            onClick={() => onPageChange?.(pagination.page + 1)}
          >
            Next
          </button>
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
