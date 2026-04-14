// app/lib/api/dashboard.ts
import { AnalyticsData } from "./analytics";
import { Invoice } from "./invoice";
import { Product } from "./product";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export interface DashboardSummaryData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    uniqueCustomers: number;
    inventoryValue: number;
    totalInventoryCount: number;
    averageOrderValue: number;
  };
  recentInvoices: Invoice[];
  lowStockItems: Product[];
  analytics: {
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
  };
}

export interface DashboardSummaryResponse {
  success: boolean;
  data: DashboardSummaryData;
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  try {
    const response = await fetch(`${apiUrl}/api/dashboard/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch dashboard summary");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    throw error;
  }
}
