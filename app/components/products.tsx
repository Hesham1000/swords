"use client";

import React from "react";
import { Edit, X, Package, Crown, ChevronLeft, ChevronRight, AlertCircle, Minus, Plus } from "lucide-react";

const COLOR_MAP: Record<string, string> = {
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

function colorToHex(name: string): string {
  return COLOR_MAP[name.toLowerCase()] ?? COLOR_MAP[name.toLowerCase().replace(/\s+/g, "")] ?? "#9CA3AF";
}
import { Product } from "../lib/api/product";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductRowProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  isAdmin?: boolean;
  onStockChange?: (id: string, qty: number) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onEdit,
  onDelete,
  isAdmin,
  onStockChange,
  isSelected,
  onSelect,
}) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.images || [];
  const hasMultipleImages = images.length > 1;

  const handleDelete = () => {
    onDelete?.(product.id);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDragEnd = (_: any, info: any) => {
    if (!hasMultipleImages) return;
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold) {
      nextImage({ stopPropagation: () => {} } as any);
    } else if (info.offset.x > swipeThreshold) {
      prevImage({ stopPropagation: () => {} } as any);
    }
  };

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => router.push("/products/" + product.id)}
      style={{ cursor: "pointer" }}
    >
      <div className="product-image-container">
        {onSelect && (
          <div
            className={`product-checkbox-wrap ${isSelected ? "checked" : ""}`}
            onClick={(e) => { e.stopPropagation(); onSelect(product.id); }}
          >
            <div className="product-checkbox">
              {isSelected && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {images.length > 0 ? (
            <motion.img
              key={currentImageIndex}
              src={images[currentImageIndex]}
              alt={`${product.name} - ${currentImageIndex + 1}`}
              className="product-image"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
            />
          ) : (
            <div className="no-image">
              <Package size={40} />
            </div>
          )}
        </AnimatePresence>

        {hasMultipleImages && (
          <>
            <button className="slider-nav-btn prev" onClick={prevImage}>
              <ChevronLeft size={20} />
            </button>
            <button className="slider-nav-btn next" onClick={nextImage}>
              <ChevronRight size={20} />
            </button>
            <div className="slider-dots">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={`slider-dot ${index === currentImageIndex ? "active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                />
              ))}
            </div>
          </>
        )}
        <div className="category-badge">
          {Array.isArray(product.category) ? product.category.join(" / ") : product.category}
        </div>
        
        {product.quantity < 3 && (
          <div className={`stock-alert-badge ${product.quantity === 0 ? 'out' : 'low'}`}>
            <AlertCircle size={10} />
            {product.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
          </div>
        )}

        <div className="floating-actions">
          {isAdmin && onEdit && (
            <motion.button
              className="floating-btn edit"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onEdit(product); }}
              title="Edit product"
            >
              <Edit size={14} />
            </motion.button>
          )}
          {isAdmin && onDelete && (
            <motion.button
              className="floating-btn delete"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
              title="Delete product"
            >
              <X size={16} />
            </motion.button>
          )}
        </div>
      </div>

      <div className="product-content">
        {product.productType === 'lame' && product.isKings && (
          <div className="kings-crown-container">
            <Crown size={16} className="kings-crown-icon" />
          </div>
        )}
        <div className="product-info">
          <h3 className="product-title">{product.name}</h3>
          <div className="product-subtitle">
            <span className="brand">{product.brand?.toUpperCase()}</span>
            {product.model && (product.productType !== 'lame' || !product.isKings || product.model.toLowerCase() !== 'kings') && (
              <>
                <span className="separator">/</span>
                <span className="model">
                  {product.model.toUpperCase()}
                  {product.subCategory && (
                    <span className="sub-category">-{product.subCategory.toUpperCase()}</span>
                  )}
                </span>
              </>
            )}
            {product.productType === 'lame' && product.isKings && product.model?.toLowerCase() === 'kings' && product.subCategory && (
               <span className="model">
                  <span className="separator">/</span>
                  <span className="sub-category">-{product.subCategory.toUpperCase()}</span>
               </span>
            )}
          </div>
          {product.description && (
            <p className="product-description">{product.description}</p>
          )}
          <div className="product-meta">
            {product.material && <span className="meta-badge">{product.material}</span>}
            {(product.productType === 'lame' || product.productType === 'guard') && product.isMini && <span className="meta-badge mini">MINI</span>}
            {product.subCategory && (
              <span className="meta-badge sub-category-badge">
                {product.subCategory.toUpperCase()}
              </span>
            )}
            {product.productType === 'lame' && product.lameColor && (
              <span className={`meta-badge lame-color-badge ${product.lameColor}`}>
                {product.lameColor.toUpperCase()}
              </span>
            )}
            {product.hand && (
              <span className="meta-badge hand-badge">
                {product.hand.toUpperCase()}
              </span>
            )}
          </div>
          {(product as any).colorVariants?.length > 0 && (
            <div className="color-circles">
              {(product as any).colorVariants.map((cv: { color: string; quantity: number }) => (
                <span
                  key={cv.color}
                  className={`color-circle${cv.quantity <= 0 ? " out" : ""}`}
                  style={{ background: colorToHex(cv.color), cursor: "pointer" }}
                  title={`${cv.color}${cv.quantity <= 0 ? " (out of stock)" : ""}`}
                  onClick={(e) => { e.stopPropagation(); router.push(`/products/${product.id}?color=${encodeURIComponent(cv.color)}`); }}
                />
              ))}
            </div>
          )}
          {(product as any).sizeVariants?.length > 0 && (
            <div className="variant-pills">
              {(product as any).sizeVariants.map((sv: { size: string; quantity: number }) => (
                <span key={sv.size} className={`variant-pill size-pill${sv.quantity <= 0 ? ' out' : ''}`}>
                  {sv.size}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="product-numbers">
          <div className="price-tag">
            <span className="price-value">
              {product.price ? product.price.toLocaleString() : "---"}
            </span>
            <span className="price-currency">EGP</span>
          </div>
          <div className={`stock-tag ${product.quantity < 3 ? (product.quantity === 0 ? 'critical' : 'warning') : ''}`}>
            {product.quantity < 3 ? <AlertCircle size={12} /> : <Package size={12} />}
            <span>{product.quantity} AVAILABLE</span>
          </div>
          {onStockChange && (
            <div className="stock-controls">
              <button
                className="stock-btn stock-btn-minus"
                onClick={(e) => { e.stopPropagation(); onStockChange(product.id, product.quantity - 1); }}
                disabled={product.quantity === 0}
                title="Decrease stock"
              >
                <Minus size={13} />
              </button>
              <button
                className="stock-btn stock-btn-plus"
                onClick={(e) => { e.stopPropagation(); onStockChange(product.id, product.quantity + 1); }}
                title="Increase stock"
              >
                <Plus size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductRow;
