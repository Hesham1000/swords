"use client";

import React, { useState, useEffect, useRef } from "react";
import { Package, Plus, X, Loader2 } from "lucide-react";
import ProductForm from "../../components/productform";
import ProductsList from "../../components/products-list";
import { getProducts, deleteProduct, Product, getProductFilters } from "../../lib/api/product";
import { useDashboard } from "../layout";

export default function ProductsPage() {
  const { user, isAdmin } = useDashboard();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [refresh, setRefresh] = useState(false);
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
  }, [page, searchQuery, filterCategory, filterType, filterBrand, refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteProduct(id);
      setRefresh(!refresh);
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
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

      <ProductsList
        products={products}
        loading={loading}
        onDelete={handleDelete}
        onEdit={handleEdit}
        isAdmin={isAdmin}
        currentPage={page}
        onPageChange={setPage}
        pagination={pagination}
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
    </div>
  );
}
