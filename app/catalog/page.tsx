"use client";

import { useState, useEffect, useRef, Suspense, memo } from "react";
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

const COLOR_HEX: Record<string, string> = {
  burgundy: "#7B2D3E", maroon: "#7B2D3E", wine: "#7B2D3E",
  orange: "#F97316",
  "sky blue": "#38BDF8", skyblue: "#38BDF8",
  blue: "#3B82F6", navy: "#1E3A5F",
  red: "#EF4444", green: "#22C55E",
  purple: "#A855F7", black: "#1F2937", white: "#F9FAFB",
  yellow: "#EAB308", gold: "#F59E0B",
  pink: "#EC4899", gray: "#9CA3AF", grey: "#9CA3AF",
  brown: "#92400E", silver: "#94A3B8",
};
function colorHex(name: string) {
  return COLOR_HEX[name.toLowerCase()] ?? COLOR_HEX[name.toLowerCase().replace(/\s+/g, "")] ?? "#9CA3AF";
}

function CatalogCard({ product }: { product: Product }) {
  const colorVariants: { color: string; quantity: number }[] = (product as any).colorVariants || [];
  const sizeVariants: { size: string; quantity: number }[] = (product as any).sizeVariants || [];
  const [cardImageIdx, setCardImageIdx] = useState(0);

  const badge = (() => {
    if (product.quantity === 0) return { text: "Out of Stock", bg: "#fee2e2", color: "#b91c1c" };
    if (product.quantity < 3) return { text: "Low Stock", bg: "#fef3c7", color: "#b45309" };
    return { text: "In Stock", bg: "#dcfce7", color: "#15803d" };
  })();

  const selectedColorName = cardImageIdx > 0 ? colorVariants[cardImageIdx - 1]?.color : null;
  const href = `/catalog/${product.id}${selectedColorName ? `?color=${encodeURIComponent(selectedColorName)}` : ""}`;

  return (
    <Link
      href={href}
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
        {product.images && product.images[cardImageIdx] ? (
          <img
            src={product.images[cardImageIdx]}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "contain", padding: "4px" }}
          />
        ) : (
          <Package size={48} color="#9ca3af" />
        )}
        <span
          style={{
            position: "absolute", top: 10, right: 10,
            padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: badge.bg, color: badge.color,
          }}
        >
          {badge.text}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        {/* Category tags */}
        {product.category?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {product.category.map((cat) => (
              <span
                key={cat}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                  background: "#eff6ff", color: "#1d4ed8", letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Brand + attributes row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 5 }}>
          {product.brand && (
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#9ca3af", textTransform: "uppercase" }}>
              {product.brand.toUpperCase()}
            </span>
          )}
          {product.hand && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4, background: "#f3f4f6", color: "#374151", textTransform: "uppercase" }}>
              {product.hand}
            </span>
          )}
          {product.subCategory && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4, background: "#f3f4f6", color: "#374151", textTransform: "uppercase" }}>
              {product.subCategory.replace(/_/g, " ")}
            </span>
          )}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {product.name}
        </h3>

        {/* Color circles for bags */}
        {colorVariants.length > 0 && (
          <div style={{ display: "flex", gap: 7, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            {colorVariants.map((cv, ci) => {
              const isSelected = cardImageIdx === ci + 1;
              return (
                <span
                  key={cv.color}
                  title={cv.color}
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: colorHex(cv.color),
                    border: isSelected ? "2.5px solid #1d4ed8" : "1.5px solid rgba(0,0,0,0.15)",
                    boxShadow: isSelected ? "0 0 0 1.5px #1d4ed8" : "none",
                    display: "inline-block",
                    cursor: "pointer",
                    opacity: cv.quantity > 0 ? 1 : 0.3,
                    filter: cv.quantity > 0 ? "none" : "grayscale(1)",
                    transition: "box-shadow 0.15s",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setCardImageIdx(isSelected ? 0 : ci + 1);
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Size pills for gloves */}
        {sizeVariants.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {sizeVariants.map((sv) => (
              <span
                key={sv.size}
                style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                  background: sv.quantity > 0 ? "#f9fafb" : "#fee2e2",
                  color: sv.quantity > 0 ? "#374151" : "#9ca3af",
                  border: "1px solid #e5e7eb",
                  textDecoration: sv.quantity <= 0 ? "line-through" : "none",
                }}
              >
                {sv.size}
              </span>
            ))}
          </div>
        )}

        <p style={{ fontSize: 18, fontWeight: 700, color: "#b8860b", margin: 0 }}>
          {product.price ? `${product.price.toLocaleString()} EGP` : "Price on request"}
        </p>
      </div>
    </Link>
  );
}

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

  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontSize: 14,
    color: "#111827",
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
          <div className="catalog-search-wrapper" style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
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
          <div className="catalog-grid">
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
            <div className="catalog-grid">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <CatalogCard product={product} />
                </motion.div>
              ))}
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
