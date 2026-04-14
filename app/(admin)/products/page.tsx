"use client";

import React, { useState, useEffect, useRef } from "react";
import { Package, Plus, X, Loader2 } from "lucide-react";
import ProductForm from "../../components/productform";
import ProductsList from "../../components/products-list";
import { getProducts, deleteProduct, Product } from "../../lib/api/product";
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
  const lastParamsRef = useRef("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterBrand, setFilterBrand] = useState("");

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
            <option value="Epée">Epée</option>
            <option value="Foil">Foil</option>
            <option value="Sabre">Sabre</option>
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
            <option value="lame">Lamé</option>
            <option value="wire">Wire</option>
            <option value="grip">Grip</option>
            <option value="guard">Guard</option>
            <option value="guard_padding">Guard Padding</option>
            <option value="french_pommel">French Pommel</option>
            <option value="nut">Nut</option>
            <option value="point">Point</option>
            <option value="screws">Screws</option>
            <option value="point_contact_springs">Springs</option>
            <option value="socket">Socket</option>
            <option value="insulating_tube">Insulating Tube</option>
            <option value="body_wire">Body Wire</option>
            <option value="cable">Cable</option>
            <option value="pin">Pin</option>
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
            <option value="pbt">PBT</option>
            <option value="dynamo">Dynamo</option>
            <option value="stm">STM</option>
            <option value="uhlmann">Uhlmann</option>
            <option value="allstar">Allstar</option>
            <option value="folo">Folo</option>
            <option value="chinese">Chinese</option>
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
