// lib/api/products.ts
// Separate API service file for product operations
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: ("Foil" | "Sabre" | "Epée")[];
  productType: "lame" | "wire" | "pbt" | "weapon" | "grip" | "guard" | "guard_padding" | "french_pommel" | "nut" | "point" | "screws" | "point_contact_springs" | "socket" | "insulating_tube" | "body_wire" | "cable" | "pin";
  brand: string;
  model: string;
  subCategory?: string;
  hand?: "Right" | "Left";
  isKings?: boolean;
  isMini?: boolean;
  lameColor?: "silver" | "blue" | "rainbow";
  material?: "Maraging" | "Metal" | "Other";
  quantity: number;
  images: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductsResponse {
  success: boolean;
  data: Product[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
  summary?: {
    totalQuantity: number;
  };
}

export interface ProductResponse {
  success: boolean;
  data: Product;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
}

/**
 * Fetch all products from the API with optional pagination and filtering
 */
export async function getProducts(
  page: number = 1,
  limit: number = 8,
  summary: boolean = false,
  filters: {
    search?: string;
    category?: string;
    productType?: string;
    brand?: string;
  } = {}
): Promise<ProductsResponse> {
  try {
    const url = new URL(`${apiUrl}/api/products`);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("limit", limit.toString());
    
    if (summary) {
      url.searchParams.append("summary", "true");
    }

    if (filters.search) {
      url.searchParams.append("search", filters.search);
    }
    if (filters.category) {
      url.searchParams.append("category", filters.category);
    }
    if (filters.productType) {
      url.searchParams.append("productType", filters.productType);
    }
    if (filters.brand) {
      url.searchParams.append("brand", filters.brand);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch products");
    }

    const data: ProductsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<ProductResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/products/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch product");
    }

    const data: ProductResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
}

/**
 * Create a new product with FormData (handles images)
 */
export async function createProduct(
  formData: FormData
): Promise<ProductResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/products/create`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create product");
    }

    const data: ProductResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: string,
  formData: FormData
): Promise<ProductResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/products/${id}`, {
      method: "PUT",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update product");
    }

    const data: ProductResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}

/**
 * Delete a product by ID
 */
export async function deleteProduct(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${apiUrl}/api/products/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete product");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

/**
 * Filter products by category
 */
export async function getProductsByCategory(
  category: "Foil" | "Sabre" | "Epée"
): Promise<ProductsResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/products?category=${category}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch products");
    }

    const data: ProductsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
}

/**
 * Search products by query
 */
export async function searchProducts(query: string): Promise<ProductsResponse> {
  try {
    const response = await fetch(
      `${apiUrl}/api/products?search=${encodeURIComponent(query)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to search products");
    }

    const data: ProductsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching products:", error);
    throw error;
  }
}
