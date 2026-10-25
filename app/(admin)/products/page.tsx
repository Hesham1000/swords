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
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const params = JSON.stringify({ page, searchQuery, filterCategory, filterType, filterBrand, sortBy, sortOrder, refresh });
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
          sortBy: sortBy || undefined,
          sortOrder,
        });
        setProducts(response?.data ?? []);
        setPagination(response?.pagination ?? null);
      } catch (err: any) {
        setError(err.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [page, searchQuery, filterCategory, filterType, filterBrand, sortBy, sortOrder, refresh]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const sortFields = [
    { key: "name", label: "Name" },
    { key: "price", label: "Price" },
    { key: "quantity", label: "Quantity" },
    { key: "brand", label: "Brand" },
  ];

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

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-500 mr-1">Sort by:</span>
        {sortFields.map((field) => (
          <button
            key={field.key}
            onClick={() => handleSort(field.key)}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
              sortBy === field.key
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {field.label}
            {sortBy === field.key && (
              <span aria-hidden="true">{sortOrder === "asc" ? "▲" : "▼"}</span>
            )}
          </button>
        ))}
      </div>

      <ProductsList
        products={products}
        loading={loading}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onView={setSelectedProduct}
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

      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedProduct(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedProduct?.name ?? "product"}`}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-xl font-bold">{selectedProduct?.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {selectedProduct?.images && selectedProduct.images.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedProduct.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${selectedProduct.name} image ${i + 1}`}
                    className="h-20 w-20 rounded-md border border-gray-200 object-cover"
                  />
                ))}
              </div>
            ) : (
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400">
                <Package size={28} />
              </div>
            )}

            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-gray-700">Description</dt>
                <dd className="text-gray-600">{selectedProduct?.description || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Price</dt>
                <dd className="text-gray-600">
                  {selectedProduct?.price != null
                    ? `${selectedProduct.price.toLocaleString()} EGP`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Category</dt>
                <dd className="text-gray-600">
                  {Array.isArray(selectedProduct?.category)
                    ? selectedProduct.category.join(" / ")
                    : selectedProduct?.category || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Product Type</dt>
                <dd className="text-gray-600">{selectedProduct?.productType || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Brand</dt>
                <dd className="text-gray-600">{selectedProduct?.brand || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Model</dt>
                <dd className="text-gray-600">{selectedProduct?.model || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-gray-700">Quantity</dt>
                <dd className="text-gray-600">{selectedProduct?.quantity ?? 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
