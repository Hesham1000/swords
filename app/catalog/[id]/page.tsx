"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Package, AlertCircle, Send } from "lucide-react";
import { getProductById, Product } from "../../lib/api/product";

const GOLD = "#c9a227";

const navStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
  background: "#fff",
  position: "sticky",
  top: 0,
  zIndex: 50,
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  color: "#333",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 500,
};

const logoStyle: React.CSSProperties = {
  height: 36,
  width: "auto",
  objectFit: "contain",
};

const stockBadge = (quantity: number) => {
  if (quantity <= 0)
    return { label: "Out of Stock", bg: "#fee2e2", color: "#b91c1c" };
  if (quantity <= 5)
    return { label: "Low Stock", bg: "#fef3c7", color: "#b45309" };
  return { label: "In Stock", bg: "#dcfce7", color: "#15803d" };
};

export default function CatalogProductDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [inquiryError, setInquiryError] = useState("");
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryData, setInquiryData] = useState<{
    name: string;
    email: string;
    phone: string;
    message: string;
  }>({ name: "", email: "", phone: "", message: "" });

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setError("Product not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    getProductById(id)
      .then((response) => {
        if (cancelled) return;
        setProduct(response.data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Failed to load product");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images = product?.images || [];
  const hasMultipleImages = images.length > 1;

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (!hasMultipleImages) return;
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) nextImage();
    else if (info.offset.x > swipeThreshold) prevImage();
  };

  const handleInquiryChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setInquiryData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryError("");
    if (!product) return;
    setSubmittingInquiry(true);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inquiryData.name,
          email: inquiryData.email,
          phone: inquiryData.phone,
          productId: product.id,
          productName: product.name,
          message: inquiryData.message,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send inquiry");
      }
      setInquirySubmitted(true);
      setShowInquiryForm(false);
    } catch (err) {
      setInquiryError(err instanceof Error ? err.message : "Failed to send inquiry");
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  };

  return (
    <div className="catalog-detail-page" style={{ minHeight: "100vh", background: "#fafafa" }}>
      {/* Top Nav */}
      <nav style={navStyle}>
        <Link href="/" style={backLinkStyle}>
          <ChevronLeft size={18} /> Back to Home
        </Link>
        <Link href="/catalog" aria-label="KINGS catalog">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.png" alt="KINGS" style={logoStyle} />
        </Link>
      </nav>

      {/* Main Content */}
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 24px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {loading && (
          <div style={{ textAlign: "center", padding: 64, color: "#6b7280" }}>
            Loading product…
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "center",
              padding: 32,
              color: "#b91c1c",
            }}
          >
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {!loading && !error && product && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
            className="catalog-detail-grid"
          >
            {/* Left Column — Image Carousel */}
            <div style={{ flex: "1 1 420px", minWidth: 0 }}>
              <div
                style={{
                  position: "relative",
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 16,
                  overflow: "hidden",
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AnimatePresence mode="wait">
                  {images.length > 0 ? (
                    <motion.img
                      key={currentImageIndex}
                      src={images[currentImageIndex]}
                      alt={`${product.name} - image ${currentImageIndex + 1}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={handleDragEnd}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        cursor: hasMultipleImages ? "grab" : "default",
                      }}
                    />
                  ) : (
                    <div style={{ color: "#9ca3af" }}>
                      <Package size={64} />
                    </div>
                  )}
                </AnimatePresence>

                {hasMultipleImages && (
                  <>
                    <button
                      onClick={prevImage}
                      aria-label="Previous image"
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(255,255,255,0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      aria-label="Next image"
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(255,255,255,0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Dots indicator */}
              {hasMultipleImages && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      aria-label={`Go to image ${i + 1}`}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        background: i === currentImageIndex ? GOLD : "#d1d5db",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Column — Details */}
            <div style={{ flex: "1 1 420px", minWidth: 0 }}>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  margin: "0 0 8px",
                  color: "#111827",
                }}
              >
                {product.name}
              </h1>
              <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: 15 }}>
                {product.brand}
                {product.model ? ` · ${product.model}` : ""}
              </p>

              {product.description && (
                <p
                  style={{
                    margin: "0 0 20px",
                    color: "#374151",
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  {product.description}
                </p>
              )}

              {/* Color variants */}
              {(product as any).colorVariants?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Available Colors
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(product as any).colorVariants.map((cv: { color: string; quantity: number }) => (
                      <span
                        key={cv.color}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 500,
                          background: cv.quantity > 0 ? "#f3f4f6" : "#fee2e2",
                          color: cv.quantity > 0 ? "#111827" : "#9ca3af",
                          border: "1px solid #e5e7eb",
                          textTransform: "capitalize",
                        }}
                      >
                        {cv.color}
                        {cv.quantity <= 0 && " (out of stock)"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Size variants */}
              {(product as any).sizeVariants?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Available Sizes
                    {product.hand ? ` — ${product.hand} Hand` : ""}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(product as any).sizeVariants.map((sv: { size: string; quantity: number }) => (
                      <span
                        key={sv.size}
                        style={{
                          padding: "4px 14px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          background: sv.quantity > 0 ? "#fff" : "#f9fafb",
                          color: sv.quantity > 0 ? "#111827" : "#9ca3af",
                          border: `1px solid ${sv.quantity > 0 ? "#d1d5db" : "#e5e7eb"}`,
                        }}
                      >
                        {sv.size}
                        {sv.quantity <= 0 && <span style={{ fontSize: 11, fontWeight: 400 }}> ✗</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: GOLD,
                  marginBottom: 16,
                }}
              >
                {product.price != null ? `${product.price} EGP` : "Price on request"}
              </div>

              {(() => {
                const badge = stockBadge(product.quantity);
                return (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      background: badge.bg,
                      color: badge.color,
                      marginBottom: 24,
                    }}
                  >
                    {badge.label}
                  </span>
                );
              })()}

              <div>
                {!inquirySubmitted ? (
                  <button
                    onClick={() => setShowInquiryForm((v) => !v)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 24px",
                      borderRadius: 10,
                      border: "none",
                      background: GOLD,
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Send size={16} /> Inquire / Request Quote
                  </button>
                ) : (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 10,
                      background: "#dcfce7",
                      color: "#15803d",
                      fontWeight: 500,
                    }}
                  >
                    Your inquiry has been sent! We&apos;ll contact you shortly.
                  </div>
                )}
              </div>

              {/* Inquiry Form */}
              <AnimatePresence>
                {showInquiryForm && !inquirySubmitted && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    onSubmit={handleInquirySubmit}
                    style={{
                      marginTop: 24,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div>
                      <label htmlFor="inq-name" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        Name *
                      </label>
                      <input
                        id="inq-name"
                        name="name"
                        required
                        value={inquiryData.name}
                        onChange={handleInquiryChange}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="inq-email" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        Email *
                      </label>
                      <input
                        id="inq-email"
                        name="email"
                        type="email"
                        required
                        value={inquiryData.email}
                        onChange={handleInquiryChange}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="inq-phone" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        Phone (optional)
                      </label>
                      <input
                        id="inq-phone"
                        name="phone"
                        value={inquiryData.phone}
                        onChange={handleInquiryChange}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="inq-message" style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>
                        Message *
                      </label>
                      <textarea
                        id="inq-message"
                        name="message"
                        required
                        rows={4}
                        value={inquiryData.message}
                        onChange={handleInquiryChange}
                        style={{ ...inputStyle, resize: "vertical" }}
                      />
                    </div>
                    {inquiryError && (
                      <div style={{ color: "#b91c1c", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={14} /> {inquiryError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submittingInquiry}
                      style={{
                        padding: "12px 24px",
                        borderRadius: 10,
                        border: "none",
                        background: GOLD,
                        color: "#fff",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: submittingInquiry ? "wait" : "pointer",
                        opacity: submittingInquiry ? 0.7 : 1,
                      }}
                    >
                      {submittingInquiry ? "Sending…" : "Send Inquiry"}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @media (min-width: 768px) {
          .catalog-detail-grid {
            flex-direction: row !important;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
