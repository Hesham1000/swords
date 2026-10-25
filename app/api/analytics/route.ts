import { NextRequest, NextResponse } from "next/server";
import { db, invoices, products } from "../../lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Fetch invoices from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const periodInvoices = await db
      .select()
      .from(invoices)
      .where(sql`${invoices.createdAt} >= ${ninetyDaysAgo.toISOString()}`)
      .orderBy(sql`${invoices.createdAt} ASC`);

    // Fetch all products
    const allProducts = await db.select().from(products);

    // All-time totals
    const allInvoices = await db.select().from(invoices);
    let totalRevenue = 0;
    const allCustomers = new Set<string>();
    for (const inv of allInvoices) {
      totalRevenue += Number(inv.totalAmount || 0);
      if (inv.customer) allCustomers.add(inv.customer);
    }

    let inventoryValue = 0;
    let totalInventoryCount = 0;
    for (const prod of allProducts) {
      inventoryValue += Number(prod.price || 0) * (prod.quantity || 0);
      totalInventoryCount += prod.quantity || 0;
    }

    // Revenue trend (daily over the 90-day period)
    const trendMap = new Map<string, number>();
    for (const inv of periodInvoices) {
      const day = inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : "unknown";
      trendMap.set(day, (trendMap.get(day) || 0) + Number(inv.totalAmount || 0));
    }
    const revenueTrend = Array.from(trendMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    }));

    // Category distribution
    const productCategoryMap = new Map<string, string[]>();
    for (const prod of allProducts) {
      productCategoryMap.set(prod.id, prod.category || []);
    }
    const categoryCount = new Map<string, number>();
    for (const inv of periodInvoices) {
      const items = (Array.isArray(inv.items) ? inv.items : []) as { id: string; quantity?: number; price?: number; name?: string }[];
      for (const item of items) {
        const cats = productCategoryMap.get(item.id) || [];
        for (const cat of cats) {
          categoryCount.set(cat, (categoryCount.get(cat) || 0) + (item.quantity || 0));
        }
      }
    }
    const categoryDistribution = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Top products
    const productCount = new Map<string, { name: string; count: number; revenue: number }>();
    for (const inv of periodInvoices) {
      const items = (Array.isArray(inv.items) ? inv.items : []) as { id: string; quantity?: number; price?: number; name?: string }[];
      for (const item of items) {
        const existing = productCount.get(item.id);
        const itemRevenue = (item.price || 0) * (item.quantity || 0);
        if (existing) {
          existing.count += item.quantity || 0;
          existing.revenue += itemRevenue;
        } else {
          productCount.set(item.id, {
            name: item.name || "Unknown",
            count: item.quantity || 0,
            revenue: itemRevenue,
          });
        }
      }
    }
    const topProducts = Array.from(productCount.entries())
      .map(([id, { name, count, revenue }]) => ({ id, name, count, revenue }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json(
      {
        success: true,
        data: {
          totals: {
            revenue: totalRevenue,
            orders: allInvoices.length,
            uniqueCustomers: allCustomers.size,
            inventoryValue,
            totalInventoryCount,
            avgOrderValue: allInvoices.length > 0 ? totalRevenue / allInvoices.length : 0,
          },
          periodOrders: periodInvoices.length,
          revenueTrend,
          categoryDistribution,
          topProducts,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
