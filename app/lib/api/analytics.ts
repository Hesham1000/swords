// lib/api/analytics.ts
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    uniqueCustomers: number;
    inventoryValue: number;
    averageOrderValue: number;
  };
  trends: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  categories: {
    name: string;
    value: number;
  }[];
  topProducts: {
    name: string;
    revenue: number;
    quantity: number;
  }[];
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
}

/**
 * Fetch analytics data from the API
 */
export async function getAnalytics(): Promise<AnalyticsResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/analytics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch analytics");
    }

    const data: AnalyticsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    throw error;
  }
}
