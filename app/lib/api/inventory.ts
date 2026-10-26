// lib/api/inventory.ts

export interface InventoryLog {
  _id?: string;
  id?: string;
  productId: string;
  productName: string;
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

/**
 * Fetch inventory logs from the API
 */
export async function getInventoryLogs(page: number = 1, limit: number = 10, productId?: string, search?: string, type?: string, dateRange?: string): Promise<InventoryLogsResponse> {
  try {
    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", limit.toString());
    if (productId) {
      params.append("productId", productId);
    }
    if (search && search !== "all") {
      params.append("search", search);
    }
    if (type && type !== "all") {
      params.append("type", type);
    }
    if (dateRange && dateRange !== "all") {
      params.append("dateRange", dateRange);
    }

    const response = await fetch(`/api/inventory/logs?${params.toString()}`, {
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
