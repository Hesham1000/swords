"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Upload, Plus, X, Package, Shield, Settings, DollarSign, Image as ImageIcon } from "lucide-react";
import { createProduct, updateProduct, Product } from "../lib/api/product";

type Brand = "pbt" | "dynamo" | "stm" | "uhlmann" | "allstar" | "folo" | "chinese";

const LAME_BRANDS: { id: Brand; label: string }[] = [
  { id: "pbt", label: "PBT" },
  { id: "dynamo", label: "Dynamo" },
  { id: "stm", label: "STM" },
  { id: "uhlmann", label: "Uhlmann" },
  { id: "allstar", label: "Allstar" },
  { id: "folo", label: "Folo" },
  { id: "chinese", label: "Chinese" },
];

const LAME_MODELS: Record<string, string[]> = {
  pbt: ["FIE", "Standard"],
  uhlmann: ["FIE", "Standard"],
  dynamo: ["kings", "pbt"],
  stm: ["kings", "Standard"],
  folo: [
    "fie",
    "hard",
    "medium",
    "arrow",
    "arrow fie",
    "hard with punta",
    "medium with punta",
  ],
  chinese: [],
};

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: ("Foil" | "Sabre" | "Epée")[];
  productType: "lame" | "wire" | "pbt" | "weapon" | "grip" | "guard" | "guard_padding" | "french_pommel" | "nut" | "point" | "screws" | "point_contact_springs" | "socket" | "insulating_tube" | "body_wire" | "cable" | "pin" | "glove";
  brand: Brand | "";
  model: string;
  subCategory: string;
  hand: "Right" | "Left" | "";
  isKings: boolean;
  isMini: boolean;
  lameColor: "silver" | "blue" | "rainbow";
  material?: "Maraging" | "Metal" | "Other";
  gloveSize: string;
  quantity: string;
  images: File[];
}

interface ProductFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Product;
  isEdit?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({
  onClose,
  onSuccess,
  initialData,
  isEdit = false
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price?.toString() || "",
    category: initialData?.category || ["Epée"],
    productType: initialData?.productType || "lame",
    brand: (initialData?.brand as Brand) || "",
    model: initialData?.model || "",
    subCategory: initialData?.subCategory || "",
    hand: (initialData?.hand as any) || "",
    isKings: initialData?.isKings ?? true,
    isMini: initialData?.isMini || false,
    lameColor: initialData?.lameColor || "silver",
    material: initialData?.material || "Metal",
    gloveSize: (initialData as any)?.gloveSize || "",
    quantity: initialData?.quantity?.toString() || "1",
    images: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || []);

  useEffect(() => {
    if (isEdit && initialData?.images) {
      setExistingImages(initialData.images);
    }
  }, [isEdit, initialData]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === "category") {
      setFormData((prev) => {
        const currentCategories = [...prev.category];
        if (checked) {
          if (!currentCategories.includes(value as any)) {
            currentCategories.push(value as any);
          }
        } else {
          if (currentCategories.length > 1) {
            const index = currentCategories.indexOf(value as any);
            if (index > -1) currentCategories.splice(index, 1);
          }
        }
        return { ...prev, category: currentCategories };
      });
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBrandChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value as Brand;
    setFormData((prev) => ({
      ...prev,
      brand,
      model: "",
    }));
  };

  const handleProductTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const productType = e.target.value as any;
    const isSimplifiedType = ["wire", "grip", "guard", "guard_padding", "french_pommel", "nut", "point", "screws", "point_contact_springs", "socket", "insulating_tube", "body_wire", "cable", "pin"].includes(productType);
    
    setFormData((prev) => ({
      ...prev,
      productType,
      brand: isSimplifiedType ? "pbt" : "",
      category: productType === "glove" ? ["Epée"] : (isSimplifiedType ? ["Epée"] : prev.category),
      model: "",
      subCategory: "",
      hand: "",
      gloveSize: "",
    }));
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    let isKings = formData.isKings;
    if (formData.productType === "lame") {
      if (
        model === "FIE" || 
        (formData.brand === "dynamo" && model === "pbt") || 
        formData.brand === "chinese" || 
        formData.brand === "uhlmann" ||
        (formData.brand === "stm" && model === "Standard")
      ) {
        isKings = false;
      } else {
        isKings = true;
      }
    }
    setFormData((prev) => ({ ...prev, model, isKings }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...files].slice(0, 5 - existingImages.length),
      }));
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 5 - existingImages.length));
    }
  };

  const removeImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setExistingImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setFormData((prev) => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index),
      }));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("price", formData.price);
      formData.category.forEach(cat => formDataToSend.append("category", cat));
      formDataToSend.append("productType", formData.productType);
      formDataToSend.append("brand", formData.brand);
      formDataToSend.append("model", formData.model || "");

      if (formData.productType === "lame") {
        formDataToSend.append("isKings", String(formData.isKings));
        formDataToSend.append("isMini", String(formData.isMini));
        formDataToSend.append("lameColor", formData.lameColor);
        if (formData.material) formDataToSend.append("material", formData.material);
        if ((formData.brand === 'pbt' || formData.brand === 'uhlmann') && formData.model === 'FIE' && !formData.category.includes('Sabre')) {
          formDataToSend.append("subCategory", formData.subCategory);
        }
      }

      if (formData.productType === "grip" || formData.productType === "guard" || formData.productType === "guard_padding") {
        formDataToSend.append("subCategory", formData.subCategory);
        if (formData.hand) formDataToSend.append("hand", formData.hand);
        if (formData.material) formDataToSend.append("material", formData.material);
        if (formData.productType === "guard") formDataToSend.append("isMini", String(formData.isMini));
      }

      if (formData.productType === "glove") {
        if (formData.gloveSize) formDataToSend.append("gloveSize", formData.gloveSize);
        if (formData.hand) formDataToSend.append("hand", formData.hand);
      }

      formDataToSend.append("quantity", formData.quantity);
      existingImages.forEach((img) => formDataToSend.append("images", img));
      formData.images.forEach((image) => formDataToSend.append("images", image));

      if (isEdit && initialData?.id) {
        await updateProduct(initialData.id, formDataToSend);
      } else {
        await createProduct(formDataToSend);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content-wrapper">
        <button className="modal-close-btn" onClick={onClose} type="button">
          <X size={18} />
        </button>
        
        <div className="product-form-container">
          <form onSubmit={handleSubmit} className="product-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-section">
              <div className="section-header">
                <Shield size={16} />
                <h3>IDENTITY & CATEGORY</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Product Type *</label>
                  <select name="productType" value={formData.productType} onChange={handleProductTypeChange} required disabled={loading}>
                    <option value="lame">Lamé</option>
                    <option value="wire">Wire</option>
                    <option value="grip">Grip</option>
                    <option value="guard">Guard</option>
                    <option value="guard_padding">Guard Padding</option>
                    <option value="french_pommel">French Pommel</option>
                    <option value="nut">Nut</option>
                    <option value="point">Point</option>
                    <option value="screws">Screws</option>
                    <option value="point_contact_springs">Point Contact Springs</option>
                    <option value="socket">Socket</option>
                    <option value="insulating_tube">Insulating Tube</option>
                    <option value="body_wire">Body Wire</option>
                    <option value="cable">Cable</option>
                    <option value="pin">Pin</option>
                    <option value="glove">Glove</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Model Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., FIE Competition Sabre Lamé"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Disciplines (Select all that apply) *</label>
                  <div className="checkbox-group disciplines-grid">
                    {["wire", "grip", "guard_padding"].includes(formData.productType) ? (
                      <>
                        <label className="checkbox-logic">
                          <input type="checkbox" name="category" value="Epée" checked={formData.category.includes("Epée")} onChange={handleChange} disabled={loading} />
                          <div className="checkbox-visual"></div>
                          <span>Epée</span>
                        </label>
                        <label className="checkbox-logic">
                          <input type="checkbox" name="category" value="Foil" checked={formData.category.includes("Foil")} onChange={handleChange} disabled={loading} />
                          <div className="checkbox-visual"></div>
                          <span>Foil</span>
                        </label>
                      </>
                    ) : (
                      <>
                        <label className="checkbox-logic">
                          <input type="checkbox" name="category" value="Epée" checked={formData.category.includes("Epée")} onChange={handleChange} disabled={loading} />
                          <div className="checkbox-visual"></div>
                          <span>Epée</span>
                        </label>
                        <label className="checkbox-logic">
                          <input type="checkbox" name="category" value="Foil" checked={formData.category.includes("Foil")} onChange={handleChange} disabled={loading} />
                          <div className="checkbox-visual"></div>
                          <span>Foil</span>
                        </label>
                        <label className="checkbox-logic">
                          <input type="checkbox" name="category" value="Sabre" checked={formData.category.includes("Sabre")} onChange={handleChange} disabled={loading} />
                          <div className="checkbox-visual"></div>
                          <span>Sabre</span>
                        </label>
                      </>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Manufacturer *</label>
                  <select name="brand" value={formData.brand} onChange={handleBrandChange} required disabled={loading || ["wire", "grip", "guard_padding", "french_pommel", "nut", "point", "screws", "point_contact_springs", "socket", "insulating_tube", "body_wire", "cable", "pin", "glove"].includes(formData.productType)}>
                    <option value="">Select Brand</option>
                    {formData.productType === "guard" ? (
                      <>
                        <option value="pbt">PBT</option>
                        <option value="uhlmann">Uhlmann</option>
                        <option value="allstar">Allstar</option>
                      </>
                    ) : (
                      LAME_BRANDS.map((brand) => (
                        <option key={brand.id} value={brand.id}>{brand.label}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <Settings size={16} />
                <h3>TECHNICAL SPECIFICATIONS</h3>
              </div>
              <div className="form-grid">
                {formData.productType === "lame" && (
                  <>
                    {formData.brand && LAME_MODELS[formData.brand]?.length > 0 && (
                      <div className="form-group">
                        <label>Model Series *</label>
                        <select name="model" value={formData.model} onChange={handleModelChange} required disabled={loading}>
                          <option value="">Select Series</option>
                          {LAME_MODELS[formData.brand].map((m) => (
                            <option key={m} value={m}>{m === "FIE" ? "FIE" : m}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {(formData.productType === "lame" && (formData.brand === "pbt" || formData.brand === "uhlmann") && formData.model === "FIE" && !formData.category.includes("Sabre")) && (
                      <div className="form-group">
                        <label>Sub Category *</label>
                        <select name="subCategory" value={formData.subCategory} onChange={handleChange} required disabled={loading}>
                          <option value="">Select M or D</option>
                          <option value="m">M</option>
                          <option value="d">D</option>
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label>Primary Material</label>
                      <select name="material" value={formData.material || ""} onChange={handleChange} disabled={loading}>
                        <option value="Metal">Standard Metal</option>
                        <option value="Maraging">Maraging Steel</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Finish / Color</label>
                      <select name="lameColor" value={formData.lameColor} onChange={handleChange} disabled={loading}>
                        <option value="silver">Classic Silver</option>
                        <option value="blue">Blue</option>
                        <option value="rainbow">Rainbow</option>
                      </select>
                    </div>
                    <div className="form-group checkbox-container">
                      <label className="checkbox-logic">
                        <input type="checkbox" name="isMini" checked={formData.isMini} onChange={handleChange} disabled={loading} />
                        <div className="checkbox-visual"></div>
                        <span>Mini</span>
                      </label>
                    </div>
                  </>
                )}

                {formData.productType === "guard" && formData.brand === "pbt" && (
                  <div className="form-group">
                    <label>Guard Material *</label>
                    <select name="material" value={formData.material || ""} onChange={handleChange} required disabled={loading}>
                      <option value="">Select Material</option>
                      <option value="Aluminum">Aluminum</option>
                      <option value="Aluminum with Titanium">Aluminum with Titanium</option>
                    </select>
                  </div>
                )}

                {formData.productType === "guard_padding" && (
                  <div className="form-group">
                    <label>Padding Material *</label>
                    <select name="material" value={formData.material || ""} onChange={handleChange} required disabled={loading}>
                      <option value="">Select Material</option>
                      <option value="Felt">Felt</option>
                      <option value="PVC">PVC</option>
                    </select>
                  </div>
                )}

                {formData.productType === "guard" && (
                  <div className="form-group checkbox-container">
                    <label className="checkbox-logic">
                      <input type="checkbox" name="isMini" checked={formData.isMini} onChange={handleChange} disabled={loading} />
                      <div className="checkbox-visual"></div>
                      <span>Mini</span>
                    </label>
                  </div>
                )}

                {formData.productType === "grip" && (
                  <>
                    <div className="form-group">
                      <label>Grip Type *</label>
                      <select name="subCategory" value={formData.subCategory} onChange={handleChange} required disabled={loading}>
                        <option value="">Select Type</option>
                        <option value="french">French</option>
                        <option value="pistol">Pistol</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Handedness *</label>
                      <select name="hand" value={formData.hand} onChange={handleChange} required disabled={loading}>
                        <option value="">Select Hand</option>
                        <option value="Right">Right</option>
                        <option value="Left">Left</option>
                      </select>
                    </div>
                  </>
                )}

                {formData.productType === "socket" && (
                  <div className="form-group">
                    <label>Security Clip *</label>
                    <select name="subCategory" value={formData.subCategory || "standard"} onChange={handleChange} required disabled={loading}>
                      <option value="standard">Standard (No Clip)</option>
                      <option value="with_security_clip">With Security Clip</option>
                    </select>
                  </div>
                )}

                {formData.productType === "glove" && (
                  <>
                    <div className="form-group">
                      <label>Glove Size *</label>
                      <select name="gloveSize" value={formData.gloveSize} onChange={handleChange} required disabled={loading}>
                        <option value="">Select Size</option>
                        <option value="7">7</option>
                        <option value="7.1/2">7½</option>
                        <option value="8.1/2">8½</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Handedness</label>
                      <select name="hand" value={formData.hand} onChange={handleChange} disabled={loading}>
                        <option value="">Select Hand</option>
                        <option value="Right">Right</option>
                        <option value="Left">Left</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <DollarSign size={16} />
                <h3>INVENTORY & PRICING</h3>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Available Stock *</label>
                  <div className="input-with-icon">
                    <Package size={14} />
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" required disabled={loading} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Unit Price (EGP)</label>
                  <div className="input-with-icon">
                    <span className="currency-label">EGP</span>
                    <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="0.00" min="0" step="0.01" disabled={loading} />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <ImageIcon size={16} />
                <h3>MEDIA & DESCRIPTION</h3>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Detailed Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe technical features, sizing advice..." rows={3} disabled={loading} />
                </div>
                <div className="form-group full-width">
                  <label>Visual Identity (Max 5)</label>
                  <div className="media-upload-zone">
                    <label className={`upload-trigger ${formData.images.length + existingImages.length >= 5 ? 'disabled' : ''}`}>
                      <Upload size={24} />
                      <div className="upload-text"><strong>Add Photos</strong><span>JPG, PNG or WEBP</span></div>
                      <input type="file" multiple accept="image/*" onChange={handleImageChange} disabled={loading || (formData.images.length + existingImages.length >= 5)} hidden />
                    </label>
                    <div className="media-previews">
                      {existingImages.map((src, index) => (
                        <div key={`existing-${index}`} className="media-card">
                          <img src={src} alt="Server" />
                          <button type="button" className="remove-media" onClick={() => removeImage(index, true)} disabled={loading}><X size={12} /></button>
                          <div className="media-tag">OFFICIAL</div>
                        </div>
                      ))}
                      {imagePreviews.map((preview, index) => (
                        <div key={`new-${index}`} className="media-card new">
                          <img src={preview} alt="New" />
                          <button type="button" className="remove-media" onClick={() => removeImage(index, false)} disabled={loading}><X size={12} /></button>
                          <div className="media-tag">NEW</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>CANCEL</button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (isEdit ? "UPDATING..." : "CREATING...") : (isEdit ? "SAVE CHANGES" : "ADD TO INVENTORY")}
              </button>
            </div>
          </form>
        </div>
        <style jsx>{`
          .product-form-container { padding: 2.5rem; max-height: 85dvh; overflow-y: auto; }
          .product-form { display: flex; flex-direction: column; gap: 2.5rem; }
          .error-message { background: rgba(225, 29, 72, 0.1); border: 1px solid var(--accent-red); color: var(--accent-red); padding: 1rem; border-radius: 12px; font-size: 13px; text-align: center; }
          .form-section { display: flex; flex-direction: column; gap: 1.25rem; }
          .section-header { display: flex; align-items: center; gap: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-tech); color: var(--accent-blue); }
          .section-header h3 { font-family: var(--font-display); font-size: 10px; font-weight: 900; letter-spacing: 1.5px; margin: 0; text-transform: uppercase; }
          .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
          .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
          .form-group.full-width { grid-column: span 2; }
          .form-group label { font-family: var(--font-display); font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; }
          .form-group input, .form-group select, .form-group textarea { padding: 0.875rem 1rem; background: var(--bg-deep); border: 1px solid var(--border-tech); border-radius: 10px; font-family: var(--font-sans); font-size: 14px; color: var(--text-primary); }
          .input-with-icon { position: relative; display: flex; align-items: center; }
          .input-with-icon :global(svg) { position: absolute; left: 1rem; color: var(--text-secondary); }
          .input-with-icon input { padding-left: 2.5rem !important; width: 100%; }
          .currency-label { position: absolute; left: 1rem; font-size: 10px; font-weight: 900; color: var(--text-secondary); }
          .checkbox-container { padding-top: 0.5rem; }
          .checkbox-logic { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s ease; padding: 4px 8px; border-radius: 6px; }
          .checkbox-logic:hover { background: rgba(255, 255, 255, 0.05); }
          .checkbox-logic input { display: none; }
          .checkbox-visual { width: 20px; height: 20px; background: var(--bg-deep); border: 1px solid var(--border-tech); border-radius: 6px; position: relative; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
          .checkbox-logic:hover .checkbox-visual { border-color: var(--accent-blue); box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
          .checkbox-logic input:checked + .checkbox-visual { background: var(--accent-blue); border-color: var(--accent-blue); transform: scale(1.05); }
          .checkbox-visual::after { content: ''; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px; border: solid white; border-width: 0 2.5px 2.5px 0; transform: rotate(45deg); opacity: 0; transition: all 0.2s ease; }
          .checkbox-logic input:checked + .checkbox-visual::after { opacity: 1; }
          .checkbox-logic span { font-family: var(--font-display); font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-primary); }
          .disciplines-grid { display: flex; gap: 1.5rem; padding: 0.875rem 1rem; background: var(--bg-deep); border: 1px solid var(--border-tech); border-radius: 10px; }
          .media-upload-zone { display: flex; flex-direction: column; gap: 1rem; }
          .upload-trigger { display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: var(--bg-deep); border: 1px dashed var(--border-tech); border-radius: 12px; cursor: pointer; }
          .media-previews { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; padding: 1rem; background: var(--bg-deep); border-radius: 12px; }
          .media-card { position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-tech); }
          .media-card img { width: 100%; height: 100%; object-fit: cover; }
          .remove-media { position: absolute; top: 4px; right: 4px; width: 20px; height: 20px; background: rgba(225, 29, 72, 0.9); border: none; color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
          .media-tag { position: absolute; bottom: 4px; left: 4px; padding: 2px 4px; background: rgba(0, 0, 0, 0.6); color: white; font-size: 7px; font-weight: 900; border-radius: 2px; }
          .form-actions { display: flex; justify-content: flex-end; gap: 1rem; padding-top: 1.5rem; border-top: 1px solid var(--border-tech); }
          .btn-primary, .btn-secondary { padding: 0.875rem 1.5rem; font-family: var(--font-display); font-size: 12px; font-weight: 900; border-radius: 8px; cursor: pointer; text-transform: uppercase; }
          .btn-primary { background: var(--accent-blue); color: white; border: none; }
          .btn-secondary { background: transparent; border: 1px solid var(--border-tech); color: var(--text-primary); }

          @media (max-width: 768px) {
            .product-form-container { padding: 1.25rem !important; }
            .form-grid { grid-template-columns: 1fr !important; gap: 1rem !important; }
            .form-group.full-width { grid-column: auto !important; }
            .disciplines-grid { flex-direction: column !important; gap: 0.75rem !important; }
            .media-previews { grid-template-columns: repeat(2, 1fr) !important; }
            .form-actions { flex-direction: column-reverse !important; gap: 0.75rem !important; }
            .form-actions button { width: 100% !important; }
            .upload-trigger { padding: 1rem !important; flex-direction: column !important; text-align: center !important; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ProductForm;
