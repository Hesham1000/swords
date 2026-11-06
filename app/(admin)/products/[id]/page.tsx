"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getProductById, type Product } from "../../../lib/api/product";
import { useDashboard } from "../../layout";

const COLOR_HEX: Record<string, string> = {
  burgundy: "#7B2D3E", maroon: "#7B2D3E", wine: "#7B2D3E",
  orange: "#F97316",
  "sky blue": "#38BDF8", skyblue: "#38BDF8",
  blue: "#3B82F6", navy: "#1E3A5F",
  red: "#EF4444", crimson: "#DC2626",
  green: "#22C55E", lime: "#84CC16",
  purple: "#A855F7", violet: "#7C3AED",
  black: "#1F2937", white: "#F9FAFB",
  yellow: "#EAB308", gold: "#F59E0B",
  pink: "#EC4899", gray: "#9CA3AF", grey: "#9CA3AF",
  brown: "#92400E", silver: "#94A3B8",
};
function colorHex(name: string) {
  return COLOR_HEX[name.toLowerCase()] ?? COLOR_HEX[name.toLowerCase().replace(/\s+/g, "")] ?? "#9CA3AF";
}

export default function ProductDetailPage() {
  const { isAdmin } = useDashboard();
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const imgs = product?.images ?? [];

  const touchStartX = React.useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) < 40 || imgs.length <= 1) return;
    setIdx((i) => delta < 0 ? (i + 1) % imgs.length : (i - 1 + imgs.length) % imgs.length);
  };

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

  // Init image index from ?color= URL param
  useEffect(() => {
    if (!product) return;
    const colorParam = searchParams.get("color");
    if (!colorParam) return;
    const cvs = (product as any).colorVariants as { color: string; quantity: number }[] | undefined;
    if (!cvs) return;
    const ci = cvs.findIndex(cv => cv.color.toLowerCase() === colorParam.toLowerCase());
    if (ci !== -1) setIdx(ci + 1); // images[0] is main/group, images[1+] are per-color
  }, [product, searchParams]);

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
        <div
          className="product-detail-image-wrapper"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {imgs.length > 0 ? (
            <img
              src={imgs[idx]}
              alt={product.name}
              className="product-detail-image"
              draggable={false}
            />
          ) : (
            <div className="product-detail-image product-detail-image-placeholder">
              No image available
            </div>
          )}
          {imgs.length > 1 && (
            <button
              onClick={() => setIdx((i) => (i - 1 + imgs.length) % imgs.length)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-tech)', background: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
              aria-label="Previous image"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {imgs.length > 1 && (
            <button
              onClick={() => setIdx((i) => (i + 1) % imgs.length)}
              style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-tech)', background: 'rgba(255,255,255,0.85)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
              aria-label="Next image"
            >
              <ChevronRight size={18} />
            </button>
          )}
          {imgs.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 4px' }}>
              {imgs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  style={{ width: i === idx ? 18 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: i === idx ? 'var(--accent-blue)' : 'rgba(148,163,184,0.5)', transition: 'width 0.2s, background 0.2s', padding: 0 }}
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
                  {colorVariants.map((cv, ci) => {
                    const isSelected = idx === ci + 1;
                    return (
                      <div
                        key={cv.color}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}
                        onClick={() => setIdx(ci + 1)}
                        title={`${cv.color} — qty: ${cv.quantity}`}
                      >
                        <span
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: colorHex(cv.color),
                            border: isSelected ? "2px solid var(--accent-blue, #3b82f6)" : "2px solid rgba(255,255,255,0.15)",
                            boxShadow: isSelected ? "0 0 0 2px var(--accent-blue, #3b82f6)" : "0 0 0 1px rgba(0,0,0,0.3)",
                            display: "inline-block",
                            opacity: cv.quantity > 0 ? 1 : 0.3,
                            filter: cv.quantity > 0 ? "none" : "grayscale(1)",
                            transition: "box-shadow 0.15s",
                          }}
                        />
                        <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? "var(--text-primary)" : "var(--text-secondary)", textTransform: "capitalize", letterSpacing: "0.03em" }}>
                          {cv.color}
                        </span>
                      </div>
                    );
                  })}
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
