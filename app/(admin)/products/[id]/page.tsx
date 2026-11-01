"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getProductById, type Product } from "../../../lib/api/product";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getProductById(id)
      .then((response) => {
        setProduct(response.data);
      })
      .catch((error) => {
        console.error("Failed to fetch product:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="page-content">
        <p>Loading product…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-content">
        <p>Product not found.</p>
        <Link href="/products" className="back-link">← Back to Products</Link>
      </div>
    );
  }

  let statusClass = "paid";
  let statusText = "In Stock";
  if (product.quantity === 0) {
    statusClass = "overdue";
    statusText = "Out of Stock";
  } else if (product.quantity < 3) {
    statusClass = "pending";
    statusText = "Low Stock";
  }

  const details: { label: string; value: string }[] = [
    { label: "Brand", value: product.brand || "N/A" },
    { label: "Type", value: product.productType || "N/A" },
    { label: "Category", value: product.category?.join(", ") || "N/A" },
    { label: "Price", value: product.price ? `${product.price} EGP` : "N/A" },
    { label: "Quantity", value: String(product.quantity) },
    { label: "Description", value: product.description || "N/A" },
  ];

  return (
    <div className="page-content">
      <Link href="/products" className="back-link">← Back to Products</Link>

      <div className="product-detail-layout">
        <div className="product-detail-image-wrapper">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="product-detail-image"
            />
          ) : (
            <div className="product-detail-image product-detail-image-placeholder">
              No image available
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1 className="page-title">{product.name}</h1>
          <span className={`status-badge status-${statusClass}`}>{statusText}</span>

          <div className="product-detail-rows">
            {details.map((detail) => (
              <div key={detail.label} className="detail-row">
                <span className="detail-label">{detail.label}</span>
                <span className="detail-value">{detail.value}</span>
              </div>
            ))}
          </div>

          <button className="primary-btn">Edit</button>
        </div>
      </div>
    </div>
  );
}
