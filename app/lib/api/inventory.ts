// lib/api/inventory.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

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
}

/**
 * Fetch inventory logs from the API
 */
export async function getInventoryLogs(productId?: string, limit: number = 50): Promise<InventoryLogsResponse> {
  try {
    const url = new URL(`${apiUrl}/api/inventory/logs`);
    url.searchParams.append("limit", limit.toString());
    if (productId) {
      url.searchParams.append("productId", productId);
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
