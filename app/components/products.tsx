"use client";

import React from "react";
import { Edit, X, Package, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { Product } from "../lib/api/product";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface ProductRowProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  isAdmin?: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onEdit,
  onDelete,
  isAdmin,
}) => {
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
    >
      <div className="product-image-container">
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

        <div className="floating-actions">
          {isAdmin && onEdit && (
            <motion.button
              className="floating-btn edit"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(product)}
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
              onClick={handleDelete}
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
        </div>

        <div className="product-numbers">
          <div className="price-tag">
            <span className="price-value">
              {product.price ? product.price.toLocaleString() : "---"}
            </span>
            <span className="price-currency">EGP</span>
          </div>
          <div className="stock-tag">
            <Package size={12} />
            <span>{product.quantity} AVAILABLE</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductRow;
