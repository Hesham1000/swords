"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  getProducts,
  getProductFilters,
  Product,
  ProductsResponse,
} from "../lib/api/product";

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterOptions, setFilterOptions] = useState<{
    categories: string[];
    brands: string[];
    types: string[];
  }>({ categories: [], brands: [], types: [] });
  const lastParamsRef = useRef("");

  // Initialize brand filter from ?brand= query param (e.g. /catalog?brand=PBT)
  useEffect(() => {
    const brand = searchParams.get("brand");
    if (brand) setFilterBrand(brand);
  }, [searchParams]);

  // Fetch dynamic filter options on mount
  useEffect(() => {
    getProductFilters()
      .then((response) => {
        if (response?.data) setFilterOptions(response.data);
      })
      .catch(() => {
        // Non-fatal: filters just stay empty
      });
  }, []);

  // Fetch products whenever page or filters change
  useEffect(() => {
    const params = JSON.stringify({
      page,
      searchQuery,
      filterCategory,
      filterType,
      filterBrand,
    });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");
        const response: ProductsResponse = await getProducts(page, 12, false, {
          search: searchQuery,
          category: filterCategory,
          productType: filterType,
          brand: filterBrand,
        });
        setProducts(response.data || []);
        setPagination(response.pagination || null);
      } catch (err: any) {
        setError(err?.message || "Failed to load products");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page, searchQuery, filterCategory, filterType, filterBrand]);

  const getStockBadge = (quantity: number) => {
    if (quantity === 0)
      return { text: "Out of Stock", bg: "#fee2e2", color: "#b91c1c" };
    if (quantity < 3)
      return { text: "Low Stock", bg: "#fef3c7", color: "#b45309" };
    return { text: "In Stock", bg: "#dcfce7", color: "#15803d" };
  };

  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    color: "#111827",
    minWidth: 140,
  };

  return (
    <div
      className="catalog-page"
      style={{
        background: "#fafafa",
        width: "100%",
        overflowX: "hidden",
      }}
    >
      {/* Top Nav */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#111827",
            textDecoration: "none",
            fontWeight: 500,
            fontSize: 15,
          }}
        >
          <ChevronLeft size={20} />
          Back to Home
        </Link>
        <img
          src="/icon.png"
          alt="Kings Logo"
          width={40}
          height={40}
          style={{ objectFit: "contain" }}
        />
      </nav>

      <div className="catalog-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", boxSizing: "border-box", width: "100%" }}>
        <h1
          className="catalog-title"
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#111827",
            margin: "0 0 24px",
          }}
        >
          Product Catalog
        </h1>

        {/* Search & Filters */}
        <div
          className="catalog-filter-row"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 28,
          }}
        >
          <div style={{ position: "relative", flex: "1 1 260px", minWidth: 220 }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
              }}
            />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
              }}
              style={{
                width: "100%",
                padding: "10px 12px 10px 38px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontSize: 14,
                color: "#111827",
                boxSizing: "border-box",
              }}
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => {
              setPage(1);
              setFilterCategory(e.target.value);
            }}
            style={selectStyle}
            className="catalog-filter-select"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => {
              setPage(1);
              setFilterType(e.target.value);
            }}
            style={selectStyle}
            className="catalog-filter-select"
            aria-label="Filter by type"
          >
            <option value="">All Types</option>
            {filterOptions.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={filterBrand}
            onChange={(e) => {
              setPage(1);
              setFilterBrand(e.target.value);
            }}
            style={selectStyle}
            className="catalog-filter-select"
            aria-label="Filter by brand"
          >
            <option value="">All Brands</option>
            {filterOptions.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Error state */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 16,
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 320,
                  borderRadius: 12,
                  background: "#e5e7eb",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : products.length === 0 && !error ? (
          <div
            style={{
              textAlign: "center",
              padding: "64px 0",
              color: "#6b7280",
            }}
          >
            <Package size={48} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 16 }}>No products found.</p>
          </div>
        ) : (
          <>
            {/* Product Grid */}
            <div
              className="catalog-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 20,
              }}
            >
              {products.map((product, idx) => {
                const badge = getStockBadge(product.quantity);
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                  >
                    <Link
                      href={`/catalog/${product.id}`}
                      style={{
                        display: "block",
                        background: "#fff",
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid #e5e7eb",
                        textDecoration: "none",
                        color: "inherit",
                        height: "100%",
                        transition: "box-shadow 0.2s, transform 0.2s",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          height: 200,
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <Package size={48} color="#9ca3af" />
                        )}
                        <span
                          style={{
                            position: "absolute",
                            top: 10,
                            right: 10,
                            padding: "4px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.text}
                        </span>
                      </div>
                      <div style={{ padding: 16 }}>
                        {product.brand && (
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              letterSpacing: "0.05em",
                              color: "#9ca3af",
                              margin: "0 0 4px",
                              textTransform: "uppercase",
                            }}
                          >
                            {product.brand.toUpperCase()}
                          </p>
                        )}
                        <h3
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: "#111827",
                            margin: "0 0 8px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {product.name}
                        </h3>
                        <p
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#b8860b",
                            margin: 0,
                          }}
                        >
                          {product.price
                            ? `${product.price.toLocaleString()} EGP`
                            : "N/A"}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  marginTop: 32,
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: pagination.hasPrevPage ? "pointer" : "not-allowed",
                    opacity: pagination.hasPrevPage ? 1 : 0.5,
                    fontSize: 14,
                  }}
                >
                  <ChevronLeft size={16} />
                  Prev
                </button>
                <span style={{ fontSize: 14, color: "#374151" }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: pagination.hasNextPage ? "pointer" : "not-allowed",
                    opacity: pagination.hasNextPage ? 1 : 0.5,
                    fontSize: 14,
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .catalog-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .catalog-grid { grid-template-columns: 1fr !important; }
          .catalog-container { padding: 20px 16px !important; }
          .catalog-title { font-size: 22px !important; margin-bottom: 16px !important; }
          .catalog-filter-row { flex-direction: column !important; align-items: stretch !important; }
          .catalog-filter-select { width: 100% !important; min-width: 0 !important; box-sizing: border-box; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogPageContent />
    </Suspense>
  );
}
