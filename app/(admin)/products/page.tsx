"use client";

import React, { useState, useEffect, useRef } from "react";
import { Package, Plus, X, Loader2 } from "lucide-react";
import ProductForm from "../../components/productform";
import ProductsList from "../../components/products-list";
import { getProducts, deleteProduct, updateProduct, Product, getProductFilters } from "../../lib/api/product";
import { useSearchParams } from "next/navigation";
import { useDashboard } from "../layout";

export default function ProductsPage() {
  const { user, isAdmin } = useDashboard();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockDelta, setStockDelta] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ categories: string[]; brands: string[]; types: string[] }>({ categories: [], brands: [], types: [] });
  const lastParamsRef = useRef("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await getProductFilters();
        setFilterOptions(response.data);
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, filterCategory, filterType, filterBrand, refresh });
    if (params === lastParamsRef.current) return;
    lastParamsRef.current = params;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await getProducts(page, 8, false, {
          search: searchQuery,
          category: filterCategory,
          productType: filterType,
          brand: filterBrand,
        });
        setProducts(response.data);
        setPagination(response.pagination);
      } catch (err: any) {
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page, searchQuery, filterCategory, filterType, filterBrand, refresh, searchParams]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setRefresh(!refresh);
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const handleStockChange = async (id: string, newQty: number) => {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    // Optimistic local update
    const prevProducts = products;
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: newQty } : p))
    );

    try {
      // updateProduct expects a full FormData payload
      const formData = new FormData();
      formData.append("name", product.name);
      formData.append("description", product.description);
      if (product.price !== null && product.price !== undefined) {
        formData.append("price", String(product.price));
      }
      (product.category || []).forEach((cat) => formData.append("category", cat));
      formData.append("productType", product.productType);
      if (product.brand) formData.append("brand", product.brand);
      if (product.model) formData.append("model", product.model);
      if (product.subCategory) formData.append("subCategory", product.subCategory);
      if (product.hand) formData.append("hand", product.hand);
      formData.append("isKings", String(!!product.isKings));
      formData.append("isMini", String(!!product.isMini));
      if (product.lameColor) formData.append("lameColor", product.lameColor);
      if (product.material) formData.append("material", product.material);
      if (product.gloveSize) formData.append("gloveSize", product.gloveSize);
      formData.append("quantity", String(newQty));
      if (product.images && product.images.length > 0) {
        formData.append("existingImages", JSON.stringify(product.images));
      }

      await updateProduct(id, formData);
    } catch (err: any) {
      // Revert on failure
      setProducts(prevProducts);
      alert(err?.message || "Failed to update stock");
    }
  };


  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected product(s)?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteProduct(id)));
      setSelectedIds([]);
      setRefresh(!refresh);
    } catch (err: any) {
      alert(err?.message || "Failed to delete selected products");
    }
  };

  const handleBulkAdjustStock = async (delta: number) => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          const product = products.find((p) => p.id === id);
          if (!product) return;
          const newQty = (product.quantity || 0) + delta;
          const formData = new FormData();
          formData.append("name", product.name);
          formData.append("description", product.description);
          if (product.price !== null && product.price !== undefined) {
            formData.append("price", String(product.price));
          }
          (product.category || []).forEach((cat) => formData.append("category", cat));
          formData.append("productType", product.productType);
          if (product.brand) formData.append("brand", product.brand);
          if (product.model) formData.append("model", product.model);
          if (product.subCategory) formData.append("subCategory", product.subCategory);
          if (product.hand) formData.append("hand", product.hand);
          formData.append("isKings", String(!!product.isKings));
          formData.append("isMini", String(!!product.isMini));
          if (product.lameColor) formData.append("lameColor", product.lameColor);
          if (product.material) formData.append("material", product.material);
          if (product.gloveSize) formData.append("gloveSize", product.gloveSize);
          formData.append("quantity", String(newQty));
          if (product.images && product.images.length > 0) {
            formData.append("existingImages", JSON.stringify(product.images));
          }
          await updateProduct(id, formData);
          // Update local state immediately
          setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, quantity: newQty } : p))
          );
        })
      );
      setSelectedIds([]);
    } catch (err: any) {
      alert(err?.message || "Failed to adjust stock for selected products");
      setRefresh(!refresh);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Products Inventory</h1>
        {isAdmin && (
          <button
            className="primary-btn"
            onClick={() => {
              setEditingProduct(null);
              setShowForm(true);
            }}
          >
            <Plus size={20} />
            Add New Product
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-wrapper">
          <Package size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="search-input"
          />
        </div>
        
        <div className="filters-selectors">
          <select 
            value={filterCategory} 
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select 
            value={filterType} 
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Types</option>
            {filterOptions.types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select 
            value={filterBrand} 
            onChange={(e) => {
              setFilterBrand(e.target.value);
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">All Brands</option>
            {filterOptions.brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          {(searchQuery || filterCategory || filterType || filterBrand) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("");
                setFilterType("");
                setFilterBrand("");
                setPage(1);
              }}
            >
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar" style={{ display: "flex", gap: "10px", padding: "10px", background: "var(--glass-bg)", border: "1px solid var(--border-tech)", borderRadius: "8px", marginBottom: "10px", alignItems: "center" }}>
          <span>{selectedIds.length} selected</span>
          <button className="primary-btn" onClick={handleBulkDelete}>Delete Selected</button>
          <button className="primary-btn" onClick={() => setShowStockModal(true)}>Adjust Stock</button>
        </div>
      )}

      <ProductsList
        products={products}
        loading={loading}
        onDelete={handleDelete}
        onEdit={handleEdit}
        isAdmin={isAdmin}
        currentPage={page}
        onPageChange={setPage}
        pagination={pagination}
        selectedIds={selectedIds}
        onSelect={handleSelect}
        onSelectAll={handleSelectAll}
          onStockChange={handleStockChange}
      />

      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            setRefresh(!refresh);
          }}
          initialData={editingProduct || undefined}
          isEdit={!!editingProduct}
        />
      )}

      {showStockModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowStockModal(false)}>
          <div style={{ background: "var(--glass-bg, #fff)", border: "1px solid var(--border-tech)", borderRadius: "8px", padding: "20px", minWidth: "280px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Adjust Stock</h3>
            <p>Enter a delta to add to each selected product's quantity (can be negative).</p>
            <input type="number" value={stockDelta} onChange={(e) => setStockDelta(Number(e.target.value))} style={{ width: "100%", padding: "8px", marginBottom: "12px", border: "1px solid var(--border-tech)", borderRadius: "6px" }} />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="primary-btn" onClick={() => { handleBulkAdjustStock(stockDelta); setShowStockModal(false); }}>Apply</button>
              <button className="primary-btn" onClick={() => setShowStockModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
