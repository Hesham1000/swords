"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getProductById, type Product } from "../../../lib/api/product";
import { useDashboard } from "../../layout";

export default function ProductDetailPage() {
  const { isAdmin } = useDashboard();
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const imgs = product?.images ?? [];

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
    ...(product.hand ? [{ label: "Hand", value: product.hand }] : []),
    { label: "Description", value: product.description || "N/A" },
  ];

  const colorVariants: { color: string; quantity: number }[] = (product as any).colorVariants || [];
  const sizeVariants: { size: string; quantity: number }[] = (product as any).sizeVariants || [];

  return (
    <div className="page-content">
      <Link href="/products" className="back-link">← Back to Products</Link>

      <div className="product-detail-layout">
        <div className="product-detail-image-wrapper">
          {imgs.length > 0 ? (
            <img
              src={imgs[idx]}
              alt={product.name}
              className="product-detail-image"
            />
          ) : (
            <div className="product-detail-image product-detail-image-placeholder">
              No image available
            </div>
          )}
          {imgs.length > 1 && (
            <button
              onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-tech)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {imgs.length > 1 && (
            <button
              onClick={() => setIdx((i) => (i + 1) % imgs.length)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-tech)', background: 'rgba(255,255,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          )}
          {imgs.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{ width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === idx ? 'var(--accent-blue)' : 'rgba(148,163,184,0.5)', margin: '0 3px' }}
                  aria-label={`Go to image ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1 className="page-title">{product.name}</h1>
          <span className={`status-badge status-${statusClass}`} style={{ margin: '12px 0' }}>{statusText}</span>

          <div className="product-detail-rows">
            {details.map((detail) => (
              <div key={detail.label} className="detail-row">
                <span className="detail-label">{detail.label}</span>
                <span className="detail-value">{detail.value}</span>
              </div>
            ))}
            {colorVariants.length > 0 && (
              <div className="detail-row" style={{ alignItems: "flex-start" }}>
                <span className="detail-label">Colors</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {colorVariants.map((cv) => (
                    <span key={cv.color} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border-tech)", background: "var(--bg-deep)", color: cv.quantity > 0 ? "var(--text-primary)" : "var(--text-secondary)", textTransform: "capitalize", opacity: cv.quantity > 0 ? 1 : 0.5 }}>
                      {cv.color} ×{cv.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {sizeVariants.length > 0 && (
              <div className="detail-row" style={{ alignItems: "flex-start" }}>
                <span className="detail-label">Sizes</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {sizeVariants.map((sv) => (
                    <span key={sv.size} style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border-tech)", background: "var(--bg-deep)", color: sv.quantity > 0 ? "var(--text-primary)" : "var(--text-secondary)", opacity: sv.quantity > 0 ? 1 : 0.5 }}>
                      {sv.size} ×{sv.quantity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isAdmin && (
            <button className="primary-btn" onClick={() => router.push("/products?edit=" + product.id)}>Edit</button>
          )}
        </div>
      </div>
    </div>
  );
}
