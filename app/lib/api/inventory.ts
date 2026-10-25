// lib/api/inventory.ts
const apiUrl = ""

export interface InventoryLog {
  _id?: string;
  id?: string;
  productId: string;
  productName: string;
  action?: string;
  quantityChange?: number;
  changeAmount: number;
  newQuantity: number;
  reason: string;
  oldPrice?: number | null;
  newPrice?: number | null;
  referenceId?: string;
  note?: string;
  timestamp: string;
}

export interface InventoryLogsResponse {
  success: boolean;
  data: InventoryLog[];
  pagination?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface GetInventoryLogsOptions {
  search?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Fetch inventory logs from the API
 */
export async function getInventoryLogs(
  page: number = 1,
  limit: number = 10,
  productId?: string,
  options?: GetInventoryLogsOptions
): Promise<InventoryLogsResponse> {
  try {
    const url = new URL(`${apiUrl}/api/inventory/logs`, window.location.origin);
    url.searchParams.append("page", page.toString());
    url.searchParams.append("limit", limit.toString());
    if (productId) {
      url.searchParams.append("productId", productId);
    }
    if (options?.search) {
      url.searchParams.append("search", options.search);
    }
    if (options?.from) {
      url.searchParams.append("from", options.from);
    }
    if (options?.to) {
      url.searchParams.append("to", options.to);
    }
    if (options?.sortBy) {
      url.searchParams.append("sortBy", options.sortBy);
    }
    if (options?.sortOrder) {
      url.searchParams.append("sortOrder", options.sortOrder);
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
      throw new Error(errorData.error || "Failed to fetch inventory logs");
    }

    const data: InventoryLogsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    throw error;
  }
}
